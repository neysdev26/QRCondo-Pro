import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

export type PerfilUsuario = {
  id: string;
  condominio_id: number | string;
  nome: string;
  tipo_usuario: 'porteiro' | 'morador';
  apartamento?: string;
  bloco?: string;
};

export type AuthContextData = {
  session: Session | null;
  user: User | null;
  perfil: PerfilUsuario | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextData>({} as AuthContextData);

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [perfil, setPerfil] = useState<PerfilUsuario | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // 🔥 Usa ReturnType<typeof setTimeout> em vez de NodeJS.Timeout
    let timeoutId: ReturnType<typeof setTimeout>;

    // Timeout de segurança: se não carregar em 10 segundos, força finalização
    timeoutId = setTimeout(() => {
      if (isLoading) {
        console.warn('⚠️ Timeout: forçando finalização do loading');
        setIsLoading(false);
      }
    }, 10000);

    async function loadSession() {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) {
          console.warn('⚠️ Erro ao carregar sessão:', error.message);
          setIsLoading(false);
          return;
        }

        const session = data.session;
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          await carregarPerfil(session.user.id);
        } else {
          setIsLoading(false);
        }
      } catch (error) {
        console.error('💥 Erro inesperado ao carregar sessão:', error);
        setIsLoading(false);
      } finally {
        clearTimeout(timeoutId);
      }
    }

    loadSession();

    // 🔥 Escuta mudanças de autenticação (incluindo refresh de token)
    const { data: listener } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('🔄 Auth state changed:', event);

      // Se o token foi atualizado ou o usuário entrou
      if (event === 'TOKEN_REFRESHED' || event === 'SIGNED_IN') {
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          await carregarPerfil(session.user.id);
        }
        setIsLoading(false);
      }

      // Se o usuário fez logout
      if (event === 'SIGNED_OUT') {
        setSession(null);
        setUser(null);
        setPerfil(null);
        setIsLoading(false);
      }

      // 🔥 Se a sessão for inicializada a partir do storage
      if (event === 'INITIAL_SESSION') {
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          await carregarPerfil(session.user.id);
        }
        setIsLoading(false);
      }
    });

    return () => {
      clearTimeout(timeoutId);
      listener?.subscription.unsubscribe();
    };
  }, []);

  async function carregarPerfil(userId: string) {
    try {
      const { data, error } = await supabase
        .from('perfis_usuarios')
        .select('*')
        .eq('id', userId)
        .maybeSingle();
      if (error) throw error;
      setPerfil(data || null);
    } catch (error) {
      console.error('Erro ao carregar perfil:', error);
      setPerfil(null);
    } finally {
      setIsLoading(false);
    }
  }

  async function signIn(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  }

  async function signOut() {
    await supabase.auth.signOut();
  }

  return (
    <AuthContext.Provider value={{ session, user, perfil, isLoading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}