import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity, TextInput,
  ActivityIndicator, SafeAreaView, Alert
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { useEncomenda } from '../../contexts/EncomendaContext';
import { notificationService } from '../../services/notificationService';
import { Encomenda } from '../../types';
import { decode } from 'base64-arraybuffer';
import SignaturePad from '../../components/SignaturePad';

export default function EncomendasScreen() {
  const router = useRouter();
  const { encomendas, isLoading, fetchEncomendas } = useEncomenda() as {
    encomendas: Encomenda[];
    isLoading: boolean;
    fetchEncomendas: () => void;
  };
  const [busca, setBusca] = useState('');

  // Estados para seleção múltipla
  const [selectedIds, setSelectedIds] = useState<Set<string | number>>(new Set());
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkLoading, setBulkLoading] = useState(false);

  // Limpa a seleção quando a aba ganha foco
  useFocusEffect(
    useCallback(() => {
      clearSelection();
    }, [])
  );

  // Sincronização em Tempo Real
  useEffect(() => {
    fetchEncomendas();

    const channel = supabase
      .channel('encomendas-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'encomendas' },
        () => {
          fetchEncomendas();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchEncomendas]);

  // Exclusão individual
  const handleDelete = async (id: string | number) => {
    Alert.alert(
      "Confirmar Exclusão",
      "Tem certeza que deseja excluir esta encomenda permanentemente?",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Excluir",
          style: "destructive",
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('encomendas')
                .delete()
                .eq('id', id);
              if (error) throw error;
              fetchEncomendas();
            } catch (error) {
              Alert.alert("Erro", "Não foi possível excluir a encomenda.");
            }
          }
        }
      ]
    );
  };

  // Aviso SMS individual
  const enviarAvisoSMS = async (item: Encomenda) => {
    try {
      await notificationService.enviarAvisoSMS(item);
      Alert.alert("Sucesso", "Aviso de chegada enviado ao morador.");
    } catch (error) {
      Alert.alert("Erro", "Falha ao enviar aviso.");
    }
  };

  // Filtro: apenas pendentes + busca multi-termos
  const encomendasFiltradas = encomendas.filter((enc: Encomenda) => {
    if (enc.status === 'retirada') return false;

    const termo = busca.toLowerCase().trim();
    if (termo === '') return true;

    if (termo.includes('/')) {
      const [blocoBusca, aptoBusca] = termo.split('/');
      const matchesBloco = String(enc.bloco || "").toLowerCase().includes(blocoBusca.trim());
      const matchesApto = (enc.apartamento || "").toString().includes(aptoBusca.trim());
      return matchesBloco && matchesApto;
    }

    return (
      (enc.destinatario || "").toLowerCase().includes(termo) ||
      (enc.apartamento || "").toString().includes(termo) ||
      (enc.qr_code || "").toLowerCase().includes(termo)
    );
  });

  // Alternar seleção (checkbox)
  const toggleSelection = (id: string | number) => {
    setSelectedIds((prev: Set<string | number>) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const clearSelection = () => setSelectedIds(new Set());

  // Entrega em massa
  const handleBulkSignature = async (signature: string, nomeRec: string, porteiroEnt: string) => {
    setBulkLoading(true);
    try {
      // Upload único da assinatura
      const fileName = `assinaturas/bulk_sig_${Date.now()}.png`;
      const base64Data = signature.replace('data:image/png;base64,', '');
      const { error: uploadError } = await supabase.storage
        .from('assinaturas')
        .upload(fileName, decode(base64Data), { contentType: 'image/png', upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from('assinaturas').getPublicUrl(fileName);
      const publicUrl = urlData.publicUrl;
      const dataRetirada = new Date().toISOString();

      // Atualizar todos os registros selecionados
      const updates = Array.from(selectedIds).map(id =>
        supabase.from('encomendas').update({
          nome_recebedor: nomeRec.toUpperCase().trim(),
          porteiro_entrega: porteiroEnt.toUpperCase().trim(),
          assinatura: publicUrl,
          status: 'retirada',
          data_retirada: dataRetirada
        }).eq('id', id)
      );

      await Promise.all(updates);

      Alert.alert("Sucesso", `${selectedIds.size} encomendas entregues com sucesso.`);
      clearSelection();
      setShowBulkModal(false);
      fetchEncomendas();
    } catch (error: any) {
      Alert.alert("Erro", error.message || "Falha ao processar entregas em massa.");
    } finally {
      setBulkLoading(false);
    }
  };

  // Renderização do item (com checkbox dedicada)
  const renderItem = ({ item }: { item: Encomenda }) => {
    const isSelected = selectedIds.has(item.id);
    return (
      <View style={[styles.card, styles.cardPendente, isSelected && styles.cardSelected]}>
        {/* CABEÇALHO COM CHECKBOX */}
        <View style={styles.cardHeader}>
          {/* Checkbox grande e isolada para evitar toques acidentais */}
          <TouchableOpacity
            onPress={() => toggleSelection(item.id)}
            style={styles.checkboxArea}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <MaterialIcons
              name={isSelected ? "check-box" : "check-box-outline-blank"}
              size={26}
              color={isSelected ? "#1974f4" : "#94a3b8"}
            />
          </TouchableOpacity>

          <View style={styles.badgePendente}>
            <Text style={styles.badgeText}>PENDENTE</Text>
          </View>

          <Text style={styles.dataEntrada}>
            Entrada: {item.data_chegada ? new Date(item.data_chegada).toLocaleDateString('pt-BR') : ''}
          </Text>

          <TouchableOpacity onPress={() => handleDelete(item.id)}>
            <MaterialIcons name="delete-outline" size={24} color="#ef4444" />
          </TouchableOpacity>
        </View>

        {/* CORPO DO CARD */}
        <View style={styles.cardBody}>
          <Text style={styles.destinatario}>{item.destinatario}</Text>
          <View style={styles.infoRow}>
            <MaterialIcons name="business" size={18} color="#64748b" />
            <Text style={styles.infoText}>Bloco {item.bloco} - Apto {item.apartamento}</Text>
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

        {/* BOTÕES DE AÇÃO INDIVIDUAIS */}
        <View style={styles.actionsContainer}>
          <TouchableOpacity
            style={[styles.actionButton, styles.btnAviso]}
            onPress={() => enviarAvisoSMS(item)}
          >
            <MaterialIcons name="notifications-active" size={20} color="#0b5176" />
            <Text style={styles.btnAvisoText}>Avisar</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.btnEntregar]}
            onPress={() => router.push({ pathname: '/scanner', params: { id: item.id } })}
          >
            <MaterialIcons name="assignment-turned-in" size={20} color="#fff" />
            <Text style={styles.btnEntregarText}>Entregar</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* CABEÇALHO DE BUSCA */}
      <View style={styles.header}>
        <Text style={styles.title}>Encomendas</Text>
        <View style={styles.searchBar}>
          <MaterialIcons name="search" size={20} color="#94a3b8" />
          <TextInput
            style={styles.searchInput}
            placeholder="Nome, Apto, Bloco/Apto ou Cód..."
            value={busca}
            onChangeText={setBusca}
            placeholderTextColor="#94a3b8"
          />
        </View>
      </View>

      {/* LISTAGEM */}
      {isLoading ? (
        <ActivityIndicator size="large" color="#2E7D32" style={{ marginTop: 50 }} />
      ) : (
        <FlatList
          data={encomendasFiltradas}
          keyExtractor={(item: Encomenda) => item.id.toString()}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 16, paddingBottom: 120 }}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <MaterialIcons name="inventory" size={60} color="#cbd5e1" />
              <Text style={styles.emptyText}>Sem encomendas pendentes.</Text>
            </View>
          }
        />
      )}

      {/* BOTÃO FLUTUANTE (FAB) PARA ENTREGA EM MASSA */}
      {selectedIds.size > 0 && (
        <TouchableOpacity
          style={styles.fab}
          activeOpacity={0.8}
          onPress={() => setShowBulkModal(true)}
        >
          <MaterialIcons name="assignment-turned-in" size={24} color="#ffffff" />
          <Text style={styles.fabText}>ENTREGAR SELECIONADOS ({selectedIds.size})</Text>
        </TouchableOpacity>
      )}

      {/* MODAL DE ASSINATURA (DIRETO, SEM ANINHAR) */}
      {showBulkModal && (
        <SignaturePad
          visible={showBulkModal}
          onClose={() => {
            setShowBulkModal(false);
          }}
          onSignature={handleBulkSignature}
        />
      )}

      {/* LOADING PARA ENTREGA EM MASSA */}
      {bulkLoading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#1974f4" />
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ced5df' },
  header: { backgroundColor: '#fff', padding: 16, borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  title: { fontSize: 22, fontWeight: 'bold', color: '#0f172a', marginBottom: 12 },
  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#ebedef', borderRadius: 10, paddingHorizontal: 12, height: 48 },
  searchInput: { flex: 1, marginLeft: 8, fontSize: 16 },
  card: { backgroundColor: '#ffffff', borderRadius: 12, padding: 16, marginBottom: 16, elevation: 4 },
  cardPendente: { borderLeftWidth: 5, borderLeftColor: '#f59e0b' },
  cardSelected: { borderLeftColor: '#1974f4', backgroundColor: '#f0f7ff' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  checkboxArea: {
    marginRight: 8,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 4,
  },
  badgePendente: { backgroundColor: '#fef3c7', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, flex: 1, marginLeft: 8 },
  badgeText: { color: '#92400e', fontWeight: 'bold', fontSize: 12 },
  dataEntrada: { flex: 1, textAlign: 'center', fontSize: 12, color: '#64748b' },
  cardBody: { marginBottom: 16 },
  destinatario: { fontSize: 18, fontWeight: 'bold', color: '#1e293b', marginBottom: 8 },
  infoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6, gap: 8 },
  infoText: { fontSize: 14, color: '#101011' },
  actionsContainer: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: '#f1f5f9', paddingTop: 12, gap: 10 },
  actionButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderRadius: 8, gap: 8 },
  btnAviso: { backgroundColor: '#c0d8e8', borderWidth: 1, borderColor: '#6cb4da' },
  btnAvisoText: { color: '#0b5176', fontWeight: '600' },
  btnEntregar: { backgroundColor: '#2E7D32' },
  btnEntregarText: { color: '#fff', fontWeight: '600' },
  emptyContainer: { alignItems: 'center', marginTop: 80 },
  emptyText: { color: '#64748b', marginTop: 10, fontSize: 16 },

  // FAB (Botão Flutuante)
  fab: {
    position: 'absolute',
    bottom: 30,
    left: 20,
    right: 20,
    backgroundColor: '#1974f4',
    paddingVertical: 16,
    borderRadius: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    gap: 10,
  },
  fabText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});