class QRService {
  // Valida se o QR Code tem formato válido
  validateQRCode(qrCode: string): boolean {
    return !!qrCode && qrCode.length >= 3;
  }

  // Gera ID único para encomenda
  generateEncomendaId(): string {
    return Date.now().toString() + Math.random().toString(36).substr(2, 9);
  }

  // Formata QR Code para exibição
  formatQRCode(qrCode: string): string {
    return qrCode.toUpperCase().trim();
  }
}

export const qrService = new QRService();