// utils/gerarChave.ts
export function gerarChave(tipo: 'porteiro' | 'morador', condominioId: number): string {
  // Gera uma chave no formato: TIPO-XXXXX-COND-ID
  // Exemplo: PORT-7F3A1-1 ou MORA-9B2D4-1
  const prefixo = tipo === 'porteiro' ? 'PORT' : 'MORA';
  const random = Math.random().toString(36).substring(2, 7).toUpperCase();
  return `${prefixo}-${random}-${condominioId}`;
}