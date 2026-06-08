import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator, RefreshControl, TouchableOpacity } from 'react-native';
import { supabase } from '../../lib/supabase';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export default function DashboardScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [encomendas, setEncomendas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  const [dbStats, setDbStats] = useState({
    chegados_hoje: 0,
    pendentes_total: 0,
    entregues_hoje: 0
  });

  const fetchStats = async () => {
    try {
      // Dispara as consultas em paralelo para máxima velocidade
      const [statsRes, listRes] = await Promise.all([
        supabase.from('dashboard_stats').select('*').single(),
        supabase
          .from('encomendas')
          .select('id, destinatario, apartamento, bloco, status, data_chegada')
          .order('data_chegada', { ascending: false })
          .limit(5)
      ]);

      if (statsRes.data) setDbStats(statsRes.data);
      if (listRes.data) setEncomendas(listRes.data);

    } catch (error) {
      console.error("Erro na comunicação com o banco:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchStats();

    // LOGICA REAL-TIME: Escuta as tabelas físicas para atualizar a VIEW
    const channel = supabase
      .channel('db-monitor-realtime')
      .on(
        'postgres_changes', 
        { event: '*', schema: 'public', table: 'encomendas' }, 
        () => fetchStats() // Atualiza os números se houver nova encomenda ou mudança
      )
      .on(
        'postgres_changes', 
        { event: '*', schema: 'public', table: 'encomendas_historico' }, 
        () => fetchStats() // Atualiza os números se uma entrega for finalizada
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const stats = useMemo(() => ({
    chegaramHoje: dbStats.chegados_hoje || 0,
    pendentes: dbStats.pendentes_total || 0,
    entreguesHoje: dbStats.entregues_hoje || 0,
  }), [dbStats]);

  if (loading && !refreshing) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#1974f4" />
      </View>
    );
  }

  return (
    <ScrollView 
      style={[styles.container, { paddingTop: insets.top }]}
      refreshControl={
        <RefreshControl 
          refreshing={refreshing} 
          onRefresh={() => { setRefreshing(true); fetchStats(); }} 
          colors={["#1974f4"]} 
          tintColor="#1974f4" 
        />
      }
    >
      <View style={styles.header}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Text style={styles.title}>QrCondo</Text>
          <MaterialCommunityIcons 
            name="office-building-marker" 
            size={40} 
            color="#1974f4" 
            style={{ marginLeft: 15 }} 
          />
        </View>
        <Text style={styles.subtitle}>Gestão e Logística de Encomendas</Text>
      </View>

      <View style={styles.statsGrid}>
        <TouchableOpacity 
          style={[styles.card, { width: '100%', marginBottom: 15, borderColor: '#1974f4', borderLeftWidth: 5 }]}
          onPress={() => router.push('/encomendas')}
        >
          <Text style={styles.label}>Total Chegadas (Hoje)</Text>
          <Text style={[styles.val, { color: '#1974f4' }]}>{stats.chegaramHoje}</Text>
        </TouchableOpacity>

        <View style={styles.row}>
          <TouchableOpacity 
            style={[styles.card, { borderColor: '#F59E0B', borderLeftWidth: 5 }]}
            onPress={() => router.push('/encomendas')}
          >
            <Text style={styles.label}>Pendentes</Text>
            <Text style={[styles.val, { color: '#F59E0B' }]}>{stats.pendentes}</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.card, { borderColor: '#10B981', borderLeftWidth: 5 }]}
            onPress={() => router.push('/encomendas')}
          >
            <Text style={styles.label}>Entregues Hoje</Text>
            <Text style={[styles.val, { color: '#10B981' }]}>{stats.entreguesHoje}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.recentSection}>
          <Text style={styles.sectionTitle}>Movimentações Recentes</Text>
          {encomendas.map((item) => (
            <TouchableOpacity 
              key={item.id} 
              style={styles.itemCard}
              onPress={() => router.push({ pathname: '/scanner', params: { id: item.id } })}
            >
              <View style={[styles.statusLine, { backgroundColor: item.status === 'pendente' ? '#F59E0B' : '#10B981' }]} />
              <View style={{ flex: 1 }}>
                <Text style={styles.itemTitle}>{item.destinatario}</Text>
                <Text style={styles.itemSub}>Apto {item.apartamento} - Bloco {item.bloco}</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={styles.itemStatusText}>{item.status === 'pendente' ? 'AGUARDANDO' : 'ENTREGUE'}</Text>
                <Text style={styles.itemDate}>
                  {item.data_chegada ? new Date(item.data_chegada).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : ''}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </View>
      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ced5df' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { padding: 30, backgroundColor: '#FFF', borderBottomLeftRadius: 30, borderBottomRightRadius: 30, elevation: 2 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#1E293B' },
  subtitle: { fontSize: 14, color: '#64748B', marginTop: 5 },
  statsGrid: { padding: 20 },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  card: { backgroundColor: '#FFF', padding: 20, borderRadius: 15, width: '48%', elevation: 3, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10 },
  label: { fontSize: 13, color: '#64748B', fontWeight: '600' },
  val: { fontSize: 32, fontWeight: 'bold', marginTop: 10 },
  recentSection: { marginTop: 25 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#1E293B', marginBottom: 15 },
  itemCard: { backgroundColor: '#FFF', padding: 15, borderRadius: 12, flexDirection: 'row', alignItems: 'center', marginBottom: 10, elevation: 2 },
  statusLine: { width: 4, height: 35, borderRadius: 2, marginRight: 12 },
  itemTitle: { fontSize: 15, fontWeight: 'bold', color: '#334155' },
  itemSub: { fontSize: 12, color: '#64748B' },
  itemStatusText: { fontSize: 10, fontWeight: 'bold', color: '#94A3B8', marginBottom: 2 },
  itemDate: { fontSize: 11, color: '#94A3B8' }
});