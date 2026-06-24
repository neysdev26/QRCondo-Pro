import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  Alert, ActivityIndicator, ScrollView, Modal, Image,
  KeyboardAvoidingView, Platform
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { useAuth, AuthContextData } from '../../contexts/AuthContext';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { decode } from 'base64-arraybuffer';
import SignaturePad from '../../components/SignaturePad';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { MaterialIcons } from '@expo/vector-icons';
import AutocompleteInput from '../../components/ui/AutocompleteInput';

const CameraViewComponent = CameraView as any;

export default function ScannerScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { perfil } = useAuth() as AuthContextData;

  const params = useLocalSearchParams<{ id?: string; data?: string }>();

  const encomendaId: string | undefined = (() => {
    if (params.id) return params.id;
    if (params.data) {
      try { return JSON.parse(params.data).id; } catch { return undefined; }
    }
    return undefined;
  })();

  // ---------- ESTADOS DO FORMULÁRIO ----------
  const [codigoBarra, setCodigoBarra] = useState('');
  const [destinatario, setDestinatario] = useState('');
  const [bloco, setBloco] = useState('');
  const [apartamento, setApartamento] = useState('');
  const [remetente, setRemetente] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [porteiroEntrada, setPorteiroEntrada] = useState('');
  const [modoEdicao, setModoEdicao] = useState(false);
  const [cameraVisible, setCameraVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showSignatureModal, setShowSignatureModal] = useState(false);
  const [savedSignature, setSavedSignature] = useState<string | null>(null);
  const [isReadOnly, setIsReadOnly] = useState(false);
  const [deliveryData, setDeliveryData] = useState({
    nome_recebedor: '',
    porteiro_entrega: '',
    data_retirada: ''
  });

  // ---------- ESTADOS PARA SUGESTÕES ----------
  const [sugestoesDestinatarios, setSugestoesDestinatarios] = useState<string[]>([]);
  const [sugestoesRemetentes, setSugestoesRemetentes] = useState<string[]>([]);
  const [sugestoesPorteiros, setSugestoesPorteiros] = useState<string[]>([]);

  const [permission, requestPermission] = useCameraPermissions();

  // ---------- FUNÇÕES DE BUSCA PARA AUTCOMPLETE ----------
  const buscarSugestoes = async (
    campo: 'destinatario' | 'remetente' | 'porteiro',
    texto: string,
    setSugestoes: (val: string[]) => void
  ) => {
    if (isReadOnly || !perfil) return;

    if (texto.length < 2) {
      setSugestoes([]);
      return;
    }

    let tabela = '';
    let coluna = '';
    if (campo === 'destinatario') {
      tabela = 'lista_moradores';
      coluna = 'nome';
    } else if (campo === 'remetente') {
      tabela = 'lista_remetentes';
      coluna = 'nome';
    } else if (campo === 'porteiro') {
      tabela = 'lista_porteiros';
      coluna = 'nome';
    }

    try {
      const { data, error } = await supabase
        .from(tabela)
        .select('*')
        .eq('condominio_id', perfil.condominio_id)
        .ilike(coluna, `%${texto}%`)
        .limit(10);

      if (error) {
        console.error('❌ Erro na consulta:', error);
        setSugestoes([]);
        return;
      }

      if (campo === 'destinatario') {
        const formatados = data.map((i: any) =>
          `${i.nome} - Bloco ${i.bloco} - Ap ${i.apartamento}`
        );
        setSugestoes(formatados);
      } else {
        const nomes = data.map((i: any) => i.nome).filter(Boolean);
        setSugestoes(nomes);
      }
    } catch (err) {
      console.error('💥 Erro inesperado:', err);
    }
  };

  // ---------- SELECIONAR DESTINATÁRIO ----------
  const handleSelectDestinatario = (sugestao: string) => {
    const partes = sugestao.split(' - ');
    if (partes.length >= 3) {
      setDestinatario(partes[0]);
      setBloco(partes[1]?.replace('Bloco ', '') || '');
      setApartamento(partes[2]?.replace('Ap ', '') || '');
    } else {
      setDestinatario(sugestao);
    }
    setSugestoesDestinatarios([]);
  };

  // ---------- FUNÇÕES PARA POPULAR LISTAS ----------
  const salvarMoradorNaLista = async (nome: string, bloco: string, apartamento: string) => {
    if (!perfil?.condominio_id) return;
    try {
      const { data: existing } = await supabase
        .from('lista_moradores')
        .select('id')
        .eq('nome', nome.trim())
        .eq('bloco', bloco.trim())
        .eq('apartamento', apartamento.trim())
        .eq('condominio_id', perfil.condominio_id)
        .maybeSingle();
      if (existing) return;
      await supabase.from('lista_moradores').insert({
        nome: nome.trim(),
        bloco: bloco.trim(),
        apartamento: apartamento.trim(),
        condominio_id: perfil.condominio_id,
      });
    } catch (error) {
      console.error('Erro ao salvar morador na lista:', error);
    }
  };

  const salvarPorteiroNaLista = async (nome: string) => {
    if (!perfil?.condominio_id || !nome.trim()) return;
    try {
      const { data: existing } = await supabase
        .from('lista_porteiros')
        .select('id')
        .eq('nome', nome.trim())
        .eq('condominio_id', perfil.condominio_id)
        .maybeSingle();
      if (existing) return;
      await supabase.from('lista_porteiros').insert({
        nome: nome.trim(),
        condominio_id: perfil.condominio_id,
      });
    } catch (error) {
      console.error('Erro ao salvar porteiro na lista:', error);
    }
  };

  const salvarRemetenteNaLista = async (nome: string) => {
    if (!perfil?.condominio_id || !nome.trim()) return;
    try {
      const { data: existing } = await supabase
        .from('lista_remetentes')
        .select('id')
        .eq('nome', nome.trim())
        .eq('condominio_id', perfil.condominio_id)
        .maybeSingle();
      if (existing) return;
      await supabase.from('lista_remetentes').insert({
        nome: nome.trim(),
        condominio_id: perfil.condominio_id,
      });
    } catch (error) {
      console.error('Erro ao salvar remetente na lista:', error);
    }
  };

  // ---------- CARREGAR DADOS DA ENCOMENDA ----------
  useEffect(() => {
    async function carregarEncomenda() {
      if (!encomendaId) return;
      setLoading(true);
      try {
        if (params.data) {
          try {
            const d = JSON.parse(params.data);
            setCodigoBarra(d.codigoBarra || '');
            setDestinatario(d.destinatario || '');
            setBloco(d.bloco || '');
            setApartamento(d.apartamento || '');
            setRemetente(d.remetente || '');
            setObservacoes(d.observacoes || '');
            setPorteiroEntrada(d.porteiro_entrada || '');
          } catch { }
        }

        let registro: any = null;
        const { data: enc } = await supabase.from('encomendas').select('*').eq('encomendas_id', encomendaId).maybeSingle();
        if (enc) {
          registro = enc;
        } else {
          const { data: hist } = await supabase.from('encomendas_historico').select('*').eq('id', encomendaId).maybeSingle();
          registro = hist;
        }

        if (registro) {
          if (perfil?.tipo_usuario === 'morador') {
            if (registro.apartamento !== perfil.apartamento || registro.bloco !== perfil.bloco) {
              Alert.alert('Acesso negado', 'Esta encomenda não pertence ao seu apartamento.');
              resetForm();
              setLoading(false);
              return;
            }
          }

          setCodigoBarra(registro.qr_code || '');
          setDestinatario(registro.destinatario || '');
          setBloco(registro.bloco || '');
          setApartamento(registro.apartamento || '');
          setRemetente(registro.remetente || '');
          setObservacoes(registro.observacoes || '');
          setPorteiroEntrada(registro.porteiro_entrada || '');
          setSavedSignature(registro.assinatura || null);
          setIsReadOnly(registro.status === 'retirada');
          setDeliveryData({
            nome_recebedor: registro.nome_recebedor || '',
            porteiro_entrega: registro.porteiro_entrega || '',
            data_retirada: registro.data_retirada || '',
          });
        }
      } catch (err) {
        console.error(err);
        Alert.alert('Erro', 'Não foi possível carregar os dados.');
      } finally {
        setLoading(false);
      }
    }
    if (encomendaId) carregarEncomenda();
    else resetForm();
  }, [encomendaId]);

  const resetForm = () => {
    setCodigoBarra('');
    setDestinatario('');
    setBloco('');
    setApartamento('');
    setRemetente('');
    setObservacoes('');
    setPorteiroEntrada('');
    setModoEdicao(false);
    setIsReadOnly(false);
    setSavedSignature(null);
    setDeliveryData({ nome_recebedor: '', porteiro_entrega: '', data_retirada: '' });
    router.setParams({ id: '' });
  };

  // ---------- CÂMERA ----------
  const handleAbrirCamera = async () => {
    if (!permission?.granted) {
      const resposta = await requestPermission();
      if (!resposta.granted) {
        Alert.alert('Permissão Negada', 'É necessário permitir o acesso à câmera para escanear códigos.');
        return;
      }
    }
    setCameraVisible(true);
  };

  const handleBarCodeScanned = ({ data }: { data: string }) => {
    setCameraVisible(false);
    setCodigoBarra(data);
  };

  const handleLimparForm = () => {
    resetForm();
    router.replace('/scanner');
  };

  // ---------- SALVAR ENCOMENDA ----------
  const handleSalvarEncomenda = async () => {
    if (!perfil) {
      Alert.alert('Erro', 'Usuário não autenticado.');
      return;
    }
    if (!perfil.condominio_id) {
      Alert.alert('Erro', 'Seu perfil não está associado a um condomínio.');
      return;
    }
    if (!destinatario || !apartamento) {
      Alert.alert('Atenção', 'Preencha destinatário e apartamento.');
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.from('encomendas').insert({
        qr_code: codigoBarra,
        destinatario: destinatario.toUpperCase().trim(),
        bloco: bloco.toUpperCase().trim(),
        apartamento: apartamento.trim(),
        remetente: remetente.toUpperCase().trim(),
        observacoes: observacoes.trim(),
        condominio_id: perfil.condominio_id,
        porteiro_entrada: porteiroEntrada.toUpperCase().trim() || 'Não informado',
        status: 'pendente',
      });
      if (error) throw error;

      await salvarMoradorNaLista(destinatario, bloco, apartamento);
      await salvarPorteiroNaLista(porteiroEntrada);
      await salvarRemetenteNaLista(remetente);

      Alert.alert('Sucesso', 'Encomenda cadastrada!');
      handleLimparForm();
    } catch (err: any) {
      Alert.alert('Erro', err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSalvarEdicao = async () => {
    if (!encomendaId) return;
    setLoading(true);
    try {
      const { error } = await supabase.from('encomendas').update({
        qr_code: codigoBarra,
        destinatario: destinatario.toUpperCase().trim(),
        bloco: bloco.toUpperCase().trim(),
        apartamento: apartamento.trim(),
        remetente: remetente.toUpperCase().trim(),
        observacoes: observacoes.trim(),
        porteiro_entrada: porteiroEntrada.toUpperCase().trim() || 'Não informado',
      }).eq('encomendas_id', encomendaId);

      if (error) throw error;

      await salvarMoradorNaLista(destinatario, bloco, apartamento);
      await salvarPorteiroNaLista(porteiroEntrada);
      await salvarRemetenteNaLista(remetente);

      Alert.alert('Sucesso', 'Encomenda atualizada!');
      setModoEdicao(false);
    } catch (err: any) {
      Alert.alert('Erro', err.message);
    } finally {
      setLoading(false);
    }
  };

  // ---------- ENTREGA ----------
  const handleEfetuarEntrega = async (signature: string, nomeRecebedor: string, porteiroEntrega: string) => {
    if (!encomendaId) return;
    setLoading(true);
    try {
      const { data: encomenda, error: fetchError } = await supabase
        .from('encomendas')
        .select('*')
        .eq('encomendas_id', encomendaId)
        .single();
      if (fetchError || !encomenda) throw new Error('Encomenda não encontrada');

      const fileName = `assinaturas/sig_${encomendaId}_${Date.now()}.png`;
      const { error: uploadError } = await supabase.storage
        .from('assinaturas')
        .upload(fileName, decode(signature.replace('data:image/png;base64,', '')), {
          contentType: 'image/png',
          upsert: true,
        });
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from('assinaturas').getPublicUrl(fileName);

      const { encomendas_id, ...dadosSemId } = encomenda;

      const historico = {
        ...dadosSemId,
        id: encomendas_id,
        status: 'retirada',
        nome_recebedor: nomeRecebedor.toUpperCase().trim(),
        porteiro_entrega: porteiroEntrega.toUpperCase().trim() || 'Não informado',
        assinatura: urlData.publicUrl,
        data_retirada: new Date().toISOString(),
      };

      const { error: insertError } = await supabase
        .from('encomendas_historico')
        .insert([historico]);
      if (insertError) throw insertError;

      const { error: deleteError } = await supabase
        .from('encomendas')
        .delete()
        .eq('encomendas_id', encomendaId);
      if (deleteError) throw deleteError;

      setSavedSignature(urlData.publicUrl);
      setDeliveryData({
        nome_recebedor: nomeRecebedor,
        porteiro_entrega: porteiroEntrega,
        data_retirada: historico.data_retirada,
      });
      setIsReadOnly(true);
      setShowSignatureModal(false);
      Alert.alert('Sucesso', 'Encomenda entregue e movida para o histórico.');
      router.replace('/encomendas');
    } catch (err: any) {
      Alert.alert('Erro', err.message);
    } finally {
      setLoading(false);
    }
  };

  // ---------- PDF ----------
  const gerarPDF = async () => {
    setLoading(true);
    try {
      const html = `
        <html>
          <body style="font-family: sans-serif; padding: 20px; color: #333;">
            <div style="text-align: center; border-bottom: 2px solid #10B981; padding-bottom: 10px; margin-bottom: 20px;">
              <h1 style="margin: 0; color: #10B981;">Comprovante de Entrega</h1>
              <p style="margin: 5px 0; color: #666;">Protocolo Digital de Encomendas</p>
            </div>

            <div style="margin-bottom: 20px; border: 1px solid #eee; padding: 15px; border-radius: 10px;">
              <h3 style="margin-top: 0; color: #1974f4; border-bottom: 1px solid #eee; padding-bottom: 5px;">DADOS DA ENCOMENDA</h3>
              <p><b>CÓDIGO QR:</b> ${codigoBarra}</p>
              <p><b>REMETENTE:</b> ${remetente || 'Não informado'}</p>
              <p><b>CHEGADA:</b> ${new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}</p>
              <p><b>OBSERVAÇÕES:</b> ${observacoes || 'Nenhuma'}</p>
              <p><b>PORTEIRO (ENTRADA):</b> ${porteiroEntrada || 'Não informado'}</p>
            </div>

            <div style="margin-bottom: 20px; border: 1px solid #eee; padding: 15px; border-radius: 10px;">
              <h3 style="margin-top: 0; color: #1974f4; border-bottom: 1px solid #eee; padding-bottom: 5px;">DESTINATÁRIO</h3>
              <p><b>MORADOR:</b> ${destinatario}</p>
              <p><b>UNIDADE:</b> Bloco ${bloco} - Apto ${apartamento}</p>
            </div>

            <div style="margin-bottom: 20px; background-color: #f9f9f9; border: 1px solid #ddd; padding: 15px; border-radius: 10px;">
              <h3 style="margin-top: 0; color: #10B981; border-bottom: 1px solid #ddd; padding-bottom: 5px;">CONFIRMAÇÃO DE RETIRADA</h3>
              <p><b>RETIRADO POR:</b> ${deliveryData.nome_recebedor}</p>
              <p><b>PORTEIRO (ENTREGA):</b> ${deliveryData.porteiro_entrega || 'Não informado'}</p>
              <p><b>DATA DA RETIRADA:</b> ${new Date(deliveryData.data_retirada).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}</p>
            </div>

            <div style="margin-top: 40px; text-align: center;">
              <p style="font-size: 12px; color: #999; margin-bottom: 10px;">ASSINATURA DIGITAL DO RECEBEDOR</p>
              <img src="${savedSignature}" style="width: 350px; border: 1px solid #eee; background: #fff;" />
            </div>

            <div style="margin-top: 50px; text-align: center; font-size: 10px; color: #aaa; border-top: 1px solid #eee; padding-top: 10px;">
              Documento digital gerado pelo sistema.
            </div>
          </body>
        </html>`;
      const { uri } = await Print.printToFileAsync({ html });
      await Sharing.shareAsync(uri);
    } catch (e) {
      Alert.alert('Erro PDF', 'Não foi possível gerar o comprovante.');
    } finally {
      setLoading(false);
    }
  };

  if (loading && !showSignatureModal) {
    return <View style={styles.loadingCenter}><ActivityIndicator size="large" color="#1974f4" /></View>;
  }

  const isVisualizacao = !!encomendaId;
  const campoEditavel = (!isVisualizacao || modoEdicao) && perfil?.tipo_usuario !== 'morador';
  const podeEntregar = isVisualizacao && !isReadOnly && perfil?.tipo_usuario !== 'morador';

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
    >
      <ScrollView
        style={[styles.container, { paddingTop: insets.top }]}
        contentContainerStyle={{ paddingBottom: 120 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={true}
      >
        <View style={styles.headerRow}>
          <Text style={styles.title}>{!isVisualizacao ? 'Novo Cadastro' : modoEdicao ? 'Editando' : 'Detalhes'}</Text>
          {isVisualizacao && perfil?.tipo_usuario !== 'morador' && (
            <TouchableOpacity style={[styles.btnEditar, modoEdicao && styles.btnEditarAtivo]} onPress={() => setModoEdicao(v => !v)}>
              <MaterialCommunityIcons name={modoEdicao ? 'close' : 'pencil-outline'} size={18} color={modoEdicao ? '#ef4444' : '#1974f4'} />
              <Text style={[styles.btnEditarText, modoEdicao && { color: '#ef4444' }]}>{modoEdicao ? 'CANCELAR' : 'EDITAR'}</Text>
            </TouchableOpacity>
          )}
        </View>

        {isReadOnly ? (
          <View style={styles.receiptContainer}>
            <MaterialIcons name="check-circle" size={60} color="#10B981" />
            <Text style={styles.receiptTitle}>ENTREGA CONCLUÍDA</Text>
            <View style={styles.receiptSection}>
              <View style={styles.receiptDataCard}>
                <Text style={styles.receiptLabel}>DADOS DO REGISTRO</Text>
                <Text style={styles.receiptText}><Text style={styles.bold}>QR Code:</Text> {codigoBarra}</Text>
                <Text style={styles.receiptText}><Text style={styles.bold}>Morador:</Text> {destinatario}</Text>
                <Text style={styles.receiptText}><Text style={styles.bold}>Unidade:</Text> {bloco} - {apartamento}</Text>
                <Text style={styles.receiptText}><Text style={styles.bold}>Remetente:</Text> {remetente || 'N/A'}</Text>
                <Text style={styles.receiptText}><Text style={styles.bold}>Porteiro (Entrada):</Text> {porteiroEntrada || 'Não informado'}</Text>
              </View>
              <View style={[styles.receiptDataCard, { marginTop: 15, borderColor: '#10B981' }]}>
                <Text style={[styles.receiptLabel, { color: '#10B981' }]}>DADOS DA RETIRADA</Text>
                <Text style={styles.receiptText}><Text style={styles.bold}>Retirado por:</Text> {deliveryData.nome_recebedor}</Text>
                <Text style={styles.receiptText}><Text style={styles.bold}>Porteiro (Entrega):</Text> {deliveryData.porteiro_entrega || 'Não informado'}</Text>
                <Text style={styles.receiptText}><Text style={styles.bold}>Data Retirada:</Text> {new Date(deliveryData.data_retirada).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}</Text>
              </View>
            </View>
            {savedSignature && (
              <View style={styles.sigPreviewContainer}>
                <Text style={styles.sigLabel}>Assinatura Digital:</Text>
                <Image source={{ uri: savedSignature }} style={styles.receiptSig} resizeMode="contain" />
              </View>
            )}
            <TouchableOpacity style={styles.pdfBtn} onPress={gerarPDF}>
              <MaterialIcons name="picture-as-pdf" size={20} color="#FFF" style={{ marginRight: 8 }} />
              <Text style={styles.btnTxt}>COMPARTILHAR COMPROVANTE</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.btnNew} onPress={handleLimparForm}>
              <Text style={styles.btnNewTxt}>VOLTAR AO INÍCIO</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.formCard}>
            <Text style={styles.label}>CÓDIGO DE BARRAS / QR CODE</Text>
            <View style={styles.inputRow}>
              <TextInput
                style={[styles.input, { flex: 1 }, !campoEditavel && styles.disabledInput]}
                placeholder="Código..."
                value={codigoBarra}
                onChangeText={setCodigoBarra}
                editable={campoEditavel}
              />
              {campoEditavel && (
                <TouchableOpacity style={styles.scanButton} onPress={handleAbrirCamera}>
                  <MaterialCommunityIcons name="qrcode-scan" size={22} color="#fff" />
                </TouchableOpacity>
              )}
            </View>

            <AutocompleteInput
              label="NOME DO DESTINATÁRIO *"
              value={destinatario}
              suggestions={sugestoesDestinatarios}
              onChangeText={(text: string) => {
                setDestinatario(text);
                buscarSugestoes('destinatario', text, setSugestoesDestinatarios);
              }}
              onSelectSuggestion={handleSelectDestinatario}
              containerStyle={{ zIndex: 100 }}
            />

            <View style={styles.gridRow}>
              <View style={{ flex: 1, marginRight: 10 }}>
                <Text style={styles.label}>BLOCO *</Text>
                <TextInput
                  style={[styles.input, !campoEditavel && styles.disabledInput]}
                  placeholder="Ex: A"
                  value={bloco}
                  onChangeText={setBloco}
                  editable={campoEditavel}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>APARTAMENTO *</Text>
                <TextInput
                  style={[styles.input, !campoEditavel && styles.disabledInput]}
                  placeholder="Ex: 102"
                  value={apartamento}
                  onChangeText={setApartamento}
                  keyboardType="numeric"
                  editable={campoEditavel}
                />
              </View>
            </View>

            <AutocompleteInput
              label="EMPRESA / REMETENTE"
              value={remetente}
              suggestions={sugestoesRemetentes}
              onChangeText={(text: string) => {
                setRemetente(text);
                buscarSugestoes('remetente', text, setSugestoesRemetentes);
              }}
              onSelectSuggestion={(item: string) => {
                setRemetente(item);
                setSugestoesRemetentes([]);
              }}
              containerStyle={{ zIndex: 80 }}
            />

            <Text style={styles.label}>OBSERVAÇÕES</Text>
            <TextInput
              style={[styles.input, styles.textArea, !campoEditavel && styles.disabledInput]}
              placeholder="Pacote, carta..."
              value={observacoes}
              onChangeText={setObservacoes}
              multiline
              numberOfLines={3}
              editable={campoEditavel}
            />

            <AutocompleteInput
              label="PORTEIRO (ENTRADA)"
              value={porteiroEntrada}
              suggestions={sugestoesPorteiros}
              onChangeText={(text: string) => {
                setPorteiroEntrada(text);
                buscarSugestoes('porteiro', text, setSugestoesPorteiros);
              }}
              onSelectSuggestion={(item: string) => {
                setPorteiroEntrada(item);
                setSugestoesPorteiros([]);
              }}
              containerStyle={{ zIndex: 60 }}
            />

            {!isVisualizacao && (
              <TouchableOpacity style={styles.btnSalvar} onPress={handleSalvarEncomenda}>
                <MaterialCommunityIcons name="content-save" size={22} color="#fff" />
                <Text style={styles.btnSalvarText}>SALVAR ENCOMENDA</Text>
              </TouchableOpacity>
            )}

            {isVisualizacao && modoEdicao && (
              <TouchableOpacity style={[styles.btnSalvar, { backgroundColor: '#0369a1' }]} onPress={handleSalvarEdicao}>
                <MaterialCommunityIcons name="content-save-check" size={22} color="#fff" />
                <Text style={styles.btnSalvarText}>SALVAR ALTERAÇÕES</Text>
              </TouchableOpacity>
            )}

            {podeEntregar && (
              <View style={styles.acoesRow}>
                <TouchableOpacity
                  style={[styles.btnSalvar, { flex: 1, backgroundColor: '#2e7d32', marginTop: 0 }]}
                  onPress={() => setShowSignatureModal(true)}
                >
                  <MaterialCommunityIcons name="package-variant-closed" size={20} color="#fff" />
                  <Text style={styles.btnSalvarText}>REALIZAR ENTREGA</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.btnExcluir, { backgroundColor: '#f1f5f9', borderColor: '#cbd5e1', marginTop: 0 }]}
                  onPress={handleLimparForm}
                >
                  <MaterialCommunityIcons name="broom" size={22} color="#475569" />
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

        {showSignatureModal && (
          <SignaturePad
            visible={showSignatureModal}
            onClose={() => setShowSignatureModal(false)}
            onSignature={handleEfetuarEntrega}
          />
        )}

        <Modal visible={cameraVisible} animationType="slide" onRequestClose={() => setCameraVisible(false)}>
          <View style={styles.cameraContainer}>
            <CameraViewComponent
              style={StyleSheet.absoluteFillObject}
              onBarcodeScanned={handleBarCodeScanned}
            />
            <TouchableOpacity style={styles.closeCameraBtn} onPress={() => setCameraVisible(false)}>
              <MaterialCommunityIcons name="close-circle" size={54} color="#fff" />
            </TouchableOpacity>
          </View>
        </Modal>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ced5df', paddingHorizontal: 12 },
  loadingCenter: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#ced5df' },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, marginTop: 16},
  title: { fontSize: 22, fontWeight: 'bold', color: '#0f172a', flexShrink: 1 },
  btnEditar: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8, borderWidth: 1.5, borderColor: '#1974f4', backgroundColor: '#eff6ff' },
  btnEditarAtivo: { borderColor: '#ef4444', backgroundColor: '#fff1f2' },
  btnEditarText: { fontSize: 12, fontWeight: 'bold', color: '#1974f4' },

  formCard: { backgroundColor: '#fff', borderRadius: 16, padding: 20, elevation: 3 },

  // === ESTILOS DE LABEL E INPUT PADRONIZADOS ===
  label: { 
    fontSize: 12, 
    fontWeight: 'bold', 
    color: '#1a1b1c', 
    marginBottom: 8, 
    marginTop: 8  // espaçamento vertical consistente
  },

  input: { 
    backgroundColor: '#f8fafc', 
    borderWidth: 1, 
    borderColor: '#2f3134', 
    borderRadius: 10, 
    paddingHorizontal: 14, 
    height: 50, 
    fontSize: 15, 
    color: '#0f172a',
    marginBottom: 8 // espaço entre inputs
  },

  disabledInput: { 
    backgroundColor: '#e2e8f0', 
    borderColor: '#2f3134', 
    color: '#475569' 
  },

  inputRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 10,
    marginBottom: 8
  },

  scanButton: { 
    backgroundColor: '#1974f4', 
    width: 48, 
    height: 48, 
    borderRadius: 10, 
    justifyContent: 'center', 
    alignItems: 'center' 
  },

  gridRow: { 
    flexDirection: 'row', 
    justifyContent: 'space-between',
    gap: 12
  },

  textArea: { 
    height: 80, 
    paddingTop: 14, 
    textAlignVertical: 'top',
    marginBottom: 8
  },

  acoesRow: { 
    flexDirection: 'row', 
    gap: 10, 
    marginTop: 25 
  },

  btnSalvar: { 
    backgroundColor: '#1974f4', 
    height: 52, 
    borderRadius: 10, 
    flexDirection: 'row', 
    justifyContent: 'center', 
    alignItems: 'center', 
    gap: 10, 
    marginTop: 25, 
    elevation: 3 
  },

  btnSalvarText: { 
    color: '#fff', 
    fontWeight: 'bold', 
    fontSize: 15 
  },

  btnExcluir: { 
    width: 52, 
    height: 52, 
    borderRadius: 10, 
    justifyContent: 'center', 
    alignItems: 'center', 
    backgroundColor: '#fff1f2', 
    borderWidth: 1.5, 
    borderColor: '#fca5a5' 
  },

  cameraContainer: { 
    flex: 1, 
    backgroundColor: '#000', 
    justifyContent: 'flex-end', 
    alignItems: 'center' 
  },

  closeCameraBtn: { 
    marginBottom: 40, 
    backgroundColor: 'rgba(229, 23, 23, 0.86)', 
    borderRadius: 30, 
    padding: 2 
  },

  // =================== ESTILOS DO COMPROVANTE ===================
  receiptContainer: { 
    backgroundColor: '#fff', 
    padding: 20, 
    borderRadius: 20, 
    alignItems: 'center', 
    elevation: 5 
  },

  receiptTitle: { 
    fontSize: 22, 
    fontWeight: 'bold', 
    marginVertical: 10, 
    color: '#10B981' 
  },

  receiptSection: { 
    width: '100%', 
    marginTop: 10 
  },

  receiptDataCard: { 
    borderLeftWidth: 4, 
    borderLeftColor: '#1974f4', 
    paddingLeft: 15, 
    paddingVertical: 5 
  },

  receiptLabel: { 
    fontSize: 10, 
    fontWeight: 'bold', 
    color: '#1974f4', 
    marginBottom: 5 
  },

  receiptText: { 
    fontSize: 14, 
    color: '#334155', 
    marginBottom: 2 
  },

  sigPreviewContainer: { 
    width: '100%', 
    alignItems: 'center', 
    marginTop: 20 
  },

  sigLabel: { 
    fontSize: 11, 
    color: '#94a3b8', 
    marginBottom: 5 
  },

  bold: { fontWeight: 'bold' },

  receiptSig: { 
    width: '100%', 
    height: 120, 
    backgroundColor: '#f1f5f9', 
    borderRadius: 10 
  },

  pdfBtn: {
    backgroundColor: '#ef4444',
    padding: 15,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
    marginTop: 25,
    flexDirection: 'row',
    justifyContent: 'center',
  },

  btnTxt: { 
    color: '#fff', 
    fontWeight: 'bold', 
    fontSize: 15 
  },

  btnNew: { 
    marginTop: 15, 
    padding: 10 
  },

  btnNewTxt: { 
    color: '#1974f4', 
    fontWeight: 'bold' 
  },
});