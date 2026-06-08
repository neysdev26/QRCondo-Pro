import { Encomenda, Bloco, BackupData } from '../types';

const DB_NAME = 'QrCondoDB';
const DB_VERSION = 1;
const STORE_ENCOMENDAS = 'encomendas';
const STORE_BLOCOS = 'blocos';
const STORE_BACKUPS = 'backups';

class IndexedDBService {
  private db: IDBDatabase | null = null;

  async initDB(): Promise<IDBDatabase> {
    if (this.db) return this.db;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        reject(new Error('Erro ao abrir IndexedDB'));
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };

      request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Criar store de encomendas
        if (!db.objectStoreNames.contains(STORE_ENCOMENDAS)) {
          const encomendasStore = db.createObjectStore(STORE_ENCOMENDAS, { keyPath: 'id' });
          encomendasStore.createIndex('qr_code', 'qr_code', { unique: true });
          encomendasStore.createIndex('status', 'status', { unique: false });
          encomendasStore.createIndex('bloco', 'bloco', { unique: false });
          encomendasStore.createIndex('data_chegada', 'data_chegada', { unique: false });
        }

        // Criar store de blocos
        if (!db.objectStoreNames.contains(STORE_BLOCOS)) {
          const blocosStore = db.createObjectStore(STORE_BLOCOS, { keyPath: 'id' });
          blocosStore.createIndex('nome', 'nome', { unique: true });
        }

        // Criar store de backups
        if (!db.objectStoreNames.contains(STORE_BACKUPS)) {
          db.createObjectStore(STORE_BACKUPS, { keyPath: 'timestamp' });
        }
      };
    });
  }

  // ==================== ENCOMENDAS ====================

  async getEncomendas(): Promise<Encomenda[]> {
    const db = await this.initDB();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_ENCOMENDAS, 'readonly');
      const store = transaction.objectStore(STORE_ENCOMENDAS);
      const request = store.getAll();

      request.onsuccess = () => {
        const encomendas = (request.result || []).map(this.deserializeEncomenda);
        resolve(encomendas);
      };

      request.onerror = () => {
        reject(new Error('Erro ao buscar encomendas'));
      };
    });
  }

  async saveEncomendas(encomendas: Encomenda[]): Promise<void> {
    const db = await this.initDB();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_ENCOMENDAS, 'readwrite');
      const store = transaction.objectStore(STORE_ENCOMENDAS);

      // Limpar store antes de salvar
      store.clear();

      // Adicionar todas as encomendas
      encomendas.forEach(enc => {
        store.add(this.serializeEncomenda(enc));
      });

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(new Error('Erro ao salvar encomendas'));
    });
  }

  async addEncomenda(encomenda: Encomenda): Promise<void> {
    const db = await this.initDB();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_ENCOMENDAS, 'readwrite');
      const store = transaction.objectStore(STORE_ENCOMENDAS);
      const request = store.add(this.serializeEncomenda(encomenda));

      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error('Erro ao adicionar encomenda'));
    });
  }

  async updateEncomenda(id: string, encomenda: Encomenda): Promise<void> {
    const db = await this.initDB();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_ENCOMENDAS, 'readwrite');
      const store = transaction.objectStore(STORE_ENCOMENDAS);
      const request = store.put(this.serializeEncomenda(encomenda));

      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error('Erro ao atualizar encomenda'));
    });
  }

  async deleteEncomenda(id: string): Promise<void> {
    const db = await this.initDB();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_ENCOMENDAS, 'readwrite');
      const store = transaction.objectStore(STORE_ENCOMENDAS);
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error('Erro ao deletar encomenda'));
    });
  }

  // ==================== BLOCOS ====================

  async getBlocos(): Promise<Bloco[]> {
    const db = await this.initDB();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_BLOCOS, 'readonly');
      const store = transaction.objectStore(STORE_BLOCOS);
      const request = store.getAll();

      request.onsuccess = () => {
        resolve(request.result || []);
      };

      request.onerror = () => {
        reject(new Error('Erro ao buscar blocos'));
      };
    });
  }

  async saveBlocos(blocos: Bloco[]): Promise<void> {
    const db = await this.initDB();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_BLOCOS, 'readwrite');
      const store = transaction.objectStore(STORE_BLOCOS);

      // Limpar store antes de salvar
      store.clear();

      // Adicionar todos os blocos
      blocos.forEach(bloco => {
        store.add(bloco);
      });

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(new Error('Erro ao salvar blocos'));
    });
  }

  async addBloco(bloco: Bloco): Promise<void> {
    const db = await this.initDB();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_BLOCOS, 'readwrite');
      const store = transaction.objectStore(STORE_BLOCOS);
      const request = store.add(bloco);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error('Erro ao adicionar bloco'));
    });
  }

  async updateBloco(id: string, bloco: Bloco): Promise<void> {
    const db = await this.initDB();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_BLOCOS, 'readwrite');
      const store = transaction.objectStore(STORE_BLOCOS);
      const request = store.put(bloco);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error('Erro ao atualizar bloco'));
    });
  }

  async deleteBloco(id: string): Promise<void> {
    const db = await this.initDB();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_BLOCOS, 'readwrite');
      const store = transaction.objectStore(STORE_BLOCOS);
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error('Erro ao deletar bloco'));
    });
  }

  // ==================== BACKUPS ====================

  async createBackup(): Promise<void> {
    const [encomendas, blocos] = await Promise.all([
      this.getEncomendas(),
      this.getBlocos()
    ]);

    const backup: BackupData = {
      encomendas,
      blocos,
      timestamp: new Date()
    };

    const db = await this.initDB();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_BACKUPS, 'readwrite');
      const store = transaction.objectStore(STORE_BACKUPS);
      
      const serializedBackup = {
        ...backup,
        timestamp: new Date(backup.timestamp).toISOString(),
        encomendas: backup.encomendas.map(this.serializeEncomenda)
      };
      
      const request = store.add(serializedBackup);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error('Erro ao criar backup'));
    });
  }

  async getLastBackup(): Promise<BackupData | null> {
    const db = await this.initDB();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_BACKUPS, 'readonly');
      const store = transaction.objectStore(STORE_BACKUPS);
      const request = store.openCursor(null, 'prev');

      request.onsuccess = () => {
        const cursor = request.result;
        if (cursor) {
          const backup = cursor.value;
          resolve({
            encomendas: backup.encomendas.map(this.deserializeEncomenda),
            blocos: backup.blocos,
            timestamp: new Date(backup.timestampz)
          });
        } else {
          resolve(null);
        }
      };

      request.onerror = () => {
        reject(new Error('Erro ao buscar backup'));
      };
    });
  }

  async restoreBackup(backup: BackupData): Promise<void> {
    await Promise.all([
      this.saveEncomendas(backup.encomendas),
      this.saveBlocos(backup.blocos)
    ]);
  }

  async clearAllData(): Promise<void> {
    const db = await this.initDB();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(
        [STORE_ENCOMENDAS, STORE_BLOCOS], 
        'readwrite'
      );

      transaction.objectStore(STORE_ENCOMENDAS).clear();
      transaction.objectStore(STORE_BLOCOS).clear();
      // NÃO limpa STORE_BACKUPS - backups são preservados

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(new Error('Erro ao limpar dados'));
    });
  }

  async getAllBackups(): Promise<BackupData[]> {
    const db = await this.initDB();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_BACKUPS, 'readonly');
      const store = transaction.objectStore(STORE_BACKUPS);
      const request = store.getAll();

      request.onsuccess = () => {
        const backups = (request.result || []).map((backup: any) => ({
          encomendas: backup.encomendas.map(this.deserializeEncomenda),
          blocos: backup.blocos,
          timestamp: new Date(backup.timestamp)
        }));
        // Ordenar por timestamp decrescente (mais recente primeiro)
        backups.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
        resolve(backups);
      };

      request.onerror = () => {
        reject(new Error('Erro ao buscar backups'));
      };
    });
  }

  async deleteOldBackups(maxBackups: number = 10): Promise<void> {
    const backups = await this.getAllBackups();
    
    if (backups.length <= maxBackups) return;

    const db = await this.initDB();
    const backupsToDelete = backups.slice(maxBackups);
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_BACKUPS, 'readwrite');
      const store = transaction.objectStore(STORE_BACKUPS);

      backupsToDelete.forEach(backup => {
        store.delete(new Date(backup.timestamp).toISOString());
      });

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(new Error('Erro ao deletar backups antigos'));
    });
  }

  // ==================== SERIALIZAÇÃO ====================

  private serializeEncomenda(encomenda: Encomenda): any {
    return {
      ...encomenda,
      data_chegada: new Date(encomenda.data_chegada).toISOString(),
data_retirada: encomenda.data_retirada ? new Date(encomenda.data_retirada).toISOString() : undefined
    };
  }

  private deserializeEncomenda(data: any): Encomenda {
    return {
      ...data,
      data_chegada: new Date(data.data_chegada),
      data_retirada: data.data_retirada ? new Date(data.data_retirada) : undefined
    };
  }
}

export const indexedDBService = new IndexedDBService();
