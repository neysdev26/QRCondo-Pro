import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Encomenda } from '../types';
import { Alert } from 'react-native';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

export function useEncomenda() {
  const [encomendas, setEncomendas] = useState<Encomenda[]>([]);
  const [loading, setLoading] = useState(true);

  async function fetchEncomendas() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('encomendas')
        .select('*')
        .order('data_chegada', { ascending: false });

      if (error) throw error;
      setEncomendas(data || []);
    } catch (e) {
      console.error('Erro ao carregar encomendas:', e);
    } finally {
      setLoading(false);
    }
  }

  // LÓGICA DE BACKUP REAL E LOCALIZÁVEL
  async function createBackup() {
    if (encomendas.length === 0) {
      Alert.alert("Aviso", "Não há dados para exportar.");
      return;
    }

    setLoading(true);
    try {
      // 1. Configuração do CSV (BOM para acentos e ponto e vírgula para colunas no Excel)
      const BOM = "\uFEFF";
      const header = "Data Chegada;Destinatário;Bloco;Apartamento;Status;Porteiro;Observações\n";
      const rows = encomendas.map(item => 
        `${new Date(item.data_chegada).toLocaleString('pt-BR')};${item.destinatario};${item.bloco};${item.apartamento};${item.status};${item.porteiro};"${item.observacoes || ''}"`
      ).join('\n');
      
      const csvContent = BOM + header + rows;

      // 2. Caminho no Diretório de Documentos (mais fácil de encontrar que o cache)
      const fileName = `backup_encomendas_${new Date().getTime()}.csv`;
      const fileUri = FileSystem.documentDirectory + fileName;

      // 3. Gravação do ficheiro no armazenamento do dispositivo
      await FileSystem.writeAsStringAsync(fileUri, csvContent, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      // 4. Partilha/Salvamento manual
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, {
          mimeType: 'text/csv',
          dialogTitle: 'Exportar Backup de Encomendas',
          UTI: 'public.comma-separated-values-text'
        });
      } else {
        Alert.alert("Erro", "A partilha não está disponível neste dispositivo.");
      }
    } catch (e) {
      console.error(e);
      Alert.alert("Erro", "Falha ao gerar o ficheiro de backup.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchEncomendas();
  }, []);

  return { 
    encomendas, 
    loading, 
    fetchEncomendas, 
    createBackup 
  };
}