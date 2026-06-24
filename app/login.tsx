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
  Platform 
} from 'react-native';
import { useAuth, AuthContextData } from '../contexts/AuthContext';
import { router } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [loading, setLoading] = useState(false);
  
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

        <View style={styles.linksContainer}>
          <TouchableOpacity onPress={() => router.push('/cadastro-condominio')}>
            <Text style={styles.link}>Cadastrar Condomínio</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.push('/cadastro-usuario')}>
            <Text style={styles.link}>Cadastrar Usuário</Text>
          </TouchableOpacity>
        </View>
      </View>
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
  linksContainer: { marginTop: 25, flexDirection: 'row', gap: 20 },
  link: { color: '#1974f4', fontSize: 13, fontWeight: '600' }
});