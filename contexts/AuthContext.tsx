import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

export type PerfilUsuario = {
  id: string;
  condominio_id: number;
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
    let isMounted = true;

    async function loadSession() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!isMounted) return;
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          await carregarPerfil(session.user.id);
        } else {
          setIsLoading(false);
        }
      } catch (error) {
        console.error('Erro ao carregar sessão:', error);
        if (isMounted) setIsLoading(false);
      }
    }

    loadSession();

    const { data: listener } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!isMounted) return;
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        await carregarPerfil(session.user.id);
      } else {
        setPerfil(null);
        setIsLoading(false);
      }
    });

    return () => {
      isMounted = false;
      listener?.subscription.unsubscribe();
    };
  }, []);

  async function carregarPerfil(userId: string) {
    try {
      const { data, error } = await supabase
        .from('perfis_usuarios')
        .select('*')
        .eq('id', userId)
        .maybeSingle(); // 🔥 importante: não lança erro se não encontrar
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