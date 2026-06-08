import React, { createContext, useContext, useState } from 'react';

// Cores padrão para o sistema
const defaultTheme = {
  accent: '#1974f4',      // Azul principal
  subtext: '#64748b',     // Cinza secundário
  card: '#FFFFFF',        // Fundo dos cartões
  border: '#e2e8f0',      // Cor das bordas
  background: '#ced5df',  // Fundo da app
  success: '#10B981',     // Verde para entregas
};

interface ThemeContextType {
  theme: typeof defaultTheme;
}

// 1. Criação do Contexto
const ThemeContext = createContext<ThemeContextType>({
  theme: defaultTheme,
});

// 2. Hook useTheme (Exportação nomeada para o seu _layout.tsx)
export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme deve ser usado dentro de um ThemeProvider');
  }
  return context;
};
