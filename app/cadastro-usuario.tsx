import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  Alert, ActivityIndicator, ScrollView
} from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../lib/supabase';
import { MaterialIcons } from '@expo/vector-icons';

export default function CadastroUsuarioScreen() {
  const router = useRouter();
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [tipoUsuario, setTipoUsuario] = useState<'porteiro' | 'morador'>('porteiro');
  const [chaveAcesso, setChaveAcesso] = useState(''); // 👈 CAMPO DA CHAVE
  const [bloco, setBloco] = useState('');
  const [apartamento, setApartamento] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCadastrar = async () => {
    if (!email.trim() || !senha.trim() || !nome.trim() || !chaveAcesso.trim()) {
      Alert.alert('Erro', 'Preencha todos os campos obrigatórios.');
      return;
    }
    if (tipoUsuario === 'morador' && (!bloco.trim() || !apartamento.trim())) {
      Alert.alert('Erro', 'Para morador, informe bloco e apartamento.');
      return;
    }

    setLoading(true);
    try {
      // 1. Verificar a chave de acesso
      const campoChave = tipoUsuario === 'porteiro' ? 'chave_porteiro' : 'chave_morador';
      const { data: condominio, error: chaveError } = await supabase
        .from('condominios')
        .select('id')
        .eq(campoChave, chaveAcesso.trim())
        .maybeSingle();

      if (chaveError) throw chaveError;
      if (!condominio) {
        Alert.alert('Erro', 'Chave de acesso inválida. Verifique com o administrador.');
        setLoading(false);
        return;
      }

      // 2. Criar usuário no Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: email.trim(),
        password: senha,
      });
      if (authError) throw authError;
      if (!authData.user) throw new Error('Falha ao criar usuário.');

      // 3. Inserir perfil
      const { error: profileError } = await supabase.from('perfis_usuarios').insert({
        id: authData.user.id,
        condominio_id: condominio.id,
        nome: nome.trim(),
        tipo_usuario: tipoUsuario,
        bloco: tipoUsuario === 'morador' ? bloco.trim() : null,
        apartamento: tipoUsuario === 'morador' ? apartamento.trim() : null,
      });
      if (profileError) throw profileError;

      Alert.alert('Sucesso', 'Usuário criado! Faça login.');
      router.push('/login');
    } catch (err: any) {
      Alert.alert('Erro', err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.card}>
        <MaterialIcons name="person-add" size={60} color="#1974f4" />
        <Text style={styles.title}>Cadastrar Usuário</Text>
        <Text style={styles.subtitle}>Insira a chave fornecida pelo administrador</Text>

        <TextInput
          style={styles.input}
          placeholder="Nome completo *"
          value={nome}
          onChangeText={setNome}
        />
        <TextInput
          style={styles.input}
          placeholder="E-mail *"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />
        <TextInput
          style={styles.input}
          placeholder="Senha *"
          secureTextEntry
          value={senha}
          onChangeText={setSenha}
        />

        <Text style={styles.label}>Tipo de usuário:</Text>
        <View style={styles.row}>
          <TouchableOpacity
            style={[styles.tipoBtn, tipoUsuario === 'porteiro' && styles.tipoBtnActive]}
            onPress={() => setTipoUsuario('porteiro')}
          >
            <Text style={tipoUsuario === 'porteiro' ? styles.tipoBtnTextActive : styles.tipoBtnText}>
              Porteiro
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tipoBtn, tipoUsuario === 'morador' && styles.tipoBtnActive]}
            onPress={() => setTipoUsuario('morador')}
          >
            <Text style={tipoUsuario === 'morador' ? styles.tipoBtnTextActive : styles.tipoBtnText}>
              Morador
            </Text>
          </TouchableOpacity>
        </View>

        <TextInput
          style={styles.input}
          placeholder="Chave de acesso * (ex: PORT-7F3A1-1)"
          value={chaveAcesso}
          onChangeText={setChaveAcesso}
          autoCapitalize="characters"
        />

        {tipoUsuario === 'morador' && (
          <View style={styles.row}>
            <TextInput
              style={[styles.input, { flex: 1, marginRight: 8 }]}
              placeholder="Bloco *"
              value={bloco}
              onChangeText={setBloco}
            />
            <TextInput
              style={[styles.input, { flex: 1 }]}
              placeholder="Apartamento *"
              value={apartamento}
              onChangeText={setApartamento}
              keyboardType="numeric"
            />
          </View>
        )}

        <TouchableOpacity style={styles.button} onPress={handleCadastrar} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>CRIAR USUÁRIO</Text>}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.push('/login')}>
          <Text style={styles.link}>Voltar ao login</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, backgroundColor: '#ced5df', justifyContent: 'center', padding: 20 },
  card: { backgroundColor: '#fff', padding: 25, borderRadius: 20, alignItems: 'center' },
  title: { fontSize: 24, fontWeight: 'bold', marginTop: 10 },
  subtitle: { fontSize: 13, color: '#64748b', marginBottom: 20, textAlign: 'center' },
  input: { width: '100%', backgroundColor: '#f1f5f9', padding: 12, borderRadius: 10, marginBottom: 12, borderWidth: 1, borderColor: '#e2e8f0' },
  label: { alignSelf: 'flex-start', fontSize: 14, fontWeight: 'bold', marginBottom: 8, color: '#334155' },
  row: { flexDirection: 'row', width: '100%', justifyContent: 'space-between', marginBottom: 12 },
  tipoBtn: { flex: 1, padding: 12, borderRadius: 10, borderWidth: 1, borderColor: '#cbd5e1', alignItems: 'center', marginHorizontal: 4 },
  tipoBtnActive: { backgroundColor: '#1974f4', borderColor: '#1974f4' },
  tipoBtnText: { color: '#475569' },
  tipoBtnTextActive: { color: '#fff', fontWeight: 'bold' },
  button: { backgroundColor: '#1974f4', padding: 14, borderRadius: 10, width: '100%', alignItems: 'center', marginTop: 10 },
  buttonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  link: { color: '#1974f4', marginTop: 15, fontWeight: 'bold' },
});