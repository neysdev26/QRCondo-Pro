import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { RefreshControl } from 'react-native-gesture-handler';
import { supabase } from '../../lib/supabase';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';

// Tipo dos nomes válidos de ícone do MaterialCommunityIcons — usado para
// que o TypeScript valide o mapa de ícones abaixo em vez de tratá-lo como
// 'string' genérico (o que mascara nomes de ícone inválidos/digitados errado).
type MCIIconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

export default function DashboardScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { perfil } = useAuth() as any;
  const [encomendas, setEncomendas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [condominioNome, setCondominioNome] = useState('Carregando...');

  const [dbStats, setDbStats] = useState({
    chegados_hoje: 0,
    pendentes_total: 0,
    entregues_hoje: 0
  });

  // 🔹 Função para mapear descrição para ícone
  const getIconForDescription = useCallback((descricao: string): MCIIconName => {
    if (!descricao) return 'package-variant';
    
    const desc = descricao.toLowerCase().trim();
    
    const iconMap: { [key: string]: MCIIconName } = {
      'carta': 'email',
      'cartas': 'email',
      'cx': 'package',
      'caixa': 'package',
      'caixas': 'package',
      'pct': 'package-variant',
      'pacote': 'package-variant',
      'pacotes': 'package-variant',
      'encomenda': 'package-variant',
      'encomendas': 'package-variant',
      'documento': 'file-document',
      'documentos': 'file-document',
      'sedex': 'truck-fast',
      'transportadora': 'truck',
      'mercadoria': 'shopping',
      'mercadorias': 'shopping',
      'comida': 'food',
      'alimento': 'food',
      'medicamento': 'pill',
      'remédio': 'pill',
      'remedio': 'pill',
      'roupa': 'hanger',
      'roupas': 'hanger',
      'vestuário': 'hanger',
      'vestuario': 'hanger',
      'livro': 'book',
      'livros': 'book',
      'eletrônico': 'laptop',
      'eletronico': 'laptop',
      'eletrônicos': 'laptop',
      'eletronicos': 'laptop',
      'celular': 'cellphone',
      'tv': 'television',
      'televisão': 'television',
      'televisao': 'television',
      'brinquedo': 'toy-brick',
      'brinquedos': 'toy-brick',
      'ferramenta': 'wrench',
      'ferramentas': 'wrench'
    };
    
    for (const [key, icon] of Object.entries(iconMap)) {
      if (desc.includes(key)) {
        return icon;
      }
    }
    
    return 'package-variant';
  }, []);

  const buscarNomeCondominio = useCallback(async () => {
    if (!perfil || !perfil.condominio_id) return;
    try {
      const { data, error } = await supabase
        .from('condominios')
        .select('nome')
        .eq('uuid', perfil.condominio_id)
        .maybeSingle();
      if (error) {
        console.error('❌ Erro ao buscar condomínio:', error);
        setCondominioNome('Erro ao carregar');
        return;
      }
      if (data) {
        setCondominioNome(data.nome);
      } else {
        setCondominioNome('Condomínio não encontrado');
      }
    } catch (err) {
      console.error('💥 Erro inesperado ao buscar condomínio:', err);
      setCondominioNome('Erro');
    }
  }, [perfil]);

  const fetchStats = useCallback(async (showLoading = true) => {
    if (!perfil || !perfil.condominio_id) {
      setLoading(false);
      setRefreshing(false);
      return;
    }

    if (showLoading) setLoading(true);
    try {
      await buscarNomeCondominio();

      if (perfil.tipo_usuario === 'porteiro') {
        const { data: statsData, error: statsError } = await supabase
          .from('dashboard_stats')
          .select('*')
          .eq('condominio_id', perfil.condominio_id)
          .maybeSingle();
        if (statsData && !statsError) setDbStats(statsData);
      } else {
        const hojeIso = new Date().toISOString().split('T')[0];

        const { count: pendentesCount } = await supabase
          .from('encomendas')
          .select('encomendas_id', { count: 'exact', head: true })
          .eq('condominio_id', perfil.condominio_id)
          .eq('apartamento', perfil.apartamento)
          .eq('bloco', perfil.bloco)
          .eq('status', 'pendente');

        const { count: chegadosCount } = await supabase
          .from('encomendas')
          .select('encomendas_id', { count: 'exact', head: true })
          .eq('condominio_id', perfil.condominio_id)
          .eq('apartamento', perfil.apartamento)
          .eq('bloco', perfil.bloco)
          .gte('data_chegada', hojeIso);

        const { count: entreguesCount } = await supabase
          .from('encomendas_historico')
          .select('id', { count: 'exact', head: true })
          .eq('condominio_id', perfil.condominio_id)
          .eq('apartamento', perfil.apartamento)
          .eq('bloco', perfil.bloco)
          .gte('data_retirada', hojeIso);

        setDbStats({
          chegados_hoje: chegadosCount || 0,
          pendentes_total: pendentesCount || 0,
          entregues_hoje: entreguesCount || 0
        });
      }

      let query = supabase
        .from('encomendas')
        .select('id, encomendas_id, destinatario, apartamento, bloco, status, data_chegada, qr_code, remetente, observacoes, porteiro_entrada, porteiro_entrega')
        .eq('condominio_id', perfil.condominio_id)
        .order('data_chegada', { ascending: false })
        .limit(5);

      if (perfil.tipo_usuario === 'morador') {
        query = query.eq('apartamento', perfil.apartamento).eq('bloco', perfil.bloco);
      }

      const { data: listData, error: listError } = await query;
      if (listError) console.error("Erro na lista do dashboard:", listError);

      if (listData && !listError) {
        const dadosNormalizados = listData.map((item: any) => ({
          ...item,
          id: item.id || item.encomendas_id
        }));
        setEncomendas(dadosNormalizados);
      }
    } catch (error) {
      console.error("Erro na comunicação com o banco:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [perfil, buscarNomeCondominio]);

  useFocusEffect(
    useCallback(() => {
      if (perfil) fetchStats(false);
    }, [perfil, fetchStats])
  );

  useEffect(() => {
    if (!perfil) return;
    fetchStats(true);

    const channel = supabase
      .channel('db-monitor-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'encomendas' }, () => fetchStats(false))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'encomendas_historico' }, () => fetchStats(false))
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [perfil]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchStats(false);
  };

  // 🔹 Função para navegar para o scanner com o ID correto
  const handleCardPress = useCallback((item: any) => {
  if (!item || !item.id) return;
  router.push({ pathname: '/scanner', params: { id: item.id.toString() } });
}, [router]);

  const widgetsData = useMemo(() => [
    { title: 'Chegaram Hoje', value: dbStats.chegados_hoje, icon: 'package-variant-closed', color: '#1974f4', bgColor: '#e8f2ff' },
    { title: 'Aguardando Retirada', value: dbStats.pendentes_total, icon: 'clock-outline', color: '#b27b00', bgColor: '#fff9db' },
    { title: 'Entregues Hoje', value: dbStats.entregues_hoje, icon: 'check-circle-outline', color: '#2b8a3e', bgColor: '#ebfbee' },
  ], [dbStats]);

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingCenter}>
        <ActivityIndicator size="large" color="#1974f4" />
      </View>
    );
  }

  const inicial = perfil?.nome?.charAt(0)?.toUpperCase() || '?';

  return (
    <ScrollView
      style={[styles.container, { paddingTop: insets.top }]}
      contentContainerStyle={{ paddingBottom: 30 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <MaterialCommunityIcons name="office-building-marker" size={36} color="#1974f4" />
          <View style={styles.headerTitles}>
            <Text style={styles.appName}>QrCondo Pro</Text>
            <Text style={styles.appTagline}>Gestão e Logística de Encomendas</Text>
          </View>
        </View>
        {perfil && (
          <View style={styles.avatarContainer}>
            <Text style={styles.avatarText}>{inicial}</Text>
          </View>
        )}
      </View>

      {perfil && (
        <View style={styles.userInfoContainer}>
          <Text style={styles.userName}>👤 {perfil.nome}</Text>
          <Text style={styles.condominioName}>🏢 {condominioNome}</Text>
          <Text style={styles.userRole}>
            {perfil.tipo_usuario === 'porteiro' ? '🔑 Porteiro' : '🏠 Morador'}
            {perfil.tipo_usuario === 'morador' && ` - Bloco ${perfil.bloco} - Apto ${perfil.apartamento}`}
          </Text>
        </View>
      )}

      <View style={styles.widgetsGrid}>
        <View style={styles.widgetRow}>
          <View style={[styles.widgetCard, { backgroundColor: '#e8f2ff', flex: 1, marginRight: 8 }]}>
            <View style={styles.widgetHeader}>
              <MaterialCommunityIcons name="package-variant-closed" size={24} color="#1974f4" />
              <Text style={[styles.widgetTitle, { color: '#1974f4' }]}>Chegaram Hoje</Text>
            </View>
            <Text style={[styles.widgetValue, { color: '#1974f4' }]}>{dbStats.chegados_hoje}</Text>
          </View>
          <View style={[styles.widgetCard, { backgroundColor: '#fff9db', flex: 1, marginLeft: 8 }]}>
            <View style={styles.widgetHeader}>
              <MaterialCommunityIcons name="clock-outline" size={24} color="#b27b00" />
              <Text style={[styles.widgetTitle, { color: '#b27b00' }]}>Aguardando</Text>
            </View>
            <Text style={[styles.widgetValue, { color: '#b27b00' }]}>{dbStats.pendentes_total}</Text>
          </View>
        </View>
        <View style={styles.widgetRow}>
          <View style={[styles.widgetCard, { backgroundColor: '#ebfbee', flex: 1 }]}>
            <View style={styles.widgetHeader}>
              <MaterialCommunityIcons name="check-circle-outline" size={24} color="#2b8a3e" />
              <Text style={[styles.widgetTitle, { color: '#2b8a3e' }]}>Entregues Hoje</Text>
            </View>
            <Text style={[styles.widgetValue, { color: '#2b8a3e' }]}>{dbStats.entregues_hoje}</Text>
          </View>
        </View>
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Entradas Recentes</Text>
        <TouchableOpacity onPress={() => router.push('/encomendas')}>
          <Text style={styles.seeAll}>Ver todas</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.listContainer}>
        {encomendas.length === 0 ? (
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons name="package-variant" size={48} color="#94a3b8" />
            <Text style={styles.emptyText}>Nenhuma encomenda registrada recentemente.</Text>
          </View>
        ) : (
          encomendas.map((item: any, index: number) => {
            const iconName = getIconForDescription(item.observacoes);
            const iconColor = item.status === 'pendente' ? '#f59e0b' : '#10b981';
            
            return (
              <TouchableOpacity
                key={item.id || index}
                style={styles.listItemCard}
                activeOpacity={0.7}
                onPress={() => handleCardPress(item)}
              >
                <View style={styles.listItemLeft}>
                  <View style={[styles.statusIndicator, { backgroundColor: item.status === 'pendente' ? '#f59e0b' : '#10b981' }]} />
                  <View style={styles.listIconBox}>
                    <MaterialCommunityIcons
                      name={iconName}
                      size={24}
                      color={iconColor}
                    />
                  </View>
                </View>
                <View style={styles.listInfo}>
                  <View style={styles.listRow}>
                    <Text style={styles.listDestinatario} numberOfLines={1}>{item.destinatario}</Text>
                    <Text style={styles.listStatus}>{item.status === 'pendente' ? 'PENDENTE' : 'ENTREGUE'}</Text>
                  </View>
                  <Text style={styles.listSub}>Bloco {item.bloco} - Apto {item.apartamento}</Text>
                  <View style={styles.listMeta}>
                    <MaterialCommunityIcons name="clock-time-four-outline" size={14} color="#94a3b8" />
                    <Text style={styles.listDate}>
                      {item.data_chegada
                        ? new Date(item.data_chegada).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
                        : ''}
                    </Text>
                    {item.remetente && (
                      <>
                        <MaterialCommunityIcons name="email" size={14} color="#94a3b8" style={{ marginLeft: 12 }} />
                        <Text style={styles.listRemetente} numberOfLines={1}>{item.remetente}</Text>
                      </>
                    )}
                  </View>
                  {item.observacoes && (
                    <Text style={styles.listObservacao} numberOfLines={1}>
                      📝 {item.observacoes}
                    </Text>
                  )}
                </View>
                <MaterialCommunityIcons name="chevron-right" size={24} color="#94a3b8" />
              </TouchableOpacity>
            );
          })
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ced5df', paddingHorizontal: 20 },
  loadingCenter: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#ced5df' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, marginBottom: 24 },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerTitles: { flexDirection: 'column' },
  appName: { fontSize: 26, fontWeight: 'bold', color: '#1974f4', letterSpacing: 0.5 },
  appTagline: { fontSize: 12, color: '#64748b', marginTop: 2 },
  avatarContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1974f4',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  avatarText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 18,
  },
  userInfoContainer: {
    backgroundColor: '#fff',
    padding: 14,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  userName: { fontSize: 16, fontWeight: 'bold', color: '#0f172a', marginBottom: 2 },
  condominioName: { fontSize: 14, color: '#1e293b', marginBottom: 2 },
  userRole: { fontSize: 13, color: '#64748b' },
  widgetsGrid: { gap: 12, marginBottom: 8 },
  widgetRow: { flexDirection: 'row', gap: 16 },
  widgetCard: { borderRadius: 16, padding: 16, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 2 },
  widgetHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  widgetTitle: { fontSize: 14, fontWeight: '600' },
  widgetValue: { fontSize: 28, fontWeight: 'bold', marginTop: 8 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 20, marginBottom: 12 },
  sectionTitle: { fontSize: 17, fontWeight: 'bold', color: '#0f172a' },
  seeAll: { color: '#1974f4', fontWeight: 'bold', fontSize: 14 },
  listContainer: { backgroundColor: '#fff', borderRadius: 16, paddingVertical: 8, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 2 },
  listItemCard: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 16, marginHorizontal: 8, marginVertical: 4, borderRadius: 12, backgroundColor: '#fff', borderWidth: 1, borderColor: '#f1f5f9', elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 2 },
  listItemLeft: { flexDirection: 'row', alignItems: 'center', marginRight: 12 },
  statusIndicator: { width: 4, height: 40, borderRadius: 2, marginRight: 8 },
  listIconBox: { backgroundColor: '#f8fafc', width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#e2e8f0' },
  listInfo: { flex: 1 },
  listRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  listDestinatario: { fontSize: 16, fontWeight: 'bold', color: '#1e293b', flex: 1, marginRight: 8 },
  listStatus: { fontSize: 10, fontWeight: 'bold', color: '#64748b', backgroundColor: '#f1f5f9', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
  listSub: { fontSize: 14, color: '#64748b', marginTop: 2 },
  listMeta: { flexDirection: 'row', alignItems: 'center', marginTop: 6, gap: 4 },
  listDate: { fontSize: 12, color: '#94a3b8' },
  listRemetente: { fontSize: 12, color: '#94a3b8', flex: 1 },
  listObservacao: { fontSize: 12, color: '#64748b', marginTop: 4, fontStyle: 'italic' },
  emptyContainer: { padding: 30, alignItems: 'center', gap: 12 },
  emptyText: { color: '#64748b', fontSize: 13, textAlign: 'center' },
});