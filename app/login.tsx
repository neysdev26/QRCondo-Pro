import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  Alert, 
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Modal
} from 'react-native';
import { useAuth, AuthContextData } from '../contexts/AuthContext';
import { router } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
// Cliente do Supabase, usado diretamente aqui para disparar o e-mail de
// redefinição de senha (recurso nativo do Supabase Auth)
import { supabase } from '../lib/supabase';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [loading, setLoading] = useState(false);

  // Controla o modal de "Esqueci minha senha"
  const [showRecuperarModal, setShowRecuperarModal] = useState(false);
  // E-mail digitado dentro do modal de recuperação (começa preenchido com o e-mail já digitado no login, se houver)
  const [emailRecuperacao, setEmailRecuperacao] = useState('');
  // Loading específico do envio do e-mail de recuperação
  const [recuperandoSenha, setRecuperandoSenha] = useState(false);
  
  // Extraímos o método signIn do AuthContext
  const { signIn } = useAuth() as AuthContextData;

  const handleLogin = async () => {
    // Validação básica de campos vazios
    if (!email.trim() || !senha.trim()) {
      Alert.alert('Erro', 'Por favor, preencha o e-mail e a senha.');
      return;
    }

    setLoading(true);
    try {
      // Tenta realizar o login
      await signIn(email, senha);
      
      // NOTA: Não é necessário chamar router.replace aqui.
      // O useEffect no seu _layout.tsx detectará a mudança no estado 
      // 'session' do AuthContext e fará o redirecionamento automaticamente.
    } catch (error: any) {
      Alert.alert('Falha no login', error.message || 'Verifique suas credenciais.');
    } finally {
      setLoading(false);
    }
  };

  // Abre o modal de recuperação já preenchendo com o e-mail digitado no login (se houver)
  const handleAbrirRecuperacao = () => {
    setEmailRecuperacao(email.trim());
    setShowRecuperarModal(true);
  };

  // Dispara o e-mail de redefinição de senha via Supabase Auth
  const handleRecuperarSenha = async () => {
    const emailFormatado = emailRecuperacao.trim();
    if (!emailFormatado) {
      Alert.alert('Atenção', 'Informe o e-mail cadastrado para recuperar a senha.');
      return;
    }

    setRecuperandoSenha(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(emailFormatado);
      if (error) throw error;

      Alert.alert(
        'E-mail enviado',
        'Verifique sua caixa de entrada (e o spam) para redefinir sua senha.'
      );
      setShowRecuperarModal(false);
      setEmailRecuperacao('');
    } catch (error: any) {
      Alert.alert('Erro', error.message || 'Não foi possível enviar o e-mail de recuperação.');
    } finally {
      setRecuperandoSenha(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
      style={styles.container}
    >
      <View style={styles.card}>
        <MaterialIcons name="qr-code-scanner" size={60} color="#1974f4" style={styles.logo} />
        <Text style={styles.title}>QrCondo Pro</Text>
        <Text style={styles.subtitle}>Gestão de Encomendas</Text>

        <TextInput
          style={styles.input}
          placeholder="E-mail"
          keyboardType="email-address"
          autoCapitalize="none"
          value={email}
          onChangeText={setEmail}
        />
        
        <TextInput
          style={styles.input}
          placeholder="Senha"
          secureTextEntry
          value={senha}
          onChangeText={setSenha}
        />

        <TouchableOpacity 
          style={styles.button} 
          onPress={handleLogin} 
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Entrar</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity onPress={handleAbrirRecuperacao} style={styles.forgotPasswordBtn}>
          <Text style={styles.forgotPasswordText}>Esqueci minha senha</Text>
        </TouchableOpacity>

        <View style={styles.linksContainer}>
          <TouchableOpacity onPress={() => router.push('/cadastro-condominio')}>
            <Text style={styles.link}>Cadastrar Condomínio</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.push('/cadastro-usuario')}>
            <Text style={styles.link}>Cadastrar Usuário</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* MODAL DE RECUPERAÇÃO DE SENHA */}
      <Modal
        visible={showRecuperarModal}
        animationType="fade"
        transparent
        onRequestClose={() => setShowRecuperarModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Recuperar Senha</Text>
            <Text style={styles.modalSubtitle}>
              Informe o e-mail cadastrado. Enviaremos um link para você redefinir sua senha.
            </Text>

            <TextInput
              style={styles.input}
              placeholder="Seu e-mail"
              keyboardType="email-address"
              autoCapitalize="none"
              value={emailRecuperacao}
              onChangeText={setEmailRecuperacao}
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.btnCancel]}
                onPress={() => setShowRecuperarModal(false)}
                disabled={recuperandoSenha}
              >
                <Text style={styles.btnCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, styles.btnEnviar]}
                onPress={handleRecuperarSenha}
                disabled={recuperandoSenha}
              >
                {recuperandoSenha ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.btnEnviarText}>Enviar</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#ced5df', 
    justifyContent: 'center', 
    padding: 20 
  },
  card: { 
    backgroundColor: '#fff', 
    padding: 25, 
    borderRadius: 20, 
    alignItems: 'center', 
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8
  },
  logo: { marginBottom: 10 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#1e293b' },
  subtitle: { fontSize: 14, color: '#64748b', marginBottom: 30 },
  input: { 
    width: '100%', 
    backgroundColor: '#f1f5f9', 
    padding: 14, 
    borderRadius: 10, 
    marginBottom: 15, 
    borderWidth: 1, 
    borderColor: '#e2e8f0' 
  },
  button: { 
    backgroundColor: '#1974f4', 
    width: '100%', 
    padding: 14, 
    borderRadius: 10, 
    alignItems: 'center',
    marginTop: 10 
  },
  buttonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  forgotPasswordBtn: { marginTop: 16 },
  forgotPasswordText: { color: '#64748b', fontSize: 13, fontWeight: '600', textDecorationLine: 'underline' },
  linksContainer: { marginTop: 25, flexDirection: 'row', gap: 20 },
  link: { color: '#1974f4', fontSize: 13, fontWeight: '600' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: '#fff', borderRadius: 16, padding: 20, elevation: 5 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#1e293b', marginBottom: 8 },
  modalSubtitle: { fontSize: 13, color: '#64748b', marginBottom: 16 },
  modalButtons: { flexDirection: 'row', gap: 12, marginTop: 5 },
  modalBtn: { flex: 1, height: 44, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  btnCancel: { backgroundColor: '#f1f5f9', borderWidth: 1, borderColor: '#e2e8f0' },
  btnCancelText: { color: '#475569', fontWeight: 'bold' },
  btnEnviar: { backgroundColor: '#1974f4' },
  btnEnviarText: { color: '#fff', fontWeight: 'bold' },
});