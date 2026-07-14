import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useEncomenda } from '../../hooks/useEncomenda';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import Constants from 'expo-constants';
import { useState } from 'react';

export default function ConfiguracoesPage() {
  const insets = useSafeAreaInsets();
  const { createBackup, loading } = useEncomenda();
  const { signOut } = useAuth() as any;
  const [deletingAccount, setDeletingAccount] = useState(false);

  const appVersion = Constants.expoConfig?.version || Constants.nativeAppVersion || '1.0.12';

  const appInfo = {
    nome: "QrCondo Pro",
    versao: appVersion,
    descricao: "Sistema inteligente para gestão e controle de encomendas",
    desenvolvedor: "NeyS_Dev"
  };

  const handleLogout = () => {
    Alert.alert(
      "Sair da Conta",
      "Deseja realmente encerrar sua sessão?",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Sair",
          style: "destructive",
          onPress: async () => {
            try {
              await signOut();
            } catch (err: any) {
              Alert.alert("Erro ao sair", err.message || "Não foi possível efetuar o logout.");
            }
          }
        }
      ]
    );
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      "⚠️ Excluir Conta",
      "Esta ação é PERMANENTE e não pode ser desfeita.\n\nTodos os seus dados de acesso serão apagados. Encomendas e registros do condomínio seguem as regras de retenção do sistema.\n\nDeseja continuar?",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Continuar",
          style: "destructive",
          onPress: () => {
            // Segunda confirmação, para evitar exclusões acidentais
            Alert.alert(
              "Confirmação Final",
              "Tem certeza absoluta que deseja excluir sua conta definitivamente?",
              [
                { text: "Cancelar", style: "cancel" },
                {
                  text: "Excluir Definitivamente",
                  style: "destructive",
                  onPress: async () => {
                    setDeletingAccount(true);
                    try {
                      // Chama uma Edge Function no Supabase responsável por apagar
                      // o usuário em auth.users (requer service_role, por isso
                      // não pode ser feito diretamente pelo client)
                      const { error } = await supabase.functions.invoke('delete-account');

                      if (error) throw error;

                      Alert.alert(
                        "Conta Excluída",
                        "Sua conta foi excluída com sucesso.",
                        [{ text: "OK", onPress: async () => await signOut() }]
                      );
                    } catch (err: any) {
                      Alert.alert(
                        "Erro ao Excluir Conta",
                        err.message || "Não foi possível excluir sua conta. Tente novamente ou entre em contato com o suporte."
                      );
                    } finally {
                      setDeletingAccount(false);
                    }
                  }
                }
              ]
            );
          }
        }
      ]
    );
  };

  const handleManual = () => {
    Alert.alert(
      "📘 Manual do Usuário",
      "1. 🏢 Cadastrar Condomínio:\n   - Clique em 'Cadastrar Condomínio' no login.\n   - Preencha nome e CNPJ.\n   - Anote as chaves geradas para porteiros e moradores.\n\n" +
      "2. 👤 Cadastrar Usuário:\n   - Clique em 'Cadastrar Usuário' no login.\n   - Informe nome, e-mail, senha e tipo.\n   - Use a chave fornecida pelo condomínio.\n\n" +
      "3. 📦 Cadastrar Encomenda:\n   - Acesse o Scanner.\n   - Leia o QR Code ou digite o código.\n   - Preencha destinatário, bloco e apartamento.\n   - Clique em 'SALVAR ENCOMENDA'.\n\n" +
      "4. ✅ Realizar Entrega:\n   - Na lista de encomendas, clique em 'ENTREGAR'.\n   - Ou use 'ENTREGAR SELECIONADOS' para várias.\n   - Assine digitalmente.\n\n" +
      "5. 📜 Histórico e Comprovantes:\n   - Acesse a aba 'Histórico'.\n   - Clique em 'COMPROVANTE PDF' para gerar o comprovante.\n\n" +
      "6. 🔑 Tipos de Usuário:\n   - Porteiro: acesso total.\n   - Morador: apenas visualização.\n\n" +
      "📧 Suporte: neysdev@gmail.com",
      [{ text: "OK" }]
    );
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

      {/* SEÇÃO: DADOS E SEGURANÇA */}
      <Text style={styles.sectionLabel}>DADOS E SEGURANÇA</Text>
      <View style={styles.cardGroup}>
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
          {loading ? <ActivityIndicator color="#0284c7" /> : <MaterialIcons name="chevron-right" size={24} color="#cbd5e1" />}
        </TouchableOpacity>
      </View>

      {/* SEÇÃO: AJUDA E SUPORTE */}
      <Text style={styles.sectionLabel}>AJUDA E SUPORTE</Text>
      <View style={styles.cardGroup}>
        <TouchableOpacity
          style={styles.settingCard}
          onPress={handleManual}
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

        <TouchableOpacity
          style={[styles.settingCard, { borderTopWidth: 1, borderTopColor: '#f1f5f9' }]}
          onPress={() => Alert.alert("Suporte", "Para suporte técnico, entre em contato:\n\n📧 neysdev@gmail.com\n📱 (11) 9XXXX-XXXX")}
          activeOpacity={0.7}
        >
          <View style={[styles.iconBox, { backgroundColor: '#fce7f3' }]}>
            <MaterialIcons name="mail-outline" size={24} color="#be185d" />
          </View>
          <View style={styles.cardContent}>
            <Text style={styles.cardTitle}>Contato</Text>
            <Text style={styles.cardSub}>Suporte técnico e dúvidas.</Text>
          </View>
          <MaterialIcons name="chevron-right" size={24} color="#cbd5e1" />
        </TouchableOpacity>
      </View>

      {/* SEÇÃO: CONTA */}
      <Text style={styles.sectionLabel}>CONTA</Text>
      <View style={styles.cardGroup}>
        <TouchableOpacity
          style={styles.settingCard}
          onPress={handleLogout}
          activeOpacity={0.7}
        >
          <View style={[styles.iconBox, { backgroundColor: '#fee2e2' }]}>
            <MaterialIcons name="logout" size={24} color="#dc2626" />
          </View>
          <View style={styles.cardContent}>
            <Text style={[styles.cardTitle, { color: '#dc2626' }]}>Sair do Aplicativo</Text>
            <Text style={styles.cardSub}>Desconectar seu usuário deste dispositivo.</Text>
          </View>
          <MaterialIcons name="chevron-right" size={24} color="#cbd5e1" />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.settingCard, { borderTopWidth: 1, borderTopColor: '#f1f5f9' }]}
          onPress={handleDeleteAccount}
          disabled={deletingAccount}
          activeOpacity={0.7}
        >
          <View style={[styles.iconBox, { backgroundColor: '#fee2e2' }]}>
            <MaterialIcons name="delete-forever" size={24} color="#dc2626" />
          </View>
          <View style={styles.cardContent}>
            <Text style={[styles.cardTitle, { color: '#dc2626' }]}>Excluir Conta</Text>
            <Text style={styles.cardSub}>Apagar sua conta e dados de acesso definitivamente.</Text>
          </View>
          {deletingAccount ? <ActivityIndicator color="#dc2626" /> : <MaterialIcons name="chevron-right" size={24} color="#cbd5e1" />}
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
    letterSpacing: 1,
    marginTop: 15
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