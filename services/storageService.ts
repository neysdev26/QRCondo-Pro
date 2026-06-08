import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { Encomenda, Bloco, BackupData } from '../types';
import { STORAGE_KEYS, BLOCOS_PADRAO } from '../constants';
import { indexedDBService } from './indexedDBService';

class StorageService {
  private isWeb = Platform.OS === 'web';

  // ==================== ENCOMENDAS ====================

  async getEncomendas(): Promise<Encomenda[]> {
    try {
      if (this.isWeb) {
        return await indexedDBService.getEncomendas();
      }
      
      const data = await AsyncStorage.getItem(STORAGE_KEYS.ENCOMENDAS);
      if (!data) return [];
      
      const parsed = JSON.parse(data);
      return parsed.map((enc: any) => ({
        ...enc,
        dataChegada: new Date(enc.dataChegada),
        dataRetirada: enc.dataRetirada ? new Date(enc.dataRetirada) : undefined
      }));
    } catch (error) {
      console.error('Erro ao carregar encomendas:', error);
      return [];
    }
  }

  async saveEncomendas(encomendas: Encomenda[]): Promise<void> {
    try {
      if (this.isWeb) {
        await indexedDBService.saveEncomendas(encomendas);
        return;
      }
      
      await AsyncStorage.setItem(STORAGE_KEYS.ENCOMENDAS, JSON.stringify(encomendas));
    } catch (error) {
      console.error('Erro ao salvar encomendas:', error);
      throw error;
    }
  }

  // ==================== BLOCOS ====================

  async getBlocos(): Promise<Bloco[]> {
    try {
      if (this.isWeb) {
        const blocos = await indexedDBService.getBlocos();
        if (blocos.length === 0) {
          await this.saveBlocos(BLOCOS_PADRAO);
          return BLOCOS_PADRAO;
        }
        return blocos;
      }
      
      const data = await AsyncStorage.getItem(STORAGE_KEYS.BLOCOS);
      if (!data) {
        await this.saveBlocos(BLOCOS_PADRAO);
        return BLOCOS_PADRAO;
      }
      return JSON.parse(data);
    } catch (error) {
      console.error('Erro ao carregar blocos:', error);
      return BLOCOS_PADRAO;
    }
  }

  async saveBlocos(blocos: Bloco[]): Promise<void> {
    try {
      if (this.isWeb) {
        await indexedDBService.saveBlocos(blocos);
        return;
      }
      
      await AsyncStorage.setItem(STORAGE_KEYS.BLOCOS, JSON.stringify(blocos));
    } catch (error) {
      console.error('Erro ao salvar blocos:', error);
      throw error;
    }
  }

  // ==================== BACKUP ====================

  async createBackup(): Promise<BackupData> {
    try {
      if (this.isWeb) {
        await indexedDBService.createBackup();
        const backup = await indexedDBService.getLastBackup();
        if (!backup) throw new Error('Erro ao criar backup');
        return backup;
      }
      
      const encomendas = await this.getEncomendas();
      const blocos = await this.getBlocos();
      
      const backup: BackupData = {
        encomendas,
        blocos,
        timestamp: new Date()
      };

      await AsyncStorage.setItem(STORAGE_KEYS.BACKUP, JSON.stringify(backup));
      return backup;
    } catch (error) {
      console.error('Erro ao criar backup:', error);
      throw error;
    }
  }

  async restoreBackup(backupData: BackupData): Promise<void> {
    try {
      if (this.isWeb) {
        await indexedDBService.restoreBackup(backupData);
        return;
      }
      
      await this.saveEncomendas(backupData.encomendas);
      await this.saveBlocos(backupData.blocos);
    } catch (error) {
      console.error('Erro ao restaurar backup:', error);
      throw error;
    }
  }

  async getLastBackup(): Promise<BackupData | null> {
    try {
      if (this.isWeb) {
        return await indexedDBService.getLastBackup();
      }
      
      const data = await AsyncStorage.getItem(STORAGE_KEYS.BACKUP);
      if (!data) return null;
      
      const parsed = JSON.parse(data);
      return {
        ...parsed,
        timestamp: new Date(parsed.timestamp),
        encomendas: parsed.encomendas.map((enc: any) => ({
          ...enc,
          dataChegada: new Date(enc.dataChegada),
          dataRetirada: enc.dataRetirada ? new Date(enc.dataRetirada) : undefined
        }))
      };
    } catch (error) {
      console.error('Erro ao carregar backup:', error);
      return null;
    }
  }

  async clearAllData(): Promise<void> {
    try {
      if (this.isWeb) {
        await indexedDBService.clearAllData();
        return;
      }
      
      // No mobile, apenas limpa encomendas e blocos, preserva backup
      await AsyncStorage.multiRemove([
        STORAGE_KEYS.ENCOMENDAS,
        STORAGE_KEYS.BLOCOS
      ]);
    } catch (error) {
      console.error('Erro ao limpar dados:', error);
      throw error;
    }
  }

  async getAllBackups(): Promise<BackupData[]> {
    try {
      if (this.isWeb) {
        return await indexedDBService.getAllBackups();
      }
      
      // Mobile só guarda último backup
      const lastBackup = await this.getLastBackup();
      return lastBackup ? [lastBackup] : [];
    } catch (error) {
      console.error('Erro ao buscar backups:', error);
      return [];
    }
  }

  async deleteOldBackups(maxBackups: number = 10): Promise<void> {
    if (this.isWeb) {
      await indexedDBService.deleteOldBackups(maxBackups);
    }
    // Mobile mantém apenas 1 backup, não precisa deletar
  }

  // ==================== OPERAÇÕES PENDENTES (SYNC) ====================

  async getPendingOperations(): Promise<any[]> {
    try {
      const key = '@encomendas_condominio:pending_operations';
      
      if (this.isWeb) {
        const stored = localStorage.getItem(key);
        return stored ? JSON.parse(stored) : [];
      }
      
      const data = await AsyncStorage.getItem(key);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Erro ao carregar operações pendentes:', error);
      return [];
    }
  }

  async savePendingOperations(operations: any[]): Promise<void> {
    try {
      const key = '@encomendas_condominio:pending_operations';
      
      if (this.isWeb) {
        localStorage.setItem(key, JSON.stringify(operations));
        return;
      }
      
      await AsyncStorage.setItem(key, JSON.stringify(operations));
    } catch (error) {
      console.error('Erro ao salvar operações pendentes:', error);
      throw error;
    }
  }
}

export const storageService = new StorageService();