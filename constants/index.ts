export const STORAGE_KEYS = {
  ENCOMENDAS: '@encomendas_condominio:encomendas',
  BLOCOS: '@encomendas_condominio:blocos',
  BACKUP: '@encomendas_condominio:backup'
};

export const BLOCOS_PADRAO = [
  {
    id: '1',
    nome: 'Bloco A',
    apartamentos: Array.from({length: 20}, (_, i) => `${i + 101}`)
  },
  {
    id: '2', 
    nome: 'Bloco B',
    apartamentos: Array.from({length: 20}, (_, i) => `${i + 201}`)
  },
  {
    id: '3',
    nome: 'Bloco C', 
    apartamentos: Array.from({length: 20}, (_, i) => `${i + 301}`)
  }
];

export const COLORS = {
  primary: '#1976D2',
  secondary: '#00ACC1',
  accent: '#FF6B35',
  background: '#aaacaeff',
  surface: '#FFFFFF',
  text: '#1A1A1A',
  textSecondary: '#6C757D',
  success: '#00C853',
  warning: '#FFC107',
  error: '#E53935',
  border: '#040404ff',
  cardShadow: 'rgba(25, 118, 210, 0.08)',
};