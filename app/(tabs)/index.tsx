import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { RefreshControl } from 'react-native-gesture-handler';
import { supabase } from '../../lib/supabase';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';

export default function DashboardScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { perfil } = useAuth() as any;
  const [encomendas, setEncomendas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  const [dbStats, setDbStats] = useState({
    chegados_hoje: 0,
    pendentes_total: 0,
    entregues_hoje: 0
  });

  const fetchStats = async () => {
    if (!perfil || !perfil.condominio_id) {
      setLoading(false);
      setRefreshing(false);
      return;
    }
    
    setLoading(true);
    try {
      if (perfil.tipo_usuario === 'porteiro') {
        const { data: statsData, error: statsError } = await supabase
          .from('dashboard_stats')
          .select('*')
          .eq('condominio_id', perfil.condominio_id)
          .maybeSingle();
        if (statsData && !statsError) setDbStats(statsData);
      } else {
        // Morador: consultas manuais
        const { count: pendentesCount } = await supabase
          .from('encomendas')
          .select('encomendas_id', { count: 'exact', head: true })
          .eq('condominio_id', perfil.condominio_id)
          .eq('apartamento', perfil.apartamento)
          .eq('bloco', perfil.bloco)
          .eq('status', 'pendente');

        const hojeIso = new Date().toISOString().split('T')[0];

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

      // Buscar entradas recentes (limit 5)
      let query = supabase
        .from('encomendas')
        .select('encomendas_id, destinatario, apartamento, bloco, status, data_chegada, qr_code, remetente, observacoes, porteiro_entrada, porteiro_entrega')
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
  };

  useEffect(() => {
    if (!perfil) return;
    fetchStats();

    const channel = supabase
      .channel('db-monitor-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'encomendas' }, () => fetchStats())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'encomendas_historico' }, () => fetchStats())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [perfil]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchStats();
  };

  const widgetsData = useMemo(() => [
    { 
      title: 'Chegaram Hoje', 
      value: dbStats.chegados_hoje, 
      icon: 'package-variant-closed', 
      color: '#1974f4', 
      bgColor: '#e8f2ff' 
    },
    { 
      title: 'Aguardando Retirada', 
      value: dbStats.pendentes_total, 
      icon: 'clock-outline', 
      color: '#b27b00', 
      bgColor: '#fff9db' 
    },
    { 
      title: 'Entregues Hoje', 
      value: dbStats.entregues_hoje, 
      icon: 'check-circle-outline', 
      color: '#2b8a3e', 
      bgColor: '#ebfbee' 
    },
  ], [dbStats]);

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingCenter}>
        <ActivityIndicator size="large" color="#1974f4" />
      </View>
    );
  }

  return (
    <ScrollView 
      style={[styles.container, { paddingTop: insets.top }]}
      contentContainerStyle={{ paddingBottom: 30 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* CABEÇALHO */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <MaterialCommunityIcons name="office-building-marker" size={36} color="#1974f4" />
          <View style={styles.headerTitles}>
            <Text style={styles.appName}>QrCondo Pro</Text>
            <Text style={styles.appTagline}>Gestão e Logística de Encomendas</Text>
          </View>
        </View>
        {perfil && (
          <View style={styles.userBadge}>
            <Text style={styles.userBadgeText}>{perfil.nome?.split(' ')[0]}</Text>
          </View>
        )}
      </View>

      {/* WIDGETS */}
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

      {/* SEÇÃO DE ENTRADAS RECENTES – INDIVIDUALIZADAS */}
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
          encomendas.map((item, index) => (
            <TouchableOpacity 
              key={item.id || index} 
              style={styles.listItemCard}
              activeOpacity={0.7}
              onPress={() => router.push({ pathname: '/scanner', params: { id: item.id } })}
            >
              <View style={styles.listItemLeft}>
                <View style={[styles.statusIndicator, { 
                  backgroundColor: item.status === 'pendente' ? '#f59e0b' : '#10b981' 
                }]} />
                <View style={styles.listIconBox}>
                  <MaterialCommunityIcons 
                    name={item.status === 'pendente' ? 'clock-outline' : 'check-circle'} 
                    size={24} 
                    color={item.status === 'pendente' ? '#f59e0b' : '#10b981'} 
                  />
                </View>
              </View>
              <View style={styles.listInfo}>
                <View style={styles.listRow}>
                  <Text style={styles.listDestinatario} numberOfLines={1}>{item.destinatario}</Text>
                  <Text style={styles.listStatus}>
                    {item.status === 'pendente' ? 'PENDENTE' : 'ENTREGUE'}
                  </Text>
                </View>
                <Text style={styles.listSub}>
                  Bloco {item.bloco} - Apto {item.apartamento}
                </Text>
                <View style={styles.listMeta}>
                  <MaterialCommunityIcons name="clock-time-four-outline" size={14} color="#94a3b8" />
                  <Text style={styles.listDate}>
                    {item.data_chegada 
                      ? new Date(item.data_chegada).toLocaleString('pt-BR', { 
                          day: '2-digit', 
                          month: '2-digit', 
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })
                      : ''
                    }
                  </Text>
                  {item.remetente && (
                    <>
                      <MaterialCommunityIcons name="mail" size={14} color="#94a3b8" style={{ marginLeft: 12 }} />
                      <Text style={styles.listRemetente} numberOfLines={1}>{item.remetente}</Text>
                    </>
                  )}
                </View>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={24} color="#94a3b8" />
            </TouchableOpacity>
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#edeff2', paddingHorizontal: 20 },
  loadingCenter: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#ced5df' },

  // Cabeçalho
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 24,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerTitles: {
    flexDirection: 'column',
  },
  appName: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#1974f4',
    letterSpacing: 0.5,
  },
  appTagline: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  userBadge: {
    backgroundColor: '#1974f4',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  userBadgeText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 13,
  },

  // Widgets
  widgetsGrid: {
    gap: 12,
    marginBottom: 8,
  },
  widgetRow: {
    flexDirection: 'row',
    gap: 16,
  },
  widgetCard: {
    borderRadius: 16,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
  },
  widgetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  widgetTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  widgetValue: {
    fontSize: 28,
    fontWeight: 'bold',
    marginTop: 8,
  },

  // Seção e lista
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  seeAll: {
    color: '#1974f4',
    fontWeight: 'bold',
    fontSize: 14,
  },
  listContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    paddingVertical: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
  },

  // Card individual
  listItemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginHorizontal: 8,
    marginVertical: 4,
    borderRadius: 12,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#f1f5f9',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
  },
  listItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
  },
  statusIndicator: {
    width: 4,
    height: 40,
    borderRadius: 2,
    marginRight: 8,
  },
  listIconBox: {
    backgroundColor: '#f8fafc',
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  listInfo: {
    flex: 1,
  },
  listRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  listDestinatario: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1e293b',
    flex: 1,
    marginRight: 8,
  },
  listStatus: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#64748b',
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  listSub: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 2,
  },
  listMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    gap: 4,
  },
  listDate: {
    fontSize: 12,
    color: '#94a3b8',
  },
  listRemetente: {
    fontSize: 12,
    color: '#94a3b8',
    flex: 1,
  },
  emptyContainer: {
    padding: 30,
    alignItems: 'center',
    gap: 12,
  },
  emptyText: {
    color: '#64748b',
    fontSize: 13,
    textAlign: 'center',
  },
});