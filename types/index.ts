export interface Encomenda {
  id: number;
  qr_code: string; 
  destinatario: string;
  bloco?: string;
  apartamento: string | number;
  remetente?: string;
  porteiro: string;
  observacoes?: string;
  status: 'pendente' | 'retirada';
  data_chegada: string;
  data_retirada?: string;
  quem_retirou?: string;    // O PDF chama de nomeRecebedor, vamos padronizar
  porteiro_entrega?: string;
  assinatura?: string;
}

// ESTA INTERFACE É O QUE ESTÁ FALTANDO NO SEU ARQUIVO
export interface EncomendaContextType {
  encomendas: Encomenda[];
  loading: boolean;
  refreshEncomendas: () => Promise<void>;
  addEncomenda: (encomenda: Encomenda) => Promise<void>;
  updateEncomenda: (id: string, dados: Partial<Encomenda>) => Promise<void>;
  deleteEncomenda: (id: string) => Promise<void>;
  // Adicione estas se o seu contexto as utilizar:
  syncStatus?: 'synced' | 'syncing' | 'error';
  pendingOpsCount?: number;
}

export interface Bloco {
  id: string;
  nome: string;
  apartamentos: string[];
}

export interface BackupData {
  encomendas: Encomenda[];
  blocos: Bloco[];
  timestamp: Date;
}

export type EncomendaStatus = 'pendente' | 'retirada';