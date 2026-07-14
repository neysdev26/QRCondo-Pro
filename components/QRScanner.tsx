import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera'; // 👈 importação correta
import { MaterialIcons } from '@expo/vector-icons';
import { useAudioPlayer } from 'expo-audio';

// 🔥 Contorno para o erro de tipagem do CameraView (versão alternativa)
const CameraViewAny = CameraView as any;

interface QRScannerProps {
  visible: boolean;
  onClose: () => void;
  onScan: (data: string) => void;
  condominioId?: string | number;
}

export default function QRScanner({ visible, onClose, onScan, condominioId }: QRScannerProps) {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [loading, setLoading] = useState(false);
  const beepPlayer = useAudioPlayer(require('../assets/sounds/beep.mp3'));

  // Solicita permissão ao abrir o modal
  useEffect(() => {
    if (visible && !permission?.granted) {
      requestPermission();
    }
  }, [visible]);

  const playBeep = () => {
    try {
      beepPlayer.seekTo(0);
      beepPlayer.play();
    } catch (e) {
      console.log('Erro ao tocar som');
    }
  };

  const handleBarCodeScanned = ({ data }: { data: string }) => {
    if (scanned) return;
    setScanned(true);
    playBeep();
    onScan(data);
    setScanned(false);
    onClose();
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} animationType="slide" transparent={false}>
      <View style={styles.container}>
        {/* Cabeçalho */}
        <View style={styles.header}>
          <Text style={styles.title}>Escanear QR Code</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <MaterialIcons name="close" size={28} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Área da câmera */}
        <View style={styles.cameraContainer}>
          {!permission?.granted ? (
            <View style={styles.permissionContainer}>
              <MaterialIcons name="no-photography" size={60} color="#94a3b8" />
              <Text style={styles.permissionText}>
                Permissão da câmera negada.{' '}
                {permission?.canAskAgain && (
                  <Text
                    style={styles.permissionLink}
                    onPress={requestPermission}
                  >
                    Tentar novamente
                  </Text>
                )}
              </Text>
            </View>
          ) : (
            // 🔥 Usa CameraViewAny para evitar erro de tipagem
            <CameraViewAny
              style={StyleSheet.absoluteFillObject}
              onBarcodeScanned={handleBarCodeScanned}
              barcodeScannerSettings={{
                barcodeTypes: ['qr', 'ean13', 'ean8', 'code128', 'code39'],
              }}
            />
          )}
        </View>

        {/* Instruções */}
        <View style={styles.instructions}>
          <Text style={styles.instructionsText}>
            Aponte a câmera para o código QR
          </Text>
          <Text style={styles.instructionsSub}>
            O reconhecimento é automático
          </Text>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 15,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  closeButton: {
    padding: 5,
  },
  cameraContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
  },
  permissionText: {
    color: '#94a3b8',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 15,
  },
  permissionLink: {
    color: '#1974f4',
    fontWeight: 'bold',
    textDecorationLine: 'underline',
  },
  instructions: {
    padding: 20,
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  instructionsText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  instructionsSub: {
    color: '#94a3b8',
    fontSize: 13,
    marginTop: 4,
  },
});