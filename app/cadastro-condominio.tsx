import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  Alert, ActivityIndicator, ScrollView
} from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../lib/supabase';
import { MaterialIcons } from '@expo/vector-icons';

// 🔥 Função de gerar chave (simples, sem argumentos)
const gerarChave = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

export default function CadastroCondominioScreen() {
  const router = useRouter();
  const [nome, setNome] = useState('');
  const [cnpj, setCnpj] = useState('');
  const [loading, setLoading] = useState(false);
  const [chavesGeradas, setChavesGeradas] = useState<{ porteiro: string; morador: string } | null>(null);

  const handleCadastrar = async () => {
    if (!nome.trim()) {
      Alert.alert('Erro', 'Informe o nome do condomínio.');
      return;
    }

    setLoading(true);
    try {
      // Verifica se já existe pelo CNPJ (se informado)
      if (cnpj.trim()) {
        const { data: existing, error: checkError } = await supabase
          .from('condominios')
          .select('id')
          .eq('cnpj', cnpj.trim())
          .maybeSingle();
        
        if (checkError) {
          console.error('❌ Erro ao verificar CNPJ:', checkError);
        }
        
        if (existing) {
          Alert.alert('Aviso', 'Já existe um condomínio com este CNPJ.');
          setLoading(false);
          return;
        }
      }

      // 🔥 Gera as chaves (sem argumentos)
      const chavePorteiro = gerarChave();
      const chaveMorador = gerarChave();

      console.log('🔑 Chave Porteiro:', chavePorteiro);
      console.log('🔑 Chave Morador:', chaveMorador);

      // 🔥 Dados a serem inseridos
      const dadosCondominio = {
        nome: nome.trim().toUpperCase(),
        cnpj: cnpj.trim() || null,
        chave_porteiro: chavePorteiro,
        chave_morador: chaveMorador,
      };

      console.log('📦 Dados a inserir:', dadosCondominio);

      // 🔥 Inserir com .select() para retornar os dados
      const { data, error } = await supabase
        .from('condominios')
        .insert(dadosCondominio)
        .select(); // 👈 ESSENCIAL: retorna os dados inseridos

      if (error) {
        console.error('❌ Erro ao inserir:', error);
        throw error;
      }

      console.log('✅ Condomínio criado com sucesso:', data);

      // 🔥 Extrai as chaves do retorno
      if (data && data.length > 0) {
        const condominioCriado = data[0];
        setChavesGeradas({
          porteiro: condominioCriado.chave_porteiro || chavePorteiro,
          morador: condominioCriado.chave_morador || chaveMorador,
        });
        
        console.log('🔑 Chaves salvas no banco:', {
          porteiro: condominioCriado.chave_porteiro,
          morador: condominioCriado.chave_morador,
        });
      }

      Alert.alert('Sucesso', 'Condomínio cadastrado! Anote as chaves abaixo.');
    } catch (err: any) {
      console.error('❌ Erro completo:', err);
      Alert.alert('Erro', err.message || 'Erro ao cadastrar condomínio.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.card}>
        <MaterialIcons name="apartment" size={60} color="#1974f4" />
        <Text style={styles.title}>Cadastrar Condomínio</Text>

        <TextInput
          style={styles.input}
          placeholder="Nome do condomínio *"
          value={nome}
          onChangeText={setNome}
        />
        <TextInput
          style={styles.input}
          placeholder="CNPJ (opcional)"
          value={cnpj}
          onChangeText={setCnpj}
          keyboardType="numeric"
        />

        <TouchableOpacity style={styles.button} onPress={handleCadastrar} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>CADASTRAR</Text>}
        </TouchableOpacity>

        {chavesGeradas && (
          <View style={styles.chavesContainer}>
            <Text style={styles.chavesTitle}>🔑 Chaves geradas:</Text>
            <View style={styles.chaveRow}>
              <Text style={styles.chaveLabel}>Porteiro:</Text>
              <Text style={styles.chaveValor}>{chavesGeradas.porteiro}</Text>
            </View>
            <View style={styles.chaveRow}>
              <Text style={styles.chaveLabel}>Morador:</Text>
              <Text style={styles.chaveValor}>{chavesGeradas.morador}</Text>
            </View>
            <Text style={styles.chaveAviso}>Guarde estas chaves para distribuir aos usuários.</Text>
          </View>
        )}

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
  title: { fontSize: 24, fontWeight: 'bold', marginTop: 10, marginBottom: 20 },
  input: { width: '100%', backgroundColor: '#f1f5f9', padding: 12, borderRadius: 10, marginBottom: 15, borderWidth: 1, borderColor: '#e2e8f0' },
  button: { backgroundColor: '#1974f4', padding: 14, borderRadius: 10, width: '100%', alignItems: 'center', marginTop: 10 },
  buttonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  link: { color: '#1974f4', marginTop: 15, fontWeight: 'bold' },
  chavesContainer: { marginTop: 20, width: '100%', backgroundColor: '#f0f7ff', padding: 15, borderRadius: 10 },
  chavesTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 8, color: '#0f172a' },
  chaveRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  chaveLabel: { fontSize: 14, color: '#475569' },
  chaveValor: { fontSize: 14, fontWeight: 'bold', color: '#1974f4', fontFamily: 'monospace' },
  chaveAviso: { fontSize: 12, color: '#64748b', marginTop: 8, fontStyle: 'italic' },
});