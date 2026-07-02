// types/index.ts
// Definições de tipos para o aplicativo QrCondo Pro

export interface Encomenda {
  id: string;
  encomendas_id?: string;
  qr_code: string;
  destinatario: string;
  bloco: string;
  apartamento: string;
  remetente?: string;
  observacoes?: string;
  porteiro_entrada?: string;
  porteiro_entrega?: string;
  nome_recebedor?: string;
  assinatura?: string;
  status: 'pendente' | 'retirada';
  data_chegada: string;
  data_retirada?: string;
  condominio_id?: string;
}

export interface EncomendaContextType {
  encomendas: Encomenda[];
  isLoading: boolean;
  fetchEncomendas: () => void;
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

export interface PerfilUsuario {
  id: string;
  condominio_id: string;
  nome: string;
  tipo_usuario: 'porteiro' | 'morador';
  apartamento?: string;
  bloco?: string;
}

export interface AuthContextData {
  session: any;
  user: any;
  perfil: PerfilUsuario | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}