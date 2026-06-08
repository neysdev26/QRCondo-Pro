import { createClient, SupabaseClient, RealtimeChannel } from '@supabase/supabase-js';
import { Encomenda, Bloco } from '../types';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

class SupabaseService {
  private client: SupabaseClient;
  private encomendasChannel: RealtimeChannel | null = null;
  private blocosChannel: RealtimeChannel | null = null;

  constructor() {
    this.client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  }

  // ==================== STORAGE ====================

  async uploadSignature(signature: string, encomendaId: string): Promise<string> {
    try {
      // Converter base64 para blob
      const base64Data = signature.split(',')[1];
      const byteCharacters = atob(base64Data);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: 'image/jpeg' });

      // Nome único para arquivo
      const fileName = `${encomendaId}_${Date.now()}.jpg`;

      // Upload para Storage
      const { error: uploadError } = await this.client.storage
        .from('assinaturas')
        .upload(fileName, blob, {
          contentType: 'image/jpeg',
          upsert: true
        });

      if (uploadError) throw uploadError;

      // Obter URL pública
      const { data: urlData } = this.client.storage
        .from('assinaturas')
        .getPublicUrl(fileName);

      return urlData.publicUrl;
    } catch (error) {
      console.error('Erro ao fazer upload da assinatura:', error);
      throw error;
    }
  }

  // ==================== ENCOMENDAS ====================

  async getEncomendas(status?: 'pendente' | 'retirada'): Promise<Encomenda[]> {
    try {
      let query = this.client
        .from('encomendas')
        .select('*')
        .order('data_chegada', { ascending: false });

      if (status) {
        query = query.eq('status', status);
      }

      const { data, error } = await query;

      if (error) throw error;

      return (data || []).map(this.mapEncomendaFromDB);
    } catch (error) {
      console.error('Erro ao buscar encomendas:', error);
      throw error;
    }
  }

  async getEncomendasPendentes(): Promise<Encomenda[]> {
    return this.getEncomendas('pendente');
  }

  async getEncomendasEntregues(): Promise<Encomenda[]> {
    return this.getEncomendas('retirada');
  }

  async getEncomendaById(id: string): Promise<Encomenda | null> {
    try {
      const { data, error } = await this.client
        .from('encomendas')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;

      return data ? this.mapEncomendaFromDB(data) : null;
    } catch (error) {
      console.error('Erro ao buscar encomenda:', error);
      return null;
    }
  }

  async getEncomendaByQR(qr_code: string): Promise<Encomenda | null> {
    try {
      const { data, error } = await this.client
        .from('encomendas')
        .select('*')
        .eq('qr_code', qr_code)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null; // Not found
        throw error;
      }

      return data ? this.mapEncomendaFromDB(data) : null;
    } catch (error) {
      console.error('Erro ao buscar encomenda por QR:', error);
      return null;
    }
  }

  async addEncomenda(encomenda: Encomenda): Promise<Encomenda> {
    try {
      const dbEncomenda = this.mapEncomendaToDB(encomenda);

      const { data, error } = await this.client
        .from('encomendas')
        .insert(dbEncomenda)
        .select()
        .single();

      if (error) throw error;

      return this.mapEncomendaFromDB(data);
    } catch (error) {
      console.error('Erro ao adicionar encomenda:', error);
      throw error;
    }
  }

  async updateEncomenda(id: string, dados: Partial<Encomenda>): Promise<Encomenda> {
    try {
      const dbDados = this.mapEncomendaToDB(dados as Encomenda);

      const { data, error } = await this.client
        .from('encomendas')
        .update(dbDados)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      return this.mapEncomendaFromDB(data);
    } catch (error) {
      console.error('Erro ao atualizar encomenda:', error);
      throw error;
    }
  }

  async deleteEncomenda(id: string): Promise<void> {
    try {
      const { error } = await this.client
        .from('encomendas')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      console.log('Encomenda deletada com sucesso do Supabase:', id);
    } catch (error) {
      console.error('Erro ao remover encomenda:', error);
      throw error;
    }
  }

  // ==================== BLOCOS ====================

  async getBlocos(): Promise<Bloco[]> {
    try {
      const { data, error } = await this.client
        .from('blocos')
        .select('*')
        .order('nome', { ascending: true });

      if (error) throw error;

      return (data || []).map(this.mapBlocoFromDB);
    } catch (error) {
      console.error('Erro ao buscar blocos:', error);
      throw error;
    }
  }

  async addBloco(bloco: Bloco): Promise<Bloco> {
    try {
      const dbBloco = this.mapBlocoToDB(bloco);

      const { data, error } = await this.client
        .from('blocos')
        .insert(dbBloco)
        .select()
        .single();

      if (error) throw error;

      return this.mapBlocoFromDB(data);
    } catch (error) {
      console.error('Erro ao adicionar bloco:', error);
      throw error;
    }
  }

  async updateBloco(id: string, dados: Partial<Bloco>): Promise<Bloco> {
    try {
      const dbDados = this.mapBlocoToDB(dados as Bloco);

      const { data, error } = await this.client
        .from('blocos')
        .update(dbDados)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      return this.mapBlocoFromDB(data);
    } catch (error) {
      console.error('Erro ao atualizar bloco:', error);
      throw error;
    }
  }

  async deleteBloco(id: string): Promise<void> {
    try {
      const { error } = await this.client
        .from('blocos')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      console.log('Bloco deletado com sucesso do Supabase:', id);
    } catch (error) {
      console.error('Erro ao remover bloco:', error);
      throw error;
    }
  }

  // ==================== REAL-TIME SUBSCRIPTIONS ====================

  subscribeToEncomendas(
    callback: (payload: { eventType: string; new?: any; old?: any }) => void
  ): () => void {
    this.encomendasChannel = this.client
      .channel('encomendas-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'encomendas' },
        (payload) => {
          console.log('Evento recebido em tempo real:', payload.eventType, payload);
          callback({
            eventType: payload.eventType,
            new: payload.new,
            old: payload.old
          });
        }
      )
      .subscribe((status) => {
        console.log('Status da subscrição:', status);
      });

    // Retornar função para desinscrever
    return () => {
      if (this.encomendasChannel) {
        this.client.removeChannel(this.encomendasChannel);
        this.encomendasChannel = null;
      }
    };
  }

  subscribeToBlocos(
    callback: (payload: { eventType: string; new?: any; old?: any }) => void
  ): () => void {
    this.blocosChannel = this.client
      .channel('blocos-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'blocos' },
        (payload) => {
          console.log('Evento de bloco recebido em tempo real:', payload.eventType, payload);
          callback({
            eventType: payload.eventType,
            new: payload.new,
            old: payload.old
          });
        }
      )
      .subscribe((status) => {
        console.log('Status da subscrição de blocos:', status);
      });

    // Retornar função para desinscrever
    return () => {
      if (this.blocosChannel) {
        this.client.removeChannel(this.blocosChannel);
        this.blocosChannel = null;
      }
    };
  }

  unsubscribeAll(): void {
    if (this.encomendasChannel) {
      this.client.removeChannel(this.encomendasChannel);
      this.encomendasChannel = null;
    }
    if (this.blocosChannel) {
      this.client.removeChannel(this.blocosChannel);
      this.blocosChannel = null;
    }
  }

  // ==================== MAPPERS ====================

  private mapEncomendaFromDB(dbData: any): Encomenda {
    return {
      id: dbData.id,
      qr_code: dbData.qr_code,
      destinatario: dbData.destinatario,
      bloco: dbData.bloco,
      apartamento: dbData.apartamento,
      remetente: dbData.remetente,
      observacoes: dbData.observacoes,
      data_chegada: dbData.data_chegada,
      data_retirada: dbData.data_retirada ? dbData.data_retirada : undefined,
      assinatura: dbData.assinatura,
      quem_retirou: dbData.quem_retirou,
      porteiro_entrega: dbData.porteiro_entrega,
      status: dbData.status,
      porteiro: dbData.porteiro
    };
  }

  private mapEncomendaToDB(encomenda: Encomenda): any {
    return {
      id: encomenda.id,
      qr_code: encomenda.qr_code,
      destinatario: encomenda.destinatario,
      bloco: encomenda.bloco,
      apartamento: encomenda.apartamento,
      remetente: encomenda.remetente || null,
      observacoes: encomenda.observacoes || null,
      data_chegada: encomenda.data_chegada.toString(),
      data_retirada: encomenda.data_retirada ? encomenda.data_retirada.toString() : null,
      assinatura: encomenda.assinatura || null,
      quem_retirou: encomenda.quem_retirou || null,
      porteiro_entrega: encomenda.porteiro_entrega || null,
      status: encomenda.status,
      porteiro: encomenda.porteiro
    };
  }

  private mapBlocoFromDB(dbData: any): Bloco {
    return {
      id: dbData.id,
      nome: dbData.nome,
      apartamentos: dbData.apartamentos || []
    };
  }

  private mapBlocoToDB(bloco: Bloco): any {
    return {
      id: bloco.id,
      nome: bloco.nome,
      apartamentos: bloco.apartamentos
    };
  }
}

export const supabaseService = new SupabaseService();
