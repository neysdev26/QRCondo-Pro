import * as FileSystem from 'expo-file-system';
import * as DocumentPicker from 'expo-document-picker';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BackupData } from '../types';

const BACKUP_FOLDER_KEY = 'backup_folder_uri';
const BACKUP_FOLDER_NAME = 'QrCondoBackups';

class FileBackupService {
  private backupFolderUri: string | null = null;

  // ==================== CONFIGURAÇÃO DE PASTA ====================

  async getBackupFolder(): Promise<string | null> {
    if (this.backupFolderUri) return this.backupFolderUri;

    try {
      const stored = await AsyncStorage.getItem(BACKUP_FOLDER_KEY);
      if (stored) {
        this.backupFolderUri = stored;
        return stored;
      }
      
      // Não usar pasta padrão - usuário deve configurar
      return null;
    } catch (error) {
      console.error('Erro ao obter pasta de backup:', error);
      return null;
    }
  }

  async selectBackupFolder(): Promise<string | null> {
    try {
      if (Platform.OS === 'web') {
        // Web: usar pasta de Downloads (comportamento do navegador)
        const webFolder = 'Downloads (pasta padrão do navegador)';
        this.backupFolderUri = webFolder;
        await AsyncStorage.setItem(BACKUP_FOLDER_KEY, webFolder);
        return webFolder;
      }

      if (Platform.OS === 'android') {
        // Android: usar Storage Access Framework para escolher pasta
        const permissions = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
        
        if (permissions.granted) {
          const folderUri = permissions.directoryUri;
          this.backupFolderUri = folderUri;
          await AsyncStorage.setItem(BACKUP_FOLDER_KEY, folderUri);
          return folderUri;
        } else {
          console.log('Permissão negada pelo usuário');
          return null;
        }
      }

      // iOS: criar pasta em DocumentDirectory (limitação da plataforma)
      const folder = `${FileSystem.documentDirectory}${BACKUP_FOLDER_NAME}/`;
      await this.ensureDirectoryExists(folder);
      
      this.backupFolderUri = folder;
      await AsyncStorage.setItem(BACKUP_FOLDER_KEY, folder);
      
      return folder;
    } catch (error) {
      console.error('Erro ao selecionar pasta:', error);
      return null;
    }
  }

  private async ensureDirectoryExists(dirPath: string): Promise<void> {
    try {
      const dirInfo = await FileSystem.getInfoAsync(dirPath);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(dirPath, { intermediates: true });
      }
    } catch (error) {
      console.error('Erro ao criar diretório:', error);
      throw error;
    }
  }

// No método saveBackupToFile do seu fileBackupService.ts
async saveBackupToFile(backup: BackupData): Promise<string | null> {
  try {
    if (Platform.OS === 'web') return await this.downloadBackupWeb(backup);

    const folder = await this.getBackupFolder();
    if (!folder) return null;

    // Timestamp formatado para evitar caracteres inválidos
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `backup_${timestamp}.json`;
    const backupData = JSON.stringify(backup, null, 2);

    let fileUri: string;
    if (Platform.OS === 'android' && folder.startsWith('content://')) {
      fileUri = await FileSystem.StorageAccessFramework.createFileAsync(folder, filename, 'application/json');
      await FileSystem.writeAsStringAsync(fileUri, backupData);
    } else {
      fileUri = `${folder}${filename}`;
      await FileSystem.writeAsStringAsync(fileUri, backupData);
    }

    // LIMPEZA IMEDIATA: Mantém apenas os 5 mais recentes no disco
    await this.deleteOldBackups(5);

    return fileUri;
  } catch (error) {
    console.error('Erro ao salvar backup:', error);
    throw error;
  }
}

  private async downloadBackupWeb(backup: BackupData): Promise<string | null> {
    try {
      const dataStr = JSON.stringify(backup, null, 2);
      const blob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const timestamp = new Date().toISOString().split('T')[0];
      const filename = `qrcondo-backup-${timestamp}.json`;
      
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      return filename;
    } catch (error) {
      console.error('Erro ao fazer download do backup:', error);
      return null;
    }
  }

  // ==================== RESTAURAR BACKUP ====================

  async selectBackupFile(): Promise<BackupData | null> {
    try {
      if (Platform.OS === 'web') {
        return await this.selectBackupWeb();
      }

      // Mobile: usar DocumentPicker
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/json',
        copyToCacheDirectory: true
      });

      if (result.canceled) {
        return null;
      }

      const fileUri = result.assets[0].uri;
      const content = await FileSystem.readAsStringAsync(fileUri);
      const backup = JSON.parse(content);

      // Converter datas
      return this.deserializeBackup(backup);
    } catch (error) {
      console.error('Erro ao selecionar arquivo de backup:', error);
      throw error;
    }
  }

  private async selectBackupWeb(): Promise<BackupData | null> {
    return new Promise((resolve, reject) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'application/json';
      
      input.onchange = async (e: any) => {
        try {
          const file = e.target.files[0];
          if (!file) {
            resolve(null);
            return;
          }

          const text = await file.text();
          const backup = JSON.parse(text);
          resolve(this.deserializeBackup(backup));
        } catch (error) {
          reject(error);
        }
      };

      input.click();
    });
  }

  private deserializeBackup(data: any): BackupData {
    return {
      encomendas: data.encomendas.map((enc: any) => ({
        ...enc,
        dataChegada: new Date(enc.dataChegada),
        dataRetirada: enc.dataRetirada ? new Date(enc.dataRetirada) : undefined
      })),
      blocos: data.blocos,
      timestamp: new Date(data.timestamp)
    };
  }

  // ==================== GERENCIAMENTO DE BACKUPS ====================

  async listBackupFiles(): Promise<string[]> {
    try {
      if (Platform.OS === 'web') {
        return []; // Web não mantém lista de arquivos
      }

      const folder = await this.getBackupFolder();
      if (!folder) return [];

      if (Platform.OS === 'android' && folder.startsWith('content://')) {
        // Android: usar Storage Access Framework
        const files = await FileSystem.StorageAccessFramework.readDirectoryAsync(folder);
        return files
          .filter(f => f.endsWith('.json'))
          .sort()
          .reverse(); // Mais recentes primeiro
      } else {
        // iOS ou Android sem SAF
        const files = await FileSystem.readDirectoryAsync(folder);
        return files
          .filter(f => f.endsWith('.json'))
          .sort()
          .reverse(); // Mais recentes primeiro
      }
    } catch (error) {
      console.error('Erro ao listar backups:', error);
      return [];
    }
  }

  async deleteOldBackups(maxBackups: number = 20): Promise<void> {
    try {
      if (Platform.OS === 'web') return;

      const files = await this.listBackupFiles();
      if (files.length <= maxBackups) return;

      const folder = await this.getBackupFolder();
      if (!folder) return;

      const filesToDelete = files.slice(maxBackups);
      
      if (Platform.OS === 'android' && folder.startsWith('content://')) {
        // Android: usar Storage Access Framework
        for (const fileUri of filesToDelete) {
          await FileSystem.StorageAccessFramework.deleteAsync(fileUri, { idempotent: true });
        }
      } else {
        // iOS ou Android sem SAF
        for (const file of filesToDelete) {
          const filepath = `${folder}${file}`;
          await FileSystem.deleteAsync(filepath, { idempotent: true });
        }
      }

      console.log(`${filesToDelete.length} backups antigos deletados`);
    } catch (error) {
      console.error('Erro ao deletar backups antigos:', error);
    }
  }

  async getBackupFolderPath(): Promise<string | null> {
    const folder = await this.getBackupFolder();
    return folder;
  }

  async openBackupFolder(): Promise<void> {
    try {
      if (Platform.OS === 'web') {
        alert('No navegador, os backups são baixados para a pasta de Downloads.');
        return;
      }

      const folder = await this.getBackupFolder();
      if (!folder) {
        throw new Error('Pasta de backup não configurada');
      }

      // Não há forma nativa de abrir pasta no Expo
      // Apenas informar ao usuário o caminho
      console.log('Pasta de backup:', folder);
    } catch (error) {
      console.error('Erro ao abrir pasta:', error);
      throw error;
    }
  }
}

export const fileBackupService = new FileBackupService();
