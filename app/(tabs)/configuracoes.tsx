import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useEncomenda } from '../../hooks/useEncomenda';

// Importa metadados do projeto (lê o seu app.json automaticamente)
import Constants from 'expo-constants';

export default function ConfiguracoesPage() {
  const insets = useSafeAreaInsets();
  const { createBackup, loading } = useEncomenda();

  // Sincroniza com a versão definida no app.json ou package.json
  const appVersion = 
  Constants.expoConfig?.version || 
  Constants.nativeAppVersion || 
  '1.0.12';

  const appInfo = {
    nome: "QrCondo",
    versao: appVersion,
    descricao: "Sistema inteligente para gestão e controle de encomendas",
    desenvolvedor: "NeyS_Dev"
  };

  return (
    <ScrollView 
      style={[styles.container, { paddingTop: insets.top }]}
      contentContainerStyle={{ paddingBottom: 40 }}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.title}>Configurações</Text>
      
      {/* SEÇÃO: SOBRE O APP */}
      <View style={styles.infoSection}>
        <View style={styles.iconContainer}>
          <MaterialIcons name="qr-code-2" size={40} color="#1974f4" />
        </View>
        <Text style={styles.appName}>{appInfo.nome}</Text>
        <Text style={styles.appVersion}>Versão {appInfo.versao}</Text>
        <Text style={styles.appDescription}>{appInfo.descricao}</Text>
      </View>

      {/* SEÇÃO: FERRAMENTAS DE DADOS */}
      <Text style={styles.sectionLabel}>DADOS E SEGURANÇA</Text>
      
      <View style={styles.cardGroup}>
        {/* BACKUP REAL (CSV/EXCEL) */}
        <TouchableOpacity 
          style={styles.settingCard} 
          onPress={createBackup}
          disabled={loading}
          activeOpacity={0.7}
        >
          <View style={[styles.iconBox, { backgroundColor: '#e0f2fe' }]}>
            <MaterialIcons name="cloud-download" size={24} color="#0284c7" />
          </View>
          <View style={styles.cardContent}>
            <Text style={styles.cardTitle}>Exportar Backup</Text>
            <Text style={styles.cardSub}>Gere uma planilha compatível com Excel com todos os registros.</Text>
          </View>
          {loading ? (
            <ActivityIndicator color="#0284c7" />
          ) : (
            <MaterialIcons name="chevron-right" size={24} color="#cbd5e1" />
          )}
        </TouchableOpacity>
      </View>

      {/* SEÇÃO: SUPORTE */}
      <Text style={styles.sectionLabel}>AJUDA E SUPORTE</Text>
      <View style={styles.cardGroup}>
        <TouchableOpacity 
          style={styles.settingCard} 
          onPress={() => Alert.alert("Suporte", "Para suporte técnico: suporte@qrcondo.com")}
          activeOpacity={0.7}
        >
          <View style={[styles.iconBox, { backgroundColor: '#f1f5f9' }]}>
            <MaterialIcons name="help-outline" size={24} color="#64748b" />
          </View>
          <View style={styles.cardContent}>
            <Text style={styles.cardTitle}>Manual do Usuário</Text>
            <Text style={styles.cardSub}>Saiba como utilizar todas as funções do app.</Text>
          </View>
          <MaterialIcons name="chevron-right" size={24} color="#cbd5e1" />
        </TouchableOpacity>
      </View>

      <Text style={styles.footerText}>Desenvolvido por {appInfo.desenvolvedor}</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#ced5df', 
    paddingHorizontal: 20 
  },
  title: { 
    fontSize: 28, 
    fontWeight: 'bold', 
    marginBottom: 24, 
    color: '#0f172a', 
    marginTop: 10 
  },
  infoSection: { 
    backgroundColor: '#FFF', 
    padding: 25, 
    borderRadius: 24, 
    alignItems: 'center', 
    elevation: 2, 
    marginBottom: 30 
  },
  iconContainer: { 
    width: 80, 
    height: 80, 
    borderRadius: 20, 
    backgroundColor: '#f0f7ff', 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginBottom: 15 
  },
  appName: { 
    fontSize: 24, 
    fontWeight: 'bold', 
    color: '#1e293b' 
  },
  appVersion: { 
    fontSize: 14, 
    color: '#94a3b8', 
    marginBottom: 12,
    fontWeight: '600'
  },
  appDescription: { 
    fontSize: 14, 
    color: '#64748b', 
    textAlign: 'center', 
    lineHeight: 20 
  },
  sectionLabel: { 
    fontSize: 13, 
    fontWeight: 'bold', 
    color: '#64748b', 
    marginBottom: 10, 
    marginLeft: 5, 
    letterSpacing: 1 
  },
  cardGroup: { 
    backgroundColor: '#FFF', 
    borderRadius: 20, 
    paddingHorizontal: 15, 
    elevation: 2, 
    marginBottom: 25 
  },
  settingCard: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingVertical: 18 
  },
  iconBox: { 
    width: 44, 
    height: 44, 
    borderRadius: 12, 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginRight: 15 
  },
  cardContent: { 
    flex: 1 
  },
  cardTitle: { 
    fontSize: 16, 
    fontWeight: '600', 
    color: '#1e293b', 
    marginBottom: 2 
  },
  cardSub: { 
    fontSize: 12, 
    color: '#94a3b8', 
    paddingRight: 10 
  },
  footerText: { 
    textAlign: 'center', 
    color: '#94a3b8', 
    fontSize: 12, 
    marginTop: 10 
  }
});