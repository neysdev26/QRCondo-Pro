import { Encomenda } from '../types';

interface Suggestion {
  destinatario: string;
  bloco: string;
  apartamento: string;
  frequency: number; // Quantas vezes essa combinação apareceu
}

class SuggestionService {
  /**
   * Busca sugestões de bloco e apartamento baseadas no nome do destinatário
   * @param encomendas Lista de todas as encomendas
   * @param searchTerm Nome parcial ou completo do destinatário
   * @returns Lista de sugestões ordenadas por frequência
   */
  getSuggestions(encomendas: Encomenda[], searchTerm: string): Suggestion[] {
    if (!searchTerm || searchTerm.trim().length < 2) {
      return [];
    }

    const normalizedSearch = searchTerm.toLowerCase().trim();

    // Filtrar encomendas que correspondem ao termo de busca
    const matchingEncomendas = encomendas.filter(enc => 
      enc.destinatario.toLowerCase().includes(normalizedSearch)
    );

    if (matchingEncomendas.length === 0) {
      return [];
    }

    // Agrupar por destinatário exato + bloco + apartamento
    const groupMap = new Map<string, Suggestion>();

    matchingEncomendas.forEach(enc => {
      const key = `${enc.destinatario.toLowerCase()}|${enc.bloco}|${enc.apartamento}`;
      
      if (groupMap.has(key)) {
        const existing = groupMap.get(key)!;
        existing.frequency += 1;
      } else {
        groupMap.set(key, {
          destinatario: enc.destinatario,
          bloco: String(enc.bloco || ""),
          apartamento: String(enc.apartamento || ""),
          frequency: 1
        });
      }
    });

    // Converter para array e ordenar por frequência (mais usado primeiro)
    const suggestions = Array.from(groupMap.values())
      .sort((a, b) => b.frequency - a.frequency);

    return suggestions;
  }

  /**
   * Busca a melhor sugestão (mais frequente) para um destinatário específico
   * @param encomendas Lista de todas as encomendas
   * @param destinatario Nome exato do destinatário
   * @returns Melhor sugestão ou null
   */
  getBestSuggestion(encomendas: Encomenda[], destinatario: string): Omit<Suggestion, 'frequency'> | null {
    const suggestions = this.getSuggestions(encomendas, destinatario);
    
    // Filtrar apenas matches exatos (case insensitive)
    const exactMatches = suggestions.filter(s => 
      s.destinatario.toLowerCase() === destinatario.toLowerCase()
    );

    if (exactMatches.length === 0) {
      return null;
    }

    // Retornar o mais frequente
    const best = exactMatches[0];
    return {
      destinatario: best.destinatario,
      bloco: best.bloco,
      apartamento: best.apartamento
    };
  }

  /**
   * Busca sugestões únicas de destinatários
   * @param encomendas Lista de todas as encomendas
   * @param searchTerm Termo de busca
   * @returns Lista de nomes únicos
   */
  getDestinatarioSuggestions(encomendas: Encomenda[], searchTerm: string): string[] {
    if (!searchTerm || searchTerm.trim().length < 2) {
      return [];
    }

    const normalizedSearch = searchTerm.toLowerCase().trim();

    // Extrair nomes únicos que correspondem
    const uniqueNames = new Set<string>();
    
    encomendas.forEach(enc => {
      if (enc.destinatario.toLowerCase().includes(normalizedSearch)) {
        uniqueNames.add(enc.destinatario);
      }
    });

    // Ordenar alfabeticamente
    return Array.from(uniqueNames).sort();
  }
}

export const suggestionService = new SuggestionService();
