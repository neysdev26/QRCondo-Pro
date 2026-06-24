// types/index.ts
// Definições de tipos para o aplicativo QrCondo Pro

export interface Encomenda {
  id: number | string;
  qr_code: string;
  destinatario: string;
  bloco: string;
  apartamento: string;
  remetente?: string;
  observacoes?: string;
  porteiro_entrada?: string;    // nome do porteiro que registrou a entrada
  porteiro_entrega?: string;    // nome do porteiro que fez a entrega
  nome_recebedor?: string;      // nome de quem retirou
  assinatura?: string;          // URL da imagem da assinatura
  status: 'pendente' | 'retirada';
  data_chegada: string;
  data_retirada?: string;
  condominio_id?: number;
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

// Tipos relacionados ao perfil do usuário (usado em AuthContext)
export interface PerfilUsuario {
  id: string;
  condominio_id: number;
  nome: string;
  tipo_usuario: 'porteiro' | 'morador';
  apartamento?: string;
  bloco?: string;
}

// Tipo para o contexto de autenticação
export interface AuthContextData {
  session: any; // Ou importe Session do Supabase se preferir
  user: any;
  perfil: PerfilUsuario | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}