import React, { useRef } from 'react';
import { View, Text, Modal, TextInput, TouchableOpacity, StyleSheet, SafeAreaView } from 'react-native';
import SignatureScreen from 'react-native-signature-canvas';

export default function SignaturePad({ visible, onClose, onSignature }: any) {
  const [nomeRecebedor, setNomeRecebedor] = React.useState('');
  const [nomePorteiro, setNomePorteiro] = React.useState('');
  const ref = useRef<any>(null);

  const style = `
  .m-signature-pad { 
    background-color: transparent; 
    width: 100%; 
    height: 100%; 
  }
  .m-signature-pad--body { border: none; }
  .m-signature-pad--footer { display: none; }
  body, html { width: 100%; height: 100%; margin: 0; padding: 0; overflow: hidden; }
`;

  return (
    <Modal visible={visible} animationType="slide" transparent={false}>
      <SafeAreaView style={styles.container}>
        
        <Text style={styles.title}>Confirmar Entrega</Text>

        {/* Botão Voltar no topo */}
        <TouchableOpacity style={styles.btnVoltar} onPress={onClose}>
          <Text style={styles.btnText}>VOLTAR</Text>
        </TouchableOpacity>
        
        <TextInput 
          style={styles.input} 
          placeholder="Nome do Recebedor" 
          value={nomeRecebedor} 
          onChangeText={setNomeRecebedor} 
        />
        <TextInput 
          style={styles.input} 
          placeholder="Nome do Porteiro" 
          value={nomePorteiro} 
          onChangeText={setNomePorteiro} 
        />

        {/* Área de assinatura 100% flexível */}
        <View style={styles.signatureContainer}>
          <SignatureScreen 
            ref={ref} 
            onOK={(sig) => onSignature(sig, nomeRecebedor, nomePorteiro)}
            webStyle={style}
            autoClear={false}
            dataURL={''}
            // Adicione estas propriedades para estabilidade no Android/iOS
            onBegin={() => console.log('Iniciou toque')}
            onEnd={() => console.log('Terminou toque')}
          />
        </View>

        {/* Botões no rodapé */}
        <View style={styles.buttonRow}>
          <TouchableOpacity style={[styles.btn, styles.btnLimpar]} onPress={() => ref.current?.clearSignature()}>
            <Text style={styles.btnText}>LIMPAR</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.btn, styles.btnConfirmar]} onPress={() => ref.current?.readSignature()}>
            <Text style={styles.btnText}>CONFIRMAR</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', padding: 15 },
  title: { fontSize: 22, fontWeight: 'bold', marginVertical: 10, textAlign: 'center' },
  input: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, padding: 15, marginBottom: 10, backgroundColor: '#f8fafc', fontSize: 16 },
  signatureContainer: { flex: 1, borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, marginVertical: 10, backgroundColor: '#fcfcfc' },
  buttonRow: { flexDirection: 'row', gap: 10, marginTop: 10 },
  btn: { padding: 20, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  btnVoltar: { backgroundColor: '#64748b', padding: 12, borderRadius: 8, alignItems: 'center', marginBottom: 10 },
  btnLimpar: { backgroundColor: '#f59e0b', flex: 1 },
  btnConfirmar: { backgroundColor: '#2e7d32', flex: 1 },
  btnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 }
});