import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useEncomenda } from '../../hooks/useEncomenda';
import { useAuth } from '../../contexts/AuthContext'; // ✨ IMPORTAÇÃO INCLUÍDA
import Constants from 'expo-constants';

export default function ConfiguracoesPage() {
  const insets = useSafeAreaInsets();
  const { createBackup, loading } = useEncomenda();
  const { signOut } = useAuth() as any; // ✨ EXTRAÇÃO DO MÉTODO DE LOGOUT

  const appVersion = Constants.expoConfig?.version || Constants.nativeAppVersion || '1.0.12';

  // Handler para confirmação de logout
  const handleLogout = () => {
    Alert.alert("Sair da Conta", "Deseja realmente encerrar sua sessão?", [
      { text: "Cancelar", style: "cancel" },
      { text: "Sair", style: "destructive", onPress: async () => {
        try {
          await signOut();
        } catch (err: any) {
          Alert.alert("Erro ao sair", err.message || "Não foi possível efetuar o logout.");
        }
      }}
    ]);
  };

  return (
    <ScrollView style={[styles.container, { paddingTop: insets.top }]} contentContainerStyle={{ paddingBottom: 40 }}>
      <Text style={styles.title}>Configurações</Text>
      
      <View style={styles.infoSection}>
        <View style={styles.iconContainer}><MaterialIcons name="qr-code-2" size={40} color="#1974f4" /></View>
        <Text style={styles.appName}>QrCondo Pro</Text>
        <Text style={styles.appVersion}>Versão {appVersion}</Text>
        <Text style={styles.appDescription}>Sistema inteligente para gestão e controle de encomendas</Text>
      </View>

      <Text style={styles.sectionLabel}>DADOS E SEGURANÇA</Text>
      <View style={styles.cardGroup}>
        <TouchableOpacity style={styles.settingCard} onPress={createBackup} disabled={loading}>
          <View style={[styles.iconBox, { backgroundColor: '#e0f2fe' }]}><MaterialIcons name="cloud-download" size={24} color="#0284c7" /></View>
          <View style={styles.cardContent}>
            <Text style={styles.cardTitle}>Exportar Backup</Text>
            <Text style={styles.cardSub}>Gere uma planilha compatível com Excel com todos os registros.</Text>
          </View>
          {loading ? <ActivityIndicator color="#0284c7" /> : <MaterialIcons name="chevron-right" size={24} color="#cbd5e1" />}
        </TouchableOpacity>
      </View>

      <Text style={styles.sectionLabel}>AJUDA E SUPORTE</Text>
      <View style={styles.cardGroup}>
        <TouchableOpacity style={styles.settingCard} onPress={() => Alert.alert("Suporte", "Suporte técnico: suporte@qrcondo.com")}>
          <View style={[styles.iconBox, { backgroundColor: '#f1f5f9' }]}><MaterialIcons name="help-outline" size={24} color="#64748b" /></View>
          <View style={styles.cardContent}>
            <Text style={styles.cardTitle}>Manual do Usuário</Text>
            <Text style={styles.cardSub}>Saiba como utilizar todas as funções do app.</Text>
          </View>
          <MaterialIcons name="chevron-right" size={24} color="#cbd5e1" />
        </TouchableOpacity>
      </View>

      {/* ✨ SEÇÃO DE LOGOUT ADICIONADA */}
      <Text style={styles.sectionLabel}>CONTA</Text>
      <View style={[styles.cardGroup, { marginBottom: 20 }]}>
        <TouchableOpacity style={styles.settingCard} onPress={handleLogout}>
          <View style={[styles.iconBox, { backgroundColor: '#fee2e2' }]}><MaterialIcons name="logout" size={24} color="#dc2626" /></View>
          <View style={styles.cardContent}>
            <Text style={[styles.cardTitle, { color: '#dc2626' }]}>Sair do Aplicativo</Text>
            <Text style={styles.cardSub}>Desconectar seu usuário deste dispositivo.</Text>
          </View>
          <MaterialIcons name="chevron-right" size={24} color="#cbd5e1" />
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ced5df', paddingHorizontal: 20 },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 20, color: '#0f172a', marginTop: 10 },
  infoSection: { backgroundColor: '#FFF', padding: 20, borderRadius: 15, alignItems: 'center', elevation: 2, marginBottom: 25 },
  iconContainer: { width: 70, height: 70, borderRadius: 15, backgroundColor: '#f0f7ff', justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  appName: { fontSize: 22, fontWeight: 'bold', color: '#1e293b' },
  appVersion: { fontSize: 13, color: '#94a3b8', marginBottom: 10 },
  appDescription: { fontSize: 14, color: '#64748b', textAlign: 'center' },
  sectionLabel: { fontSize: 12, fontWeight: 'bold', color: '#64748b', marginBottom: 8, marginTop: 15 }, // Leve aumento de margem superior para o espaçamento do botão novo
  cardGroup: { backgroundColor: '#FFF', borderRadius: 12, paddingHorizontal: 15, elevation: 2, marginBottom: 10 },
  settingCard: { flexDirection: 'row', alignItems: 'center', paddingVertical: 15 },
  iconBox: { width: 40, height: 40, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  cardContent: { flex: 1 },
  cardTitle: { fontSize: 15, fontWeight: '600', color: '#1e293b' },
  cardSub: { fontSize: 12, color: '#94a3b8' }
});