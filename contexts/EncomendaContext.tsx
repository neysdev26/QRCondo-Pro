import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';
import { Encomenda } from '../types';

type EncomendaContextData = {
  encomendas: Encomenda[];
  isLoading: boolean;
  fetchEncomendas: () => void;
};

const EncomendaContext = createContext<EncomendaContextData>({} as EncomendaContextData);

export const EncomendaProvider = ({ children }: { children: React.ReactNode }) => {
  const [encomendas, setEncomendas] = useState<Encomenda[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { perfil } = useAuth();

  const fetchEncomendas = async () => {
    if (!perfil) return;
    setIsLoading(true);
    try {
      let query = supabase
        .from('encomendas')
        .select('*')
        .eq('condominio_id', perfil.condominio_id)
        .neq('status', 'retirada'); // apenas pendentes

      if (perfil.tipo_usuario === 'morador') {
        query = query
          .eq('apartamento', perfil.apartamento)
          .eq('bloco', perfil.bloco);
      }

      const { data, error } = await query.order('data_chegada', { ascending: false });
      if (error) throw error;
      setEncomendas(data || []);
    } catch (error) {
      console.error('Erro ao buscar encomendas:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (perfil) fetchEncomendas();
  }, [perfil]);

  return (
    <EncomendaContext.Provider value={{ encomendas, isLoading, fetchEncomendas }}>
      {children}
    </EncomendaContext.Provider>
  );
};

export const useEncomenda = () => useContext(EncomendaContext);