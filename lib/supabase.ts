import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

// Se as variáveis de ambiente não estiverem carregadas, exibe alerta
if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('⚠️ ALERTA: Variáveis de ambiente não carregadas!');
  console.log('URL:', supabaseUrl);
  console.log('KEY:', supabaseAnonKey ? 'Presente' : 'Faltando');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,          // Persiste sessão no AsyncStorage
    autoRefreshToken: true,         // Renova token automaticamente
    persistSession: true,           // Mantém sessão entre reinicializações
    detectSessionInUrl: false,      // Desativa detecção de sessão via URL
  },
});