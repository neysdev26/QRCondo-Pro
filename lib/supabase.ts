import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

// Se isso aparecer no seu terminal, as chaves não estão sendo lidas!
if (!supabaseUrl || !supabaseAnonKey) {
  console.log("⚠️ ALERTA: Variáveis de ambiente não carregadas!");
  console.log("URL:", supabaseUrl);
  console.log("KEY:", supabaseAnonKey ? "Presente" : "Faltando");
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co', 
  supabaseAnonKey || 'placeholder'
);