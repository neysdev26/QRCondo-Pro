import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity, TextInput,
  ActivityIndicator, SafeAreaView, Alert, Modal
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { decode } from 'base64-arraybuffer';
import { notificationService } from '../../services/notificationService';
import { Encomenda } from '../../types';
import { useAuth, AuthContextData } from '../../contexts/AuthContext';
import SignaturePad from '../../components/SignaturePad';

export default function EncomendasScreen() {
  const router = useRouter();
  const { perfil } = useAuth() as AuthContextData;

  const [encomendas, setEncomendas] = useState<Encomenda[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [busca, setBusca] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string | number>>(new Set());

  const [showBulkModal, setShowBulkModal] = useState(false);
  const [showExcluirModal, setShowExcluirModal] = useState(false);

  const [bulkNomeRecebedor, setBulkNomeRecebedor] = useState('');
  const [bulkPorteiroEntrega, setBulkPorteiroEntrega] = useState('');
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkSignature, setBulkSignature] = useState<string | null>(null);

  const [motivoExclusao, setMotivoExclusao] = useState('');
  const [nomePorteiroConfirmacao, setNomePorteiroConfirmacao] = useState('');
  const [encomendaParaExcluir, setEncomendaParaExcluir] = useState<Encomenda | null>(null);

  const isMorador = perfil?.tipo_usuario === 'morador';

  // 🔹 Busca encomendas pendentes
  const fetchEncomendasPendentes = useCallback(async () => {
    if (!perfil) return;
    setIsLoading(true);
    try {
      let query = supabase
        .from('encomendas')
        .select('*')
        .eq('status', 'pendente')
        .eq('condominio_id', perfil.condominio_id)
        .order('data_chegada', { ascending: false });

      if (isMorador) {
        query = query
          .eq('apartamento', perfil.apartamento)
          .eq('bloco', perfil.bloco);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Normaliza os dados (garantindo 'id' para compatibilidade)
      const dadosNormalizados = (data || []).map((item: any) => ({
        ...item,
        id: item.id || item.encomendas_id || `temp-${Date.now()}-${Math.random()}`,
      }));

      setEncomendas(dadosNormalizados);
    } catch (error) {
      console.error('❌ Erro ao carregar:', error);
      Alert.alert('Erro', 'Não foi possível carregar as encomendas.');
    } finally {
      setIsLoading(false);
    }
  }, [perfil, isMorador]);

  // 🔹 Ao entrar na tela, recarrega e limpa seleção
  useFocusEffect(
    useCallback(() => {
      fetchEncomendasPendentes();
      setSelectedIds(new Set());
    }, [fetchEncomendasPendentes])
  );

  // 🔹 Alterna seleção de um item (com verificação de undefined)
  const toggleSelection = (id: string | number | undefined) => {
    if (id === undefined) return;
    if (isMorador) return;
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  // 🔹 ENTREGA EM MASSA COM ASSINATURA ÚNICA
  const handleBulkSignature = async (signature: string, nomeRecebedor: string, porteiroEntrega: string) => {
    setBulkSignature(signature);
    setBulkNomeRecebedor(nomeRecebedor);
    setBulkPorteiroEntrega(porteiroEntrega);
    await processarEntregaEmMassa(signature, nomeRecebedor, porteiroEntrega);
  };

  const processarEntregaEmMassa = async (signature: string, nomeRec: string, porteiroEnt: string) => {
    if (selectedIds.size === 0) return;
    setBulkLoading(true);
    try {
      // 1. Upload da assinatura única
      const fileName = `assinaturas/bulk_sig_${Date.now()}.png`;
      const base64Data = signature.replace('data:image/png;base64,', '');
      const { error: uploadError } = await supabase.storage
        .from('assinaturas')
        .upload(fileName, decode(base64Data), { contentType: 'image/png', upsert: true });
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from('assinaturas').getPublicUrl(fileName);
      const publicUrl = urlData.publicUrl;
      const dataRetirada = new Date().toISOString();

      // 2. Processa cada encomenda selecionada
      const promises = Array.from(selectedIds).map(async (id) => {
        const { data: enc, error: fetchError } = await supabase
          .from('encomendas')
          .select('*')
          .eq('id', id)
          .single();
        if (fetchError || !enc) throw new Error(`Erro ao buscar encomenda ${id}`);

        const historico = {
          id: enc.encomendas_id,
          qr_code: enc.qr_code,
          destinatario: enc.destinatario,
          bloco: enc.bloco,
          apartamento: enc.apartamento,
          remetente: enc.remetente,
          observacoes: enc.observacoes,
          porteiro_entrada: enc.porteiro_entrada,
          porteiro: enc.porteiro,
          condominio_id: enc.condominio_id,
          data_chegada: enc.data_chegada,
          status: 'retirada',
          nome_recebedor: nomeRec.toUpperCase().trim(),
          porteiro_entrega: porteiroEnt.toUpperCase().trim() || 'Não informado',
          assinatura: publicUrl,
          data_retirada: dataRetirada,
        };

        const { error: histError } = await supabase.from('encomendas_historico').insert([historico]);
        if (histError) throw new Error(`Erro ao inserir histórico: ${histError.message}`);

        const { error: delError } = await supabase.from('encomendas').delete().eq('id', id);
        if (delError) throw new Error(`Erro ao deletar: ${delError.message}`);
      });

      await Promise.all(promises);

      Alert.alert('Sucesso', `${selectedIds.size} encomendas entregues com sucesso.`);
      
      // Limpeza completa após sucesso
      setShowBulkModal(false);
      setBulkSignature(null);
      setBulkNomeRecebedor('');
      setBulkPorteiroEntrega('');
      setSelectedIds(new Set());
      await fetchEncomendasPendentes(); // recarrega a lista
      
    } catch (err: any) {
      Alert.alert('Erro', 'Falha na entrega em massa: ' + err.message);
    } finally {
      setBulkLoading(false);
    }
  };

  // 🔹 EXCLUSÃO DE ENCOMENDA
  const handleConfirmarExclusao = async () => {
    if (!encomendaParaExcluir) return;
    if (isMorador) return;
    if (!nomePorteiroConfirmacao.trim()) {
      Alert.alert('Atenção', 'Por favor, informe o nome do porteiro que está confirmando a exclusão.');
      return;
    }

    setIsLoading(true);
    try {
      const encId = encomendaParaExcluir.encomendas_id;
      const rowId = encomendaParaExcluir.id;

      const { error: auditError } = await supabase.from('encomendas_excluidos').insert({
        encomenda_id: encId,
        encomendas_id: encId?.toString(),
        condominio_id: encomendaParaExcluir.condominio_id,
        destinatario: encomendaParaExcluir.destinatario,
        bloco: encomendaParaExcluir.bloco,
        apartamento: encomendaParaExcluir.apartamento,
        remetente: encomendaParaExcluir.remetente,
        observacoes: encomendaParaExcluir.observacoes,
        qr_code: encomendaParaExcluir.qr_code,
        status: encomendaParaExcluir.status,
        porteiro_entrada: encomendaParaExcluir.porteiro_entrada,
        data_chegada: encomendaParaExcluir.data_chegada?.toString(),
        porteiro_exclusao: perfil?.id,
        nome_porteiro_exclusao: nomePorteiroConfirmacao.trim(),
        motivo_exclusao: motivoExclusao.trim(),
        excluido_em: new Date().toISOString(),
      });
      if (auditError) throw auditError;

      const { error: deleteError } = await supabase
        .from('encomendas')
        .delete()
        .eq('id', rowId);
      if (deleteError) throw deleteError;

      Alert.alert('Sucesso', 'Encomenda excluída do sistema.');
      setShowExcluirModal(false);
      setMotivoExclusao('');
      setNomePorteiroConfirmacao('');
      setEncomendaParaExcluir(null);
      fetchEncomendasPendentes();
    } catch (err: any) {
      Alert.alert('Erro', err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // 🔹 RENDERIZAÇÃO DO ITEM DA LISTA
  const renderItem = ({ item }: { item: Encomenda }) => {
    if (!item || !item.id) return null;
    const isSelected = selectedIds.has(item.id);

    return (
      <View style={[styles.card, styles.cardPendente, isSelected && styles.cardSelected]}>
        <View style={styles.cardHeader}>
          <TouchableOpacity 
            onPress={() => item.id && toggleSelection(item.id)} 
            style={styles.checkboxArea} 
            disabled={isMorador}
          >
            <MaterialIcons 
              name={isSelected ? "check-box" : "check-box-outline-blank"} 
              size={26} 
              color={isMorador ? '#cbd5e1' : (isSelected ? "#1974f4" : "#94a3b8")} 
            />
          </TouchableOpacity>
          <View style={styles.badgePendente}><Text style={styles.badgeText}>PENDENTE</Text></View>
          <Text style={styles.dataEntrada}>{item.data_chegada ? new Date(item.data_chegada).toLocaleDateString('pt-BR') : ''}</Text>
          {!isMorador && (
            <TouchableOpacity onPress={() => { setEncomendaParaExcluir(item); setShowExcluirModal(true); }}>
              <MaterialIcons name="delete-outline" size={24} color="#ef4444" />
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.cardBody}>
          <Text style={styles.destinatario}>{item.destinatario || ''}</Text>
          <View style={styles.infoRow}>
            <MaterialIcons name="business" size={18} color="#64748b" />
            <Text style={styles.infoText}>Bloco {item.bloco || ''} - Apto {item.apartamento || ''}</Text>
          </View>
          {item.qr_code && (
            <View style={styles.infoRow}>
              <MaterialIcons name="qr-code" size={16} color="#64748b" />
              <Text style={styles.infoText}>Cód: {item.qr_code}</Text>
            </View>
          )}
          {item.remetente && (
            <View style={styles.infoRow}>
              <MaterialIcons name="mail" size={16} color="#1e293b" />
              <Text style={styles.infoText}>Rem: {item.remetente}</Text>
            </View>
          )}
          {item.observacoes && (
            <View style={styles.infoRow}>
              <MaterialIcons name="menu" size={16} color="#64748b" />
              <Text style={styles.infoText}>Obs: {item.observacoes}</Text>
            </View>
          )}
        </View>

        <View style={styles.actionsContainer}>
          <TouchableOpacity style={[styles.actionButton, styles.btnAviso]} onPress={() => notificationService.enviarAvisoSMS(item)}>
            <MaterialIcons name="notifications-active" size={20} color="#0b5176" />
            <Text style={styles.btnAvisoText}>Avisar</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionButton, styles.btnEntregar]} onPress={() => router.push({ pathname: '/scanner', params: { id: item.id } })}>
            <MaterialIcons name="assignment-turned-in" size={20} color="#fff" />
            <Text style={styles.btnEntregarText}>{isMorador ? 'Ver' : 'Entregar'}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // 🔹 FILTRO DE BUSCA LOCAL (melhorado)
  const encomendasFiltradas = encomendas.filter((enc) => {
    const termo = busca.toLowerCase().trim();
    if (termo === '') return true;

    const bloco = (enc.bloco || '').toString().toLowerCase();
    const apto = (enc.apartamento || '').toString().toLowerCase();
    const destinatario = (enc.destinatario || '').toLowerCase();
    const qr = (enc.qr_code || '').toLowerCase();

    // Busca por "Bloco/Apto" (ex: "A/101")
    if (termo.includes('/')) {
      const [buscaBloco, buscaApto] = termo.split('/').map(s => s.trim());
      return bloco.includes(buscaBloco) && (!buscaApto || apto.includes(buscaApto));
    }

    // Busca por "Bloco Apto" (ex: "A 101")
    if (termo.includes(' ')) {
      const partes = termo.split(' ').map(s => s.trim()).filter(Boolean);
      if (partes.length === 2) {
        return (bloco.includes(partes[0]) && apto.includes(partes[1])) ||
               (bloco.includes(partes[1]) && apto.includes(partes[0])) ||
               destinatario.includes(termo);
      }
    }

    return destinatario.includes(termo) ||
           apto.includes(termo) ||
           bloco.includes(termo) ||
           qr.includes(termo);
  });

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{isMorador ? 'Minhas Encomendas' : 'Encomendas Pendentes'}</Text>
        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar por nome, apto, bloco ou código..."
            value={busca}
            onChangeText={setBusca}
            clearButtonMode="never"
          />
          {busca.length > 0 && (
            <TouchableOpacity
              onPress={() => setBusca('')}
              style={styles.clearButton}
              activeOpacity={0.6}
            >
              <MaterialIcons name="close" size={20} color="#64748b" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1974f4" />
          <Text style={{ marginTop: 10, color: '#64748b' }}>Carregando encomendas...</Text>
        </View>
      ) : (
        <FlatList
          data={encomendasFiltradas}
          keyExtractor={(item: Encomenda, index: number) => {
            if (item && item.id) {
              return item.id.toString();
            }
            return `fallback-${index}`;
          }}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 16, paddingBottom: 120 }}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <MaterialIcons name="inventory" size={60} color="#cbd5e1" />
              <Text style={styles.emptyText}>Nenhuma encomenda pendente.</Text>
            </View>
          }
        />
      )}

      {selectedIds.size > 0 && !isMorador && (
        <TouchableOpacity style={styles.fab} activeOpacity={0.8} onPress={() => setShowBulkModal(true)}>
          <MaterialIcons name="assignment-turned-in" size={24} color="#ffffff" />
          <Text style={styles.fabText}>ENTREGAR SELECIONADOS ({selectedIds.size})</Text>
        </TouchableOpacity>
      )}

      {/* MODAL DE ASSINATURA PARA ENTREGA EM MASSA */}
      <SignaturePad
        visible={showBulkModal}
        onClose={() => {
          setShowBulkModal(false);
          setBulkSignature(null);
          setBulkNomeRecebedor('');
          setBulkPorteiroEntrega('');
        }}
        onSignature={handleBulkSignature}
        loading={bulkLoading}
      />

      {/* MODAL DE CONFIRMAÇÃO DE EXCLUSÃO */}
      <Modal visible={showExcluirModal} animationType="fade" transparent onRequestClose={() => setShowExcluirModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={[styles.modalTitle, { color: '#ef4444' }]}>Confirmar Exclusão</Text>
            <Text style={{ marginBottom: 15, color: '#334155', fontSize: 14 }}>
              Esta ação removerá a encomenda permanentemente e gerará um relatório de auditoria de segurança.
            </Text>
            
            <Text style={styles.modalLabel}>Nome do Porteiro autorizando *</Text>
            <TextInput style={styles.modalInput} placeholder="Seu nome" value={nomePorteiroConfirmacao} onChangeText={setNomePorteiroConfirmacao} />
            
            <Text style={styles.modalLabel}>Motivo da Exclusão / Justificativa</Text>
            <TextInput style={[styles.modalInput, { height: 60, textAlignVertical: 'top' }]} placeholder="Ex: Cadastrado em apartamento errado / Pacote duplicado" value={motivoExclusao} onChangeText={setMotivoExclusao} multiline numberOfLines={2} />
            
            <View style={styles.modalButtons}>
              <TouchableOpacity style={[styles.modalBtn, styles.btnCancel]} onPress={() => setShowExcluirModal(false)}>
                <Text style={styles.btnCancelText}>Voltar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalBtn, { backgroundColor: '#ef4444' }]} onPress={handleConfirmarExclusao}>
                <Text style={styles.btnConfirmText}>Excluir</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ced5df' },
  header: { padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#e2e8f0' },
  title: { fontSize: 22, fontWeight: 'bold', color: '#1e293b', marginBottom: 12 },

  // 🔹 NOVO: contêiner do campo de busca (com fundo, borda, etc.)
  searchContainer: {
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    justifyContent: 'center', // centraliza verticalmente
    position: 'relative',     // necessário para o posicionamento absoluto do botão
  },
  // 🔹 AJUSTE: o input agora herda o fundo do container e ganha paddingRight
  searchInput: {
    height: 44,
    paddingHorizontal: 16,
    paddingRight: 44,         // espaço para o botão (20px ícone + 12px margem + folga)
    fontSize: 15,
    color: '#1e293b',
    backgroundColor: 'transparent', // fundo transparente para mostrar o do container
  },
  // 🔹 NOVO: botão de limpar dentro do campo
  clearButton: {
    position: 'absolute',
    right: 12,
    top: '50%',
    transform: [{ translateY: -10 }], // metade da altura do ícone (20/2)
    padding: 4,
    zIndex: 1,
  },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 80, gap: 10 },
  emptyText: { color: '#64748b', fontSize: 16 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 16, borderWidth: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 2 },
  cardPendente: { borderColor: '#e2e8f0' },
  cardSelected: { borderColor: '#1974f4', backgroundColor: '#f0f7ff', borderWidth: 2 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  checkboxArea: { marginRight: 8 },
  badgePendente: { backgroundColor: '#fef3c7', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  badgeText: { fontSize: 11, fontWeight: 'bold', color: '#d97706' },
  dataEntrada: { marginLeft: 'auto', marginRight: 10, fontSize: 13, color: '#64748b' },
  cardBody: { gap: 6, marginBottom: 14 },
  destinatario: { fontSize: 18, fontWeight: 'bold', color: '#0f172a' },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  infoText: { fontSize: 14, color: '#475569' },
  actionsContainer: { flexDirection: 'row', gap: 12 },
  actionButton: { flex: 1, height: 40, borderRadius: 8, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, borderWidth: 1 },
  btnAviso: { backgroundColor: '#e0f2fe', borderColor: '#bae6fd' },
  btnAvisoText: { color: '#0369a1', fontWeight: 'bold', fontSize: 14 },
  btnEntregar: { backgroundColor: '#1974f4', borderColor: '#1974f4' },
  btnEntregarText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
  fab: { position: 'absolute', bottom: 24, left: 16, right: 16, backgroundColor: '#1974f4', height: 50, borderRadius: 25, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 3 },
  fabText: { color: '#ffffff', fontWeight: 'bold', fontSize: 15 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: '#fff', borderRadius: 16, padding: 20, elevation: 5 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#1e293b', marginBottom: 15 },
  modalLabel: { fontSize: 13, fontWeight: 'bold', color: '#64748b', marginBottom: 6, marginTop: 10 },
  modalInput: { backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, height: 44, paddingHorizontal: 12, fontSize: 15 },
  modalButtons: { flexDirection: 'row', gap: 12, marginTop: 20 },
  modalBtn: { flex: 1, height: 44, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  btnCancel: { backgroundColor: '#f1f5f9', borderWidth: 1, borderColor: '#cbd5e1' },
  btnCancelText: { color: '#475569', fontWeight: 'bold' },
  btnConfirm: { backgroundColor: '#2e7d32' },
  btnConfirmText: { color: '#fff', fontWeight: 'bold' }
});