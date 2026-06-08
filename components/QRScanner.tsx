import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Alert, Platform, Modal, TouchableOpacity } from 'react-native';
import { CameraView, Camera } from 'expo-camera';
import { MaterialIcons } from '@expo/vector-icons';
import { COLORS } from '../constants';
import CustomButton from './ui/CustomButton';

interface QRScannerProps {
  visible: boolean;
  onClose: () => void;
  onQRScanned: (qrCode: string) => void;
}

export default function QRScanner({ visible, onClose, onQRScanned }: QRScannerProps) {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [scanned, setScanned] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Solicitar permissão quando o modal abrir
  useEffect(() => {
    if (visible) {
      getCameraPermissions();
      // Reset states quando abrir
      setScanned(false);
      setIsProcessing(false);
    }
  }, [visible]);

  const getCameraPermissions = async () => {
    try {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
    } catch (error) {
      console.error('Erro ao solicitar permissão:', error);
      setHasPermission(false);
    }
  };

  const showWebAlert = (title: string, message: string, onOk?: () => void) => {
    if (Platform.OS === 'web') {
      const result = window.confirm(`${title}\n\n${message}`);
      if (result && onOk) onOk();
    } else {
      Alert.alert(title, message, onOk ? [{ text: 'OK', onPress: onOk }] : undefined);
    }
  };

  const handleBarCodeScanned = ({ type, data }: { type: string; data: string }) => {
    // Evitar processamento múltiplo
    if (scanned || isProcessing || !data) return;
    
    console.log('Código detectado:', type, data);
    
    setScanned(true);
    setIsProcessing(true);
    
    // Determinar tipo de código
    let codeType = 'QR Code';
    const typeStr = type.toLowerCase();
    
    if (typeStr.includes('128') || typeStr.includes('39') || typeStr.includes('93')) {
      codeType = 'Código de Barras';
    } else if (typeStr.includes('ean')) {
      codeType = 'Código EAN';
    } else if (typeStr.includes('upc')) {
      codeType = 'Código UPC';
    } else if (typeStr.includes('pdf417')) {
      codeType = 'PDF417';
    }
    
    console.log(`${codeType} escaneado: ${data}`);
    
    // Processar o código
    setTimeout(() => {
      onQRScanned(data);
      setIsProcessing(false);
      
      // Permitir novo scan após 1 segundo
      setTimeout(() => {
        setScanned(false);
      }, 1000);
    }, 100);
  };

  const handleManualReset = () => {
    setScanned(false);
    setIsProcessing(false);
  };

  if (hasPermission === null) {
    return (
      <Modal visible={visible} transparent animationType="slide">
        <View style={styles.centeredContainer}>
          <View style={styles.permissionContainer}>
            <Text style={styles.permissionText}>Solicitando permissão da câmera...</Text>
          </View>
        </View>
      </Modal>
    );
  }

  if (hasPermission === false) {
    return (
      <Modal visible={visible} transparent animationType="slide">
        <View style={styles.centeredContainer}>
          <View style={styles.permissionContainer}>
            <MaterialIcons name="camera-alt" size={48} color={COLORS.error} />
            <Text style={styles.permissionTitle}>Permissão Necessária</Text>
            <Text style={styles.permissionText}>
              É necessário permitir o acesso à câmera para ler QR Codes e códigos de barras
            </Text>
            <View style={styles.permissionButtons}>
              <CustomButton
                title="Fechar"
                onPress={onClose}
                variant="outline"
                style={{ flex: 1, marginRight: 8 }}
              />
              <CustomButton
                title="Tentar Novamente"
                onPress={getCameraPermissions}
                style={{ flex: 1, marginLeft: 8 }}
              />
            </View>
          </View>
        </View>
      </Modal>
    );
  }

  return (
    <Modal visible={visible} animationType="slide">
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Scanner de Códigos</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <MaterialIcons name="close" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        <View style={styles.cameraContainer}>
          <CameraView
            style={styles.camera}
            facing="back"
            onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
            barcodeScannerSettings={{
              barcodeTypes: [
                'qr',
                'pdf417',
                'aztec',
                'ean13',
                'ean8',
                'upc_a',
                'upc_e',
                'code128',
                'code39',
                'code93',
                'codabar',
                'datamatrix',
                'itf14'
              ],
            }}
          >
            <View style={styles.overlay}>
              <View style={styles.scanArea}>
                <View style={styles.corner} />
                <View style={[styles.corner, styles.topRight]} />
                <View style={[styles.corner, styles.bottomLeft]} />
                <View style={[styles.corner, styles.bottomRight]} />
                
                {scanned && (
                  <View style={styles.scannedOverlay}>
                    <MaterialIcons name="check-circle" size={64} color={COLORS.success} />
                    <Text style={styles.scannedText}>Código Lido!</Text>
                  </View>
                )}
              </View>
            </View>
          </CameraView>
        </View>

        <View style={styles.instructions}>
          <Text style={styles.instructionText}>
            {scanned 
              ? 'Processando código...' 
              : 'Posicione o código dentro da área de escaneamento'}
          </Text>
          <Text style={styles.supportedText}>
            Suporta: QR Code, Código de Barras, PDF417, EAN, UPC e outros
          </Text>
          
          {scanned && (
            <CustomButton
              title="Escanear Novamente"
              onPress={handleManualReset}
              variant="secondary"
              size="small"
              style={{ marginTop: 12 }}
            />
          )}
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
  centeredContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: COLORS.primary,
    paddingTop: 50,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  closeButton: {
    padding: 4,
  },
  cameraContainer: {
    flex: 1,
  },
  camera: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanArea: {
    width: 280,
    height: 280,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  corner: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderColor: '#FFFFFF',
    top: 0,
    left: 0,
    borderTopWidth: 4,
    borderLeftWidth: 4,
  },
  topRight: {
    top: 0,
    right: 0,
    left: 'auto',
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderLeftWidth: 0,
  },
  bottomLeft: {
    bottom: 0,
    top: 'auto',
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderTopWidth: 0,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    top: 'auto',
    left: 'auto',
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderTopWidth: 0,
    borderLeftWidth: 0,
  },
  scannedOverlay: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  scannedText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 12,
  },
  instructions: {
    padding: 20,
    backgroundColor: '#000',
    alignItems: 'center',
  },
  instructionText: {
    color: '#FFFFFF',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 8,
  },
  supportedText: {
    color: '#CCCCCC',
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 10,
  },
  permissionContainer: {
    backgroundColor: '#FFFFFF',
    padding: 30,
    borderRadius: 12,
    alignItems: 'center',
    marginHorizontal: 20,
    maxWidth: 350,
  },
  permissionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    marginTop: 16,
    marginBottom: 8,
  },
  permissionText: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 20,
  },
  permissionButtons: {
    flexDirection: 'row',
    width: '100%',
  },
});