import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  Alert, ActivityIndicator, ScrollView
} from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../lib/supabase';
import { MaterialIcons } from '@expo/vector-icons';
import { gerarChave } from '../utils/gerarChave';

export default function CadastroCondominioScreen() {
  const router = useRouter();
  const [nome, setNome] = useState('');
  const [cnpj, setCnpj] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCadastrar = async () => {
    if (!nome.trim()) {
      Alert.alert('Erro', 'Informe o nome do condomínio.');
      return;
    }

    setLoading(true);
    try {
      // Verifica se já existe pelo CNPJ
      if (cnpj.trim()) {
        const { data: existing } = await supabase
          .from('condominios')
          .select('id')
          .eq('cnpj', cnpj.trim())
          .maybeSingle();
        if (existing) {
          Alert.alert('Aviso', 'Já existe um condomínio com este CNPJ.');
          setLoading(false);
          return;
        }
      }

      // 1. Inserir o condomínio
      const { data: newCond, error: insertError } = await supabase
        .from('condominios')
        .insert({ nome: nome.trim(), cnpj: cnpj.trim() || null })
        .select()
        .single();
      if (insertError) throw insertError;

      // 2. Gerar e salvar as chaves
      const chavePorteiro = gerarChave('porteiro', newCond.id);
      const chaveMorador = gerarChave('morador', newCond.id);

      const { error: updateError } = await supabase
        .from('condominios')
        .update({
          chave_porteiro: chavePorteiro,
          chave_morador: chaveMorador,
        })
        .eq('id', newCond.id);
      if (updateError) throw updateError;

      Alert.alert(
        'Sucesso',
        `Condomínio cadastrado!\n\n🔑 Chave Porteiro: ${chavePorteiro}\n🔑 Chave Morador: ${chaveMorador}\n\nGuarde essas chaves para compartilhar com os usuários.`,
        [{ text: 'OK', onPress: () => router.push('/login') }]
      );
    } catch (err: any) {
      Alert.alert('Erro', err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.card}>
        <MaterialIcons name="apartment" size={60} color="#1974f4" />
        <Text style={styles.title}>Cadastrar Condomínio</Text>
        <Text style={styles.subtitle}>As chaves de acesso serão geradas automaticamente</Text>

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
  input: { width: '100%', backgroundColor: '#f1f5f9', padding: 12, borderRadius: 10, marginBottom: 15, borderWidth: 1, borderColor: '#e2e8f0' },
  button: { backgroundColor: '#1974f4', padding: 14, borderRadius: 10, width: '100%', alignItems: 'center', marginTop: 10 },
  buttonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  link: { color: '#1974f4', marginTop: 15, fontWeight: 'bold' },
});