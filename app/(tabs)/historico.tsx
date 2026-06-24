import React, { useState } from 'react';
import {
  View, Text, FlatList, TextInput, StyleSheet, ActivityIndicator,
  SafeAreaView, TouchableOpacity, Alert
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { Encomenda } from '../../types';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { useAuth, AuthContextData } from '../../contexts/AuthContext';

type ItemType = Encomenda;

export default function HistoricoScreen() {
  const router = useRouter();
  const { perfil } = useAuth() as AuthContextData;
  const [busca, setBusca] = useState('');
  const [resultados, setResultados] = useState<ItemType[]>([]);
  const [loading, setLoading] = useState(false);

  const buscarNoBanco = async (texto: string) => {
    if (!perfil) return;
    setBusca(texto);
    const termo = texto.toLowerCase().trim();

    if (termo.length < 2) {
      setResultados([]);
      return;
    }

    setLoading(true);
    try {
      let query = supabase
        .from('encomendas_historico')
        .select('*')
        .eq('status', 'retirada')
        .eq('condominio_id', perfil.condominio_id);

      if (perfil.tipo_usuario === 'morador') {
        query = query
          .eq('apartamento', perfil.apartamento)
          .eq('bloco', perfil.bloco);
      }

      if (termo.includes('/')) {
        const [blocoBusca, aptoBusca] = termo.split('/');
        if (blocoBusca) query = query.ilike('bloco', `%${blocoBusca.trim()}%`);
        if (aptoBusca) query = query.ilike('apartamento', `%${aptoBusca.trim()}%`);
      } else {
        query = query.or(`destinatario.ilike.%${termo}%,qr_code.ilike.%${termo}%,apartamento.ilike.%${termo}%`);
      }

      const { data, error } = await query
        .order('data_retirada', { ascending: false })
        .limit(20);

      if (error) throw error;
      setResultados(data as ItemType[] || []);
    } catch (error) {
      console.error('Erro na busca:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDateTime = (dateStr: string | undefined) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleString('pt-BR');
  };

  const handleGerarPDF = async (item: ItemType) => {
    if (!item || !item.id) {
      Alert.alert('Erro', 'Item inválido para gerar PDF.');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('encomendas_historico')
        .select('*')
        .eq('id', item.id)
        .single();

      if (error || !data) throw new Error('Dados não encontrados');

      const html = `
        <!DOCTYPE html>
        <html>
          <head>
            <style>
              body { font-family: 'Helvetica', 'Arial', sans-serif; color: #333; padding: 20px; }
              .container { border: 2px solid #e2e8f0; padding: 30px; border-radius: 10px; max-width: 600px; margin: auto; }
              .header { text-align: center; border-bottom: 2px solid #10B981; padding-bottom: 20px; margin-bottom: 30px; }
              .header h1 { color: #10B981; margin: 0; font-size: 24px; text-transform: uppercase; }
              .header p { color: #64748b; margin: 5px 0 0; font-size: 14px; }
              .section { margin-bottom: 25px; }
              .section-title { font-weight: bold; font-size: 12px; color: #10B981; text-transform: uppercase; margin-bottom: 10px; border-bottom: 1px solid #f1f5f9; padding-bottom: 5px; }
              .grid { display: flex; flex-wrap: wrap; }
              .grid-item { width: 50%; margin-bottom: 12px; }
              .label { font-size: 10px; color: #64748b; text-transform: uppercase; display: block; }
              .value { font-size: 14px; font-weight: 600; color: #1e293b; }
              .signature-box { margin-top: 40px; text-align: center; border-top: 1px dashed #cbd5e1; padding-top: 20px; }
              .signature-img { width: 280px; height: auto; max-height: 120px; }
              .footer { text-align: center; margin-top: 40px; font-size: 10px; color: #94a3b8; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>Comprovante de Entrega</h1>
                <p>Protocolo Digital de Encomendas</p>
              </div>
              
              <div class="section">
                <div class="section-title">Dados da Encomenda</div>
                <div class="grid">
                  <div class="grid-item"><span class="label">Destinatário</span><span class="value">${data.destinatario || ''}</span></div>
                  <div class="grid-item"><span class="label">Unidade</span><span class="value">Bloco ${data.bloco || ''} - Ap ${data.apartamento || ''}</span></div>
                  <div class="grid-item"><span class="label">Remetente</span><span class="value">${data.remetente || 'Não informado'}</span></div>
                  <div class="grid-item"><span class="label">Código/QR</span><span class="value">${data.qr_code || '---'}</span></div>
                </div>
              </div>

              <div class="section">
                <div class="section-title">Histórico de Movimentação</div>
                <div class="grid">
                  <div class="grid-item"><span class="label">Data de Entrada</span><span class="value">${formatDateTime(data.data_chegada)}</span></div>                  
                  <div class="grid-item"><span class="label">Porteiro (Entrada)</span><span class="value">${data.porteiro_entrada || ''}</span></div>
                  <div class="grid-item"><span class="label">Retirado por</span><span class="value">${data.nome_recebedor || ''}</span></div>
                  <div class="grid-item"><span class="label">Porteiro (Entrega)</span><span class="value">${data.porteiro_entrega || ''}</span></div>
                  <div class="grid-item"><span class="label">Data de Retirada</span><span class="value">${formatDateTime(data.data_retirada)}</span></div>
                </div>
              </div>

              <div class="signature-box">
                <span class="label">Assinatura do Recebedor: ${data.nome_recebedor || ''}</span>
                ${data.assinatura ? `<img src="${data.assinatura}" class="signature-img" />` : '<p>Assinatura não disponível</p>'}
              </div>

              <div class="footer">
                Documento gerado digitalmente em ${new Date().toLocaleString('pt-BR')}<br>
                ID do Registro: ${data.id || 'N/A'}
              </div>
            </div>
          </body>
        </html>
      `;
      
      const { uri } = await Print.printToFileAsync({ html, base64: false });
      await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
      
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível gerar o comprovante.');
    } finally {
      setLoading(false);
    }
  };

  const renderItem = (info: { item: ItemType; index: number }) => {
    const item = info.item;
    if (!item || !item.id) {
      return null;
    }

    return (
      <View style={styles.cardWrapper}>
        {/* 🔹 TOUCHABLE PARA NAVEGAR AO SCANNER EM MODO VISUALIZAÇÃO */}
        <TouchableOpacity
          onPress={() => {
            // Navega para o scanner passando o ID. O scanner detectará status='retirada' e entrará em modo read-only (apenas comprovante)
            router.push({ pathname: '/scanner', params: { id: item.id } });
          }}
          activeOpacity={0.7}
        >
          <View style={styles.cardHeader}>
            <View style={styles.statusBadge}>
              <Text style={styles.statusBadgeText}>RETIRADA</Text>
            </View>
            <Text style={styles.dataText}>
              Entrada: {item.data_chegada ? new Date(item.data_chegada).toLocaleDateString('pt-BR') : ''}
            </Text>
          </View>

          <Text style={styles.destinatario}>{item.destinatario || ''}</Text>
          <View style={styles.infoRow}>
            <MaterialIcons name="business" size={16} color="#475569" />
            <Text style={styles.infoText}>Bloco {item.bloco || ''} - Apto {item.apartamento || ''}</Text>
          </View>
          <View style={styles.infoRow}>
            <MaterialIcons name="qr-code" size={16} color="#475569" />
            <Text style={styles.infoText}>Cód: {item.qr_code || '---'}</Text>
          </View>
          <View style={styles.infoRow}>
            <MaterialIcons name="mail" size={16} color="#475569" />
            <Text style={styles.infoText}>Rem: {item.remetente || '---'}</Text>
          </View>
          <View style={styles.retiradaInfo}>
            <MaterialIcons name="event-available" size={16} color="#15803d" />
            <Text style={styles.dataRetirada}>
              Retirado em: {item.data_retirada ? new Date(item.data_retirada).toLocaleDateString('pt-BR') : ''}
            </Text>
          </View>
        </TouchableOpacity>

        <View style={styles.actionsContainer}>
          <TouchableOpacity
            style={[styles.actionButton, styles.btnPDF]}
            onPress={() => handleGerarPDF(item)}
          >
            <MaterialIcons name="picture-as-pdf" size={20} color="#fff" />
            <Text style={styles.btnPDFText}>COMPROVANTE PDF</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Histórico de Entregas</Text>
        <View style={styles.searchBar}>
          <MaterialIcons name="search" size={24} color="#94a3b8" />
          <TextInput
            style={styles.searchInput}
            placeholder="Nome, Apto, Bloco/Apto ou Código..."
            value={busca}
            onChangeText={buscarNoBanco}
            placeholderTextColor="#94a3b8"
          />
          {loading && <ActivityIndicator size="small" color="#1974f4" />}
        </View>
      </View>

      <FlatList
        data={resultados}
        keyExtractor={(item: ItemType, index: number) => {
          if (item && item.id) {
            return item.id.toString();
          }
          return `fallback-${index}`;
        }}
        renderItem={renderItem}
        contentContainerStyle={{ paddingBottom: 40 }}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <MaterialIcons name="history" size={60} color="#cbd5e1" />
            <Text style={styles.emptyText}>
              {busca.trim().length === 0 
                ? "Digite para pesquisar no histórico" 
                : busca.trim().length < 2 
                  ? "Digite pelo menos 2 caracteres..." 
                  : "Nenhum registro encontrado"}
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#d1dfce' },
  header: { padding: 20, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  title: { fontSize: 22, fontWeight: 'bold', marginBottom: 10, color: '#0f172a' },
  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f1f5f9', borderRadius: 8, paddingHorizontal: 10, height: 50, borderWidth: 1, borderColor: '#e2e8f0' },
  searchInput: { flex: 1, marginLeft: 8, fontSize: 16, color: '#0f172a' },
  cardWrapper: { backgroundColor: '#a1eca4', padding: 15, marginHorizontal: 16, marginTop: 12, borderRadius: 10, elevation: 3, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 5, borderLeftWidth: 5, borderLeftColor: '#10b981' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  statusBadge: { backgroundColor: '#d1fae5', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 5 },
  statusBadgeText: { fontSize: 11, fontWeight: 'bold', color: '#065f46' },
  destinatario: { fontSize: 18, fontWeight: 'bold', color: '#0f172a', marginBottom: 6 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  infoText: { color: '#475569', fontSize: 14 },
  dataText: { fontSize: 12, color: '#64748b' },
  retiradaInfo: { flexDirection: 'row', alignItems: 'center', marginTop: 10, gap: 5, backgroundColor: '#f0fdf4', padding: 6, borderRadius: 6 },
  dataRetirada: { fontSize: 13, color: '#166534', fontWeight: '600' },
  actionsContainer: { borderTopWidth: 1, borderTopColor: '#f1f5f9', paddingTop: 12, marginTop: 12 },
  actionButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderRadius: 8, gap: 8 },
  btnPDF: { backgroundColor: '#ef4444' },
  btnPDFText: { color: '#fff', fontWeight: 'bold', fontSize: 13 },
  emptyContainer: { alignItems: 'center', marginTop: 80 },
  emptyText: { color: '#64748b', fontSize: 16, marginTop: 10 },
});