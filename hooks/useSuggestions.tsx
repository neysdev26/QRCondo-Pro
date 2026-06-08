import { useState, useEffect, useMemo } from 'react';
import { useEncomenda } from './useEncomenda';
import { suggestionService } from '../services/suggestionService';

interface SuggestionResult {
  destinatario: string;
  bloco: string;
  apartamento: string;
  frequency: number;
}

export function useSuggestions(searchTerm: string) {
  const { encomendas } = useEncomenda();
  const [suggestions, setSuggestions] = useState<SuggestionResult[]>([]);

  // Debounce: esperar 300ms após última digitação
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchTerm && searchTerm.trim().length >= 2) {
        const results = suggestionService.getSuggestions(encomendas, searchTerm);
        setSuggestions(results);
      } else {
        setSuggestions([]);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm, encomendas]);

  // Buscar melhor sugestão para nome exato
  const getBestMatch = (exactName: string) => {
    return suggestionService.getBestSuggestion(encomendas, exactName);
  };

  // Buscar apenas nomes de destinatários
  const getDestinatarioSuggestions = useMemo(() => {
    if (searchTerm && searchTerm.trim().length >= 2) {
      return suggestionService.getDestinatarioSuggestions(encomendas, searchTerm);
    }
    return [];
  }, [searchTerm, encomendas]);

  return {
    suggestions,
    getBestMatch,
    destinatarioSuggestions: getDestinatarioSuggestions,
    hasSuggestions: suggestions.length > 0
  };
}
