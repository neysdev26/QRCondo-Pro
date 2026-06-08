import React, { useState, useEffect, useRef } from 'react';
import { 
  View, Text, StyleSheet, ScrollView, TextInput, Alert, 
  TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform, Modal, Image 
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { decode } from 'base64-arraybuffer';
import { CameraView, useCameraPermissions } from 'expo-camera'; 
import { Audio } from 'expo-av';
import AutocompleteInput from '../../components/ui/AutocompleteInput';
import SignaturePad from '../../components/SignaturePad';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

export default function ScannerPage() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams();

  const [permission, requestPermission] = useCameraPermissions();
  const [showScanner, setShowScanner] = useState(false);
  const [showSigModal, setShowSigModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isReadOnly, setIsReadOnly] = useState(false);
  const [scanned, setScanned] = useState(false);
  const [savedSignature, setSavedSignature] = useState<string | null>(null);

  const [sugestoesDestinatarios, setSugestoesDestinatarios] = useState<string[]>([]);
  const [sugestoesRemetentes, setSugestoesRemetentes] = useState<string[]>([]);
  const [sugestoesPorteiros, setSugestoesPorteiros] = useState<string[]>([]);

  const [formData, setFormData] = useState({
    qr_code: '', destinatario: '', bloco: '', apartamento: '', remetente: '', porteiro: '', observacoes: '', data_chegada: '' 
  });

  const [deliveryData, setDeliveryData] = useState({
    nome_recebedor: '', porteiro_entrega: '', data_retirada: ''
  });

  async function playBeep() {
    try {
      const { sound } = await Audio.Sound.createAsync(require('../../assets/sounds/beep.mp3'));
      await sound.playAsync();
      sound.setOnPlaybackStatusUpdate((status) => { if (status.isLoaded && status.didJustFinish) sound.unloadAsync(); });
    } catch (e) { console.log("Erro som"); }
  }

  const buscarSugestoes = async (campo: keyof typeof formData, texto: string, setSugestoes: (val: string[]) => void) => {
    if (isReadOnly) return;
    setFormData(prev => ({ ...prev, [campo]: texto }));
    if (texto.length >= 2) {
      let tabela = '', coluna = '';
      if (campo === 'destinatario') { tabela = 'lista_moradores'; coluna = 'nome'; }
      else if (campo === 'remetente') { tabela = 'lista_remetentes'; coluna = 'nome'; }
      else if (campo === 'porteiro') { tabela = 'lista_porteiros'; coluna = 'nome'; }

      if (!tabela) return;
      try {
        let { data, error } = await supabase.from(tabela).select('*').ilike(coluna, `%${texto}%`).limit(10);
        if (data && !error) {
          if (campo === 'destinatario') {
            const formatados = data.map((i: any) => `${i.nome || i.destinatario} - Bloco ${i.bloco || ''} - Ap ${i.apartamento || ''}`);
            setSugestoes(Array.from(new Set(formatados)));
          } else {
            setSugestoes(data.map((i: any) => i.nome || i[campo]).filter(Boolean));
          }
        }
      } catch (err) { console.error(err); }
    } else { setSugestoes([]); }
  };

  const handleSelectDestinatario = (sugestao: string) => {
    const partes = sugestao.split(' - ');
    setFormData(prev => ({ 
      ...prev, 
      destinatario: partes[0], 
      bloco: partes[1]?.replace('Bloco ', '') || '', 
      apartamento: partes[2]?.replace('Ap ', '') || '' 
    }));
    setSugestoesDestinatarios([]);
  };

  useEffect(() => {
    if (params.id) loadEncomendaData(params.id as string);
    else resetForm();
  }, [params.id]);

  const loadEncomendaData = async (id: string) => {
    setLoading(true);
    try {
      let { data } = await supabase.from('encomendas').select('*').eq('id', id).maybeSingle();
      if (!data) {
        const { data: hist } = await supabase.from('encomendas_historico').select('*').eq('id', id).maybeSingle();
        data = hist;
      }
      if (data) {
        setFormData({
          qr_code: data.qr_code || '', destinatario: data.destinatario || '', bloco: data.bloco || '',
          apartamento: data.apartamento?.toString() || '', remetente: data.remetente || '',
          observacoes: data.observacoes || '', porteiro: data.porteiro || '', data_chegada: data.data_chegada || ''
        });
        setDeliveryData({
          nome_recebedor: data.nome_recebedor || '',
          porteiro_entrega: data.porteiro_entrega || '',
          data_retirada: data.data_retirada || ''
        });
        setSavedSignature(data.assinatura || null);
        setIsEditing(data.status !== 'retirada');
        setIsReadOnly(data.status === 'retirada');
      }
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  const resetForm = () => {
    setFormData({ qr_code: '', destinatario: '', bloco: '', apartamento: '', remetente: '', porteiro: '', observacoes: '', data_chegada: '' });
    setDeliveryData({ nome_recebedor: '', porteiro_entrega: '', data_retirada: '' });
    setSavedSignature(null);
    setIsEditing(false);
    setIsReadOnly(false);
    router.setParams({ id: '' });
  };

  const handleBarCodeScanned = async ({ data }: { data: string }) => {
    if (scanned) return;
    setScanned(true);
    playBeep(); 
    const { data: existente } = await supabase.from('encomendas').select('id').eq('qr_code', data).maybeSingle();
    if (existente) router.setParams({ id: existente.id });
    else setFormData({ ...formData, qr_code: data });
    setShowScanner(false);
    setScanned(false);
  };

  const handleSaveOrUpdate = async () => {
    if (!formData.qr_code.trim() || !formData.destinatario.trim() || !formData.bloco.trim() || !formData.apartamento.trim() || !formData.porteiro.trim()) {
      Alert.alert("Campos Obrigatórios", "Preencha todos os campos com (*).");
      return;
    }
    setLoading(true);
    const dataFinal = {
      ...formData,
      destinatario: formData.destinatario.toUpperCase().trim(),
      bloco: formData.bloco.toUpperCase().trim(),
      remetente: formData.remetente.toUpperCase().trim(),
      porteiro: formData.porteiro.toUpperCase().trim()
    };
    try {
      if (isEditing) {
        const { data_chegada, ...updateData } = dataFinal;
        await supabase.from('encomendas').update(updateData).eq('id', params.id);
        Alert.alert("Sucesso", "Dados atualizados.");
      } else {
        await supabase.from('encomendas').insert([{ ...dataFinal, status: 'pendente', data_chegada: new Date().toISOString() }]);
        Alert.alert("Sucesso", "Entrada registada.");
      }
      resetForm(); 
    } catch (err: any) { Alert.alert("Erro", err.message); }
    finally { setLoading(false); }
  };

  const handleSignatureConfirm = async (signature: string, nomeRec: string, porteiroEnt: string) => {
    setLoading(true);
    try {
      const fileName = `assinaturas/sig_${params.id}_${Date.now()}.png`;
      const { error: uploadError } = await supabase.storage.from('assinaturas').upload(
        fileName, 
        decode(signature.replace('data:image/png;base64,', '')), 
        { contentType: 'image/png', upsert: true }
      );
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from('assinaturas').getPublicUrl(fileName);
      const dataRetirada = new Date().toISOString();
      
      const { error: updateError } = await supabase.from('encomendas').update({
        nome_recebedor: nomeRec.toUpperCase().trim(),
        porteiro_entrega: porteiroEnt.toUpperCase().trim(),
        assinatura: urlData.publicUrl,
        status: 'retirada',
        data_retirada: dataRetirada
      }).eq('id', params.id);
      
      if (updateError) throw updateError;

      setSavedSignature(urlData.publicUrl);
      setDeliveryData({
        nome_recebedor: nomeRec,
        porteiro_entrega: porteiroEnt,
        data_retirada: dataRetirada
      });
      setIsReadOnly(true);
      setShowSigModal(false);
    } catch (err: any) { Alert.alert("Erro", err.message); }
    finally { setLoading(false); }
  };

  // PDF COMPLETO COM TODOS OS DADOS DO REGISTRO
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
            <h3 style="margin-top: 0; color: #1974f4; border-bottom: 1px solid #eee; padding-bottom: 5px;">1. DADOS DA ENCOMENDA</h3>
            <p><b>CÓDIGO QR / RASTREIO:</b> ${formData.qr_code}</p>
            <p><b>REMETENTE:</b> ${formData.remetente || 'Não informado'}</p>
            <p><b>CHEGADA NA PORTARIA:</b> ${new Date(formData.data_chegada).toLocaleString('pt-BR')}</p>
            <p><b>PORTEIRO (RECEBIMENTO):</b> ${formData.porteiro}</p>
            <p><b>OBSERVAÇÕES:</b> ${formData.observacoes || 'Nenhuma'}</p>
          </div>

          <div style="margin-bottom: 20px; border: 1px solid #eee; padding: 15px; border-radius: 10px;">
            <h3 style="margin-top: 0; color: #1974f4; border-bottom: 1px solid #eee; padding-bottom: 5px;">2. DESTINATÁRIO</h3>
            <p><b>MORADOR:</b> ${formData.destinatario}</p>
            <p><b>UNIDADE:</b> Bloco ${formData.bloco} - Apto ${formData.apartamento}</p>
          </div>

          <div style="margin-bottom: 20px; background-color: #f9f9f9; border: 1px solid #ddd; padding: 15px; border-radius: 10px;">
            <h3 style="margin-top: 0; color: #10B981; border-bottom: 1px solid #ddd; padding-bottom: 5px;">3. CONFIRMAÇÃO DE RETIRADA</h3>
            <p><b>RETIRADO POR:</b> ${deliveryData.nome_recebedor}</p>
            <p><b>PORTEIRO (ENTREGA):</b> ${deliveryData.porteiro_entrega}</p>
            <p><b>DATA E HORA DA RETIRADA:</b> ${new Date(deliveryData.data_retirada).toLocaleString('pt-BR')}</p>
          </div>

          <div style="margin-top: 40px; text-align: center;">
            <p style="font-size: 12px; color: #999; margin-bottom: 10px;">ASSINATURA DIGITAL DO RECEBEDOR</p>
            <img src="${savedSignature}" style="width: 350px; border: 1px solid #eee; background: #fff;" />
          </div>

          <div style="margin-top: 50px; text-align: center; font-size: 10px; color: #aaa; border-top: 1px solid #eee; padding-top: 10px;">
            Este documento é um registro digital gerado pelo sistema de portaria.
          </div>
        </body>
      </html>`;

      const { uri } = await Print.printToFileAsync({ html });
      await Sharing.shareAsync(uri);
    } catch (e) { 
      Alert.alert("Erro PDF", "Não foi possível gerar o comprovante."); 
    } finally { 
      setLoading(false); 
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
      {loading && <View style={styles.loadingOverlay}><ActivityIndicator size="large" color="#1974f4" /></View>}
      <ScrollView style={[styles.container, { paddingTop: insets.top }]} keyboardShouldPersistTaps="always">
        {!isReadOnly ? (
          <View style={styles.card}>
            <View style={styles.headerRow}>
              <Text style={styles.title}>{isEditing ? "Editar Registro" : "Nova Encomenda"}</Text>
              {isEditing && <TouchableOpacity onPress={resetForm} style={styles.newBtn}><Text style={styles.newBtnTxt}>NOVO</Text></TouchableOpacity>}
            </View>
            
            <Text style={styles.label}>CÓDIGO *</Text>
            <View style={styles.row}>
              <TextInput style={[styles.input, { flex: 1 }]} value={formData.qr_code} onChangeText={t => setFormData({...formData, qr_code: t})} />
              <TouchableOpacity style={styles.scanBtn} onPress={() => setShowScanner(true)}><MaterialIcons name="qr-code-scanner" size={24} color="#FFF" /></TouchableOpacity>
            </View>
            
            <AutocompleteInput 
              label="DESTINATÁRIO *" 
              value={formData.destinatario} 
              suggestions={sugestoesDestinatarios} 
              onChangeText={(t) => buscarSugestoes('destinatario', t, setSugestoesDestinatarios)} 
              onSelectSuggestion={handleSelectDestinatario} 
              containerStyle={{ zIndex: 100 }} 
            />

            <View style={styles.row}>
              <View style={{ flex: 1, marginRight: 10 }}>
                <Text style={styles.label}>BLOCO *</Text>
                <TextInput style={styles.input} value={formData.bloco} onChangeText={t => setFormData({...formData, bloco: t})} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>APARTAMENTO *</Text>
                <TextInput style={styles.input} keyboardType="numeric" value={formData.apartamento} onChangeText={t => setFormData({...formData, apartamento: t})} />
              </View>
            </View>

            <AutocompleteInput 
              label="REMETENTE" 
              value={formData.remetente} 
              suggestions={sugestoesRemetentes} 
              onChangeText={(t) => buscarSugestoes('remetente', t, setSugestoesRemetentes)} 
              onSelectSuggestion={(v) => { setFormData(p => ({...p, remetente: v})); setSugestoesRemetentes([]); }} 
              containerStyle={{ zIndex: 80 }} 
            />

            <Text style={styles.label}>OBSERVAÇÕES</Text>
            <TextInput style={[styles.input, { height: 70 }]} multiline value={formData.observacoes} onChangeText={t => setFormData({...formData, observacoes: t})} />

            <AutocompleteInput 
              label="PORTEIRO (ENTRADA) *" 
              value={formData.porteiro} 
              suggestions={sugestoesPorteiros} 
              onChangeText={(t) => buscarSugestoes('porteiro', t, setSugestoesPorteiros)} 
              onSelectSuggestion={(v) => { setFormData(p => ({...p, porteiro: v})); setSugestoesPorteiros([]); }} 
              containerStyle={{ zIndex: 60 }} 
            />

            <TouchableOpacity style={styles.btnPrimary} onPress={handleSaveOrUpdate}><Text style={styles.btnTxt}>{isEditing ? "SALVAR ALTERAÇÕES" : "REGISTRAR ENTRADA"}</Text></TouchableOpacity>
            {isEditing && (
              <TouchableOpacity style={styles.btnDeliver} onPress={() => setShowSigModal(true)}>
                <MaterialIcons name="handshake" size={20} color="#FFF" style={{marginRight:8}} />
                <Text style={styles.btnTxt}>REALIZAR ENTREGA</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <View style={styles.receiptContainer}>
            <MaterialIcons name="check-circle" size={60} color="#10B981" />
            <Text style={styles.receiptTitle}>ENTREGA CONCLUÍDA</Text>
            
            <View style={styles.receiptSection}>
              <View style={styles.receiptDataCard}>
                <Text style={styles.receiptLabel}>DADOS DO REGISTRO</Text>
                <Text style={styles.receiptText}><Text style={styles.bold}>QR Code:</Text> {formData.qr_code}</Text>
                <Text style={styles.receiptText}><Text style={styles.bold}>Morador:</Text> {formData.destinatario}</Text>
                <Text style={styles.receiptText}><Text style={styles.bold}>Unidade:</Text> {formData.bloco} - {formData.apartamento}</Text>
                <Text style={styles.receiptText}><Text style={styles.bold}>Remetente:</Text> {formData.remetente || 'N/A'}</Text>
                <Text style={styles.receiptText}><Text style={styles.bold}>Porteiro Entrada:</Text> {formData.porteiro}</Text>
                <Text style={styles.receiptText}><Text style={styles.bold}>Entrada em:</Text> {new Date(formData.data_chegada).toLocaleString('pt-BR')}</Text>
              </View>

              <View style={[styles.receiptDataCard, { marginTop: 15, borderColor: '#10B981' }]}>
                <Text style={[styles.receiptLabel, { color: '#10B981' }]}>DADOS DA RETIRADA</Text>
                <Text style={styles.receiptText}><Text style={styles.bold}>Retirado por:</Text> {deliveryData.nome_recebedor}</Text>
                <Text style={styles.receiptText}><Text style={styles.bold}>Porteiro Entrega:</Text> {deliveryData.porteiro_entrega}</Text>
                <Text style={styles.receiptText}><Text style={styles.bold}>Data Retirada:</Text> {new Date(deliveryData.data_retirada).toLocaleString('pt-BR')}</Text>
              </View>
            </View>

            {savedSignature && (
               <View style={styles.sigPreviewContainer}>
                 <Text style={styles.sigLabel}>Assinatura Digital:</Text>
                 <Image source={{ uri: savedSignature }} style={styles.receiptSig} resizeMode="contain" />
               </View>
            )}

            <TouchableOpacity style={styles.pdfBtn} onPress={gerarPDF}>
              <MaterialIcons name="picture-as-pdf" size={20} color="#FFF" style={{marginRight: 8}} />
              <Text style={styles.btnTxt}>COMPARTILHAR COMPROVANTE</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.btnNew} onPress={resetForm}>
              <Text style={styles.btnNewTxt}>VOLTAR AO INÍCIO</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      <SignaturePad 
        visible={showSigModal}
        onClose={() => setShowSigModal(false)}
        onSignature={handleSignatureConfirm}
      />

      <Modal visible={showScanner} animationType="fade">
        <CameraView style={{flex:1}} onBarcodeScanned={handleBarCodeScanned}>
          <TouchableOpacity style={styles.closeCamera} onPress={() => setShowScanner(false)}>
            <MaterialIcons name="close" size={40} color="#FFF" />
          </TouchableOpacity>
        </CameraView>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#b5bcc7' },
  loadingOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.4)', zIndex: 999, justifyContent: 'center', alignItems: 'center' },
  card: { backgroundColor: '#bdc9d0', padding: 15, margin: 10, borderRadius: 15 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 },
  title: { fontSize: 20, fontWeight: 'bold' },
  newBtn: { backgroundColor: '#cbd5e1', padding: 8, borderRadius: 10 },
  newBtnTxt: { fontWeight: 'bold', fontSize: 12 },
  label: { fontSize: 11, fontWeight: 'bold', marginBottom: 5 },
  input: { backgroundColor: '#f8fafc', padding: 12, borderRadius: 10, borderWidth: 1, borderColor: '#d6d9dd', marginBottom: 15 },
  row: { flexDirection: 'row', alignItems: 'center' },
  scanBtn: { backgroundColor: '#1974f4', padding: 12, borderRadius: 10, marginLeft: 10, marginBottom: 15 },
  btnPrimary: { backgroundColor: '#66b65e', padding: 15, borderRadius: 12, alignItems: 'center' },
  btnDeliver: { backgroundColor: '#10B981', padding: 15, borderRadius: 12, marginTop: 10, alignItems: 'center', flexDirection: 'row', justifyContent: 'center' },
  btnTxt: { color: '#FFF', fontWeight: 'bold' },
  
  receiptContainer: { backgroundColor: '#FFF', padding: 20, margin: 15, borderRadius: 20, alignItems: 'center', elevation: 5 },
  receiptTitle: { fontSize: 22, fontWeight: 'bold', marginVertical: 10, color: '#10B981' },
  receiptSection: { width: '100%', marginTop: 10 },
  receiptDataCard: { borderLeftWidth: 4, borderLeftColor: '#1974f4', paddingLeft: 15, paddingVertical: 5 },
  receiptLabel: { fontSize: 10, fontWeight: 'bold', color: '#1974f4', marginBottom: 5 },
  receiptText: { fontSize: 14, color: '#334155', marginBottom: 2 },
  sigPreviewContainer: { width: '100%', alignItems: 'center', marginTop: 20 },
  sigLabel: { fontSize: 11, color: '#94a3b8', marginBottom: 5 },
  bold: { fontWeight: 'bold' },
  receiptSig: { width: '100%', height: 120, backgroundColor: '#f1f5f9', borderRadius: 10 },
  pdfBtn: { backgroundColor: '#ef4444', padding: 15, borderRadius: 12, width: '100%', alignItems: 'center', marginTop: 25, flexDirection: 'row', justifyContent: 'center' },
  btnNew: { marginTop: 15, padding: 10 },
  btnNewTxt: { color: '#1974f4', fontWeight: 'bold' },
  closeCamera: { position: 'absolute', top: 50, right: 20 }
});