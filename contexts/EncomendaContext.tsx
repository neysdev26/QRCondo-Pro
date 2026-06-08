import React, { createContext, useContext, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { Encomenda } from '../types';

interface EncomendaContextType {
  encomendas: Encomenda[];
  isLoading: boolean;
  fetchEncomendas: () => Promise<void>;
}

const EncomendaContext = createContext<EncomendaContextType | undefined>(undefined);

export function EncomendaProvider({ children }: { children: React.ReactNode }) {
  const [encomendas, setEncomendas] = useState<Encomenda[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  
const fetchEncomendas = useCallback(async () => {
  setIsLoading(true);
  try {
    const { data, error } = await supabase
      .from('encomendas')
      .select('*')
      // Buscamos registros que estejam pendentes OU retirados
      .in('status', ['pendente', 'retirada']) 
      .order('data_chegada', { ascending: false });

    if (error) throw error;
    setEncomendas(data || []);
  } catch (error) {
    console.error('Erro ao buscar encomendas:', error);
  } finally {
    setIsLoading(false);
  }
}, []);

  return (
    <EncomendaContext.Provider value={{ encomendas, isLoading, fetchEncomendas }}>
      {children}
    </EncomendaContext.Provider>
  );
}

export function useEncomenda() {
  const context = useContext(EncomendaContext);
  if (!context) throw new Error('useEncomenda deve ser usado dentro de um EncomendaProvider');
  return context;
}