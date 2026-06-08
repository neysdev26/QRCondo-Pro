import React, { useRef, useState, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, Alert, Platform, TextInput, SafeAreaView } from 'react-native';
import { WebView } from 'react-native-webview';
import { COLORS } from '../constants';
import CustomButton from './ui/CustomButton';

interface SignaturePadProps {
  visible: boolean;
  onClose: () => void;
  onSignature: (signature: string, nomeRecebedor: string, porteiroEntrega: string) => void;
}

export default function SignaturePad({ visible, onClose, onSignature }: SignaturePadProps) {
  const webViewRef = useRef<any>(null);
  const [loading, setLoading] = useState(false);
  const [nomeRecebedor, setNomeRecebedor] = useState('');
  const [porteiroEntrega, setPorteiroEntrega] = useState('');

  // Limpa os campos e recarrega o WebView ao abrir o modal
  useEffect(() => {
    if (visible) {
      setNomeRecebedor('');
      setPorteiroEntrega('');
      if (webViewRef.current) {
        webViewRef.current.reload();
      }
    }
  }, [visible]);

  const clearCanvas = () => {
    if (webViewRef.current) {
      webViewRef.current.injectJavaScript(`
        if (window.clearCanvas) {
          window.clearCanvas();
        }
        true;
      `);
    }
  };

  const saveCanvas = () => {
    if (!nomeRecebedor.trim() || !porteiroEntrega.trim()) {
      const msg = 'Preencha o nome do recebedor e do porteiro.';
      Platform.OS === 'web' ? window.alert(msg) : Alert.alert('Campos Obrigatórios', msg);
      return;
    }
    
    if (webViewRef.current) {
      setLoading(true);
      webViewRef.current.injectJavaScript(`
        if (window.saveCanvas) {
          window.saveCanvas();
        }
        true;
      `);
    }
  };

  const handleMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'signature') {
        setLoading(false);
        if (data.signature) {
          onSignature(data.signature, nomeRecebedor, porteiroEntrega);
          setNomeRecebedor('');
          setPorteiroEntrega('');
        } else {
          const msg = 'Por favor, assine antes de salvar.';
          Platform.OS === 'web' ? window.alert(msg) : Alert.alert('Atenção', msg);
        }
      }
    } catch (error) {
      setLoading(false);
    }
  };

  const signatureHTML = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
      <style>
        body { margin: 0; padding: 0; background: #fff; overflow: hidden; height: 100vh; width: 100vw; }
        canvas { 
          touch-action: none; 
          width: 100%; 
          height: 100%; 
          background: #fff; 
          cursor: crosshair;
          image-rendering: optimizeQuality;
          will-change: transform;
        }
        .hint { position: absolute; top: 10px; width: 100%; text-align: center; color: #ccc; font-family: sans-serif; pointer-events: none; text-transform: uppercase; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="hint">Assine na área branca abaixo</div>
      <canvas id="canvas"></canvas>
      <script>
        const canvas = document.getElementById('canvas');
        const ctx = canvas.getContext('2d', { desynchronized: true });
        let drawing = false;
        let hasContent = false;

        function resize() {
          canvas.width = window.innerWidth;
          canvas.height = window.innerHeight;
          ctx.strokeStyle = '#000';
          ctx.lineWidth = 3;
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
        }
        window.addEventListener('resize', resize);
        resize();

        function getPos(e) {
          const rect = canvas.getBoundingClientRect();
          const t = e.touches[0];
          return { x: t.clientX - rect.left, y: t.clientY - rect.top };
        }

        canvas.addEventListener('touchstart', (e) => { 
          e.preventDefault(); 
          drawing = true; 
          hasContent = true;
          const pos = getPos(e);
          ctx.beginPath(); 
          ctx.moveTo(pos.x, pos.y);
        });

        canvas.addEventListener('touchmove', (e) => { 
          if(!drawing) return; 
          e.preventDefault();
          const pos = getPos(e);
          ctx.lineTo(pos.x, pos.y); 
          ctx.stroke();
        });

        canvas.addEventListener('touchend', () => drawing = false);
        
        window.clearCanvas = function() {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          hasContent = false;
        };

        window.saveCanvas = function() {
          const data = hasContent ? canvas.toDataURL('image/png') : null;
          window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'signature', signature: data }));
        };
      </script>
    </body>
    </html>
  `;

  return (
    <Modal visible={visible} animationType="slide">
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Entrega de Encomenda</Text>
          <CustomButton title="Voltar" onPress={onClose} variant="outline" size="small" />
        </View>

        <View style={styles.inputSection}>
          <Text style={styles.label}>NOME DE QUEM RETIROU *</Text>
          <TextInput
            style={styles.input}
            placeholder="Ex: João Silva (Morador)"
            value={nomeRecebedor}
            onChangeText={(t: string) => setNomeRecebedor(t.toUpperCase())}
          />
          <Text style={[styles.label, { marginTop: 15 }]}>PORTEIRO RESPONSÁVEL *</Text>
          <TextInput
            style={styles.input}
            placeholder="Seu nome"
            value={porteiroEntrega}
            onChangeText={(t: string) => setPorteiroEntrega(t.toUpperCase())}
          />
        </View>

        <View style={styles.signatureArea}>
          <WebView
            ref={webViewRef}
            source={{ html: signatureHTML }}
            onMessage={handleMessage}
            javaScriptEnabled={true}
            scrollEnabled={false}
            domStorageEnabled={true}
            androidHardwareAccelerationDisabled={true}
          />
        </View>

        <View style={styles.footer}>
          <CustomButton
            title="LIMPAR"
            onPress={clearCanvas}
            variant="outline"
            style={styles.flexButton}
          />
          <CustomButton
            title="FINALIZAR ENTREGA"
            onPress={saveCanvas}
            style={StyleSheet.flatten([styles.flexButton, { marginLeft: 10 }])}
            loading={loading}
          />
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    padding: 20, 
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: '#eee' 
  },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: COLORS.text },
  label: { fontSize: 11, fontWeight: 'bold', color: COLORS.text, marginBottom: 5 },
  inputSection: { padding: 15, backgroundColor: COLORS.surface },
  input: { 
    borderWidth: 1, 
    borderColor: '#ddd', 
    borderRadius: 8, 
    padding: 12, 
    backgroundColor: '#fff',
    fontSize: 14
  },
  signatureArea: { 
    flex: 1,
    margin: 15, 
    borderRadius: 12, 
    borderWidth: 2, 
    borderColor: COLORS.primary, 
    overflow: 'hidden',
    backgroundColor: '#fff'
  },
  footer: { 
    flexDirection: 'row', 
    padding: 20, 
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: '#eee'
  },
  flexButton: { flex: 1 }
});