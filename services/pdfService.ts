import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';
import { Encomenda } from '../types';

export const pdfService = {
  async exportarEncomendasPDF(encomendas: Encomenda[]): Promise<void> {
    try {
      const html = this.gerarHTMLEncomendas(encomendas);
      
      const { uri } = await Print.printToFileAsync({
        html,
        base64: false
      });

      if (Platform.OS === 'web') {
        // No web, download direto
        const link = document.createElement('a');
        link.href = uri;
        link.download = `encomendas_${new Date().toISOString().split('T')[0]}.pdf`;
        link.click();
      } else {
        // No mobile, compartilhar
        await Sharing.shareAsync(uri, {
          mimeType: 'application/pdf',
          dialogTitle: 'Compartilhar Relatório de Encomendas',
          UTI: 'com.adobe.pdf'
        });
      }
    } catch (error) {
      console.error('Erro ao exportar PDF:', error);
      throw new Error('Não foi possível exportar o PDF');
    }
  },

  async exportarEncomendaPDF(encomenda: Encomenda): Promise<void> {
    try {
      const html = this.gerarHTMLEncomenda(encomenda);
      
      const { uri } = await Print.printToFileAsync({
        html,
        base64: false
      });

      if (Platform.OS === 'web') {
        const link = document.createElement('a');
        link.href = uri;
        link.download = `encomenda_${encomenda.qr_code.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
        link.click();
      } else {
        await Sharing.shareAsync(uri, {
          mimeType: 'application/pdf',
          dialogTitle: 'Compartilhar Comprovante de Encomenda',
          UTI: 'com.adobe.pdf'
        });
      }
    } catch (error) {
      console.error('Erro ao exportar PDF:', error);
      throw new Error('Não foi possível exportar o PDF');
    }
  },

  gerarHTMLEncomendas(encomendas: Encomenda[]): string {
    const encomendasPendentes = encomendas.filter(e => e.status === 'pendente');
    const encomendasRetiradas = encomendas.filter(e => e.status === 'retirada');

    const linhasHTML = encomendas.map((enc, index) => `
      <tr style="border-bottom: 1px solid #E0E0E0;">
        <td style="padding: 12px 8px;">${index + 1}</td>
        <td style="padding: 12px 8px;">${enc.destinatario}</td>
        <td style="padding: 12px 8px;">${enc.bloco}</td>
        <td style="padding: 12px 8px;">${enc.apartamento}</td>
        <td style="padding: 12px 8px;">${enc.remetente || '-'}</td>
        <td style="padding: 12px 8px;">${new Date(enc.data_chegada).toLocaleDateString('pt-BR')} ${new Date(enc.data_chegada).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</td>
        <td style="padding: 12px 8px;">${enc.data_retirada ? `${new Date(enc.data_retirada).toLocaleDateString('pt-BR')} ${new Date(enc.data_retirada).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}` : '-'}</td>
        <td style="padding: 12px 8px;">
          <span style="padding: 4px 8px; border-radius: 12px; font-size: 12px; font-weight: 500; background-color: ${enc.status === 'pendente' ? '#FFF3E0' : '#E8F5E8'}; color: ${enc.status === 'pendente' ? '#F57C00' : '#2E7D32'};">
            ${enc.status === 'pendente' ? 'Pendente' : 'Retirada'}
          </span>
        </td>
        <td style="padding: 12px 8px;">${enc.quem_retirou || '-'}</td>
        <td style="padding: 12px 8px;">${enc.porteiro_entrega || '-'}</td>
        <td style="padding: 12px 8px;">${enc.porteiro}</td>
      </tr>
    `).join('');

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Relatório de Encomendas</title>
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          
          body {
            font-family: 'Arial', sans-serif;
            padding: 20px;
            color: #333;
            line-height: 1.6;
          }
          
          .header {
            text-align: center;
            margin-bottom: 30px;
            padding-bottom: 20px;
            border-bottom: 3px solid #2E7D32;
          }
          
          .header h1 {
            color: #2E7D32;
            font-size: 28px;
            margin-bottom: 10px;
          }
          
          .header p {
            color: #666;
            font-size: 14px;
          }
          
          .summary {
            display: flex;
            justify-content: space-around;
            margin-bottom: 30px;
            padding: 20px;
            background-color: #F5F5F5;
            border-radius: 8px;
          }
          
          .summary-item {
            text-align: center;
          }
          
          .summary-item .number {
            font-size: 32px;
            font-weight: bold;
            color: #2E7D32;
            display: block;
          }
          
          .summary-item .label {
            font-size: 14px;
            color: #666;
            margin-top: 5px;
          }
          
          table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 30px;
            background-color: white;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          }
          
          thead {
            background-color: #2E7D32;
            color: white;
          }
          
          th {
            padding: 12px 8px;
            text-align: left;
            font-weight: 600;
            font-size: 12px;
            text-transform: uppercase;
          }
          
          td {
            font-size: 13px;
          }
          
          .footer {
            margin-top: 40px;
            text-align: center;
            font-size: 12px;
            color: #999;
            padding-top: 20px;
            border-top: 1px solid #E0E0E0;
          }
          
          @media print {
            body {
              padding: 10px;
            }
            
            .summary {
              page-break-inside: avoid;
            }
            
            table {
              page-break-inside: auto;
            }
            
            tr {
              page-break-inside: avoid;
              page-break-after: auto;
            }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>📦 Relatório de Encomendas</h1>
          <p>Gerado em ${new Date().toLocaleDateString('pt-BR', { 
            day: '2-digit', 
            month: 'long', 
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          })}</p>
        </div>
        
        <div class="summary">
          <div class="summary-item">
            <span class="number">${encomendas.length}</span>
            <span class="label">Total de Encomendas</span>
          </div>
          <div class="summary-item">
            <span class="number" style="color: #F57C00;">${encomendasPendentes.length}</span>
            <span class="label">Pendentes</span>
          </div>
          <div class="summary-item">
            <span class="number" style="color: #2E7D32;">${encomendasRetiradas.length}</span>
            <span class="label">Retiradas</span>
          </div>
        </div>
        
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Destinatário</th>
              <th>Bloco</th>
              <th>Apt</th>
              <th>Remetente</th>
              <th>Data Chegada</th>
              <th>Data Retirada</th>
              <th>Status</th>
              <th>Recebedor</th>
              <th>Entregue por</th>
              <th>Cadastrado por</th>
            </tr>
          </thead>
          <tbody>
            ${linhasHTML}
          </tbody>
        </table>
        
        <div class="footer">
          <p>QrCondo App - Sistema de Controle de Encomendas</p>
          <p>Documento gerado automaticamente pelo sistema</p>
        </div>
      </body>
      </html>
    `;
  },

  gerarHTMLEncomenda(encomenda: Encomenda): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Comprovante de Encomenda</title>
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          
          body {
            font-family: 'Arial', sans-serif;
            padding: 30px;
            color: #333;
            line-height: 1.6;
            max-width: 800px;
            margin: 0 auto;
          }
          
          .header {
            text-align: center;
            margin-bottom: 30px;
            padding: 20px;
            background: linear-gradient(135deg, #2E7D32 0%, #66BB6A 100%);
            color: white;
            border-radius: 8px;
          }
          
          .header h1 {
            font-size: 28px;
            margin-bottom: 5px;
          }
          
          .header p {
            font-size: 14px;
            opacity: 0.9;
          }
          
          .status-badge {
            display: inline-block;
            padding: 8px 16px;
            border-radius: 20px;
            font-weight: bold;
            font-size: 14px;
            margin: 20px 0;
            background-color: ${encomenda.status === 'pendente' ? '#FFF3E0' : '#E8F5E8'};
            color: ${encomenda.status === 'pendente' ? '#F57C00' : '#2E7D32'};
          }
          
          .info-section {
            background-color: #F9F9F9;
            padding: 20px;
            border-radius: 8px;
            margin-bottom: 20px;
            border-left: 4px solid #2E7D32;
          }
          
          .info-section h2 {
            font-size: 18px;
            color: #2E7D32;
            margin-bottom: 15px;
            display: flex;
            align-items: center;
          }
          
          .info-row {
            display: flex;
            padding: 10px 0;
            border-bottom: 1px solid #E0E0E0;
          }
          
          .info-row:last-child {
            border-bottom: none;
          }
          
          .info-label {
            font-weight: 600;
            color: #666;
            min-width: 150px;
          }
          
          .info-value {
            color: #333;
            flex: 1;
          }
          
          .signature-section {
            margin-top: 30px;
            padding: 20px;
            background-color: white;
            border: 2px solid #E0E0E0;
            border-radius: 8px;
          }
          
          .signature-section h3 {
            font-size: 16px;
            color: #2E7D32;
            margin-bottom: 15px;
          }
          
          .signature-image {
            width: 100%;
            max-width: 400px;
            height: auto;
            border: 2px solid #E0E0E0;
            border-radius: 8px;
            padding: 10px;
            background-color: white;
            display: block;
            margin: 0 auto;
          }
          
          .qr-code {
            text-align: center;
            margin: 20px 0;
            padding: 15px;
            background-color: #F5F5F5;
            border-radius: 8px;
          }
          
          .qr-code code {
            font-family: 'Courier New', monospace;
            font-size: 14px;
            color: #2E7D32;
            font-weight: bold;
          }
          
          .footer {
            margin-top: 40px;
            text-align: center;
            font-size: 12px;
            color: #999;
            padding-top: 20px;
            border-top: 1px solid #E0E0E0;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>📦 Comprovante de Encomenda</h1>
          <p>Sistema de Controle de Encomendas</p>
        </div>
        
        <div style="text-align: center;">
          <span class="status-badge">
            ${encomenda.status === 'pendente' ? '⏳ Aguardando Retirada' : '✅ Encomenda Retirada'}
          </span>
        </div>
        
        <div class="info-section">
          <h2>📋 Informações do Destinatário</h2>
          <div class="info-row">
            <span class="info-label">Nome:</span>
            <span class="info-value">${encomenda.destinatario}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Bloco:</span>
            <span class="info-value">${encomenda.bloco}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Apartamento:</span>
            <span class="info-value">${encomenda.apartamento}</span>
          </div>
        </div>
        
        <div class="info-section">
          <h2>📅 Informações de Entrega</h2>
          <div class="info-row">
            <span class="info-label">Data de Chegada:</span>
            <span class="info-value">
              ${new Date(encomenda.data_chegada).toLocaleDateString('pt-BR', { 
                day: '2-digit', 
                month: 'long', 
                year: 'numeric' 
              })} às ${new Date(encomenda.data_chegada).toLocaleTimeString('pt-BR', { 
                hour: '2-digit', 
                minute: '2-digit' 
              })}
            </span>
          </div>
          ${encomenda.data_retirada ? `
            <div class="info-row">
              <span class="info-label">Data de Retirada:</span>
              <span class="info-value">
                ${new Date(encomenda.data_retirada).toLocaleDateString('pt-BR', { 
                  day: '2-digit', 
                  month: 'long', 
                  year: 'numeric' 
                })} às ${new Date(encomenda.data_retirada).toLocaleTimeString('pt-BR', { 
                  hour: '2-digit', 
                  minute: '2-digit' 
                })}
              </span>
            </div>
          ` : ''}
          ${encomenda.remetente ? `
            <div class="info-row">
              <span class="info-label">Remetente:</span>
              <span class="info-value">${encomenda.remetente}</span>
            </div>
          ` : ''}
          <div class="info-row">
            <span class="info-label">Cadastrado por:</span>
            <span class="info-value">${encomenda.porteiro}</span>
          </div>
          ${encomenda.porteiro_entrega ? `
          <div class="info-row">
            <span class="info-label">Entregue por:</span>
            <span class="info-value">${encomenda.porteiro_entrega}</span>
          </div>
          ` : ''}
          ${encomenda.observacoes ? `
            <div class="info-row">
              <span class="info-label">Observações:</span>
              <span class="info-value">${encomenda.observacoes}</span>
            </div>
          ` : ''}
        </div>
        
        ${encomenda.quem_retirou && encomenda.assinatura ? `
          <div class="signature-section">
            <h3>✍️ Confirmação de Recebimento</h3>
            <div class="info-row">
              <span class="info-label">Recebido por:</span>
              <span class="info-value">${encomenda.quem_retirou}</span>
            </div>
            <div style="margin-top: 20px;">
              <img src="${encomenda.assinatura}" alt="Assinatura" class="signature-image" />
            </div>
          </div>
        ` : ''}
        
        <div class="qr-code">
          <p style="margin-bottom: 10px; font-weight: 600; color: #666;">Código da Encomenda:</p>
          <code>${encomenda.qr_code}</code>
        </div>
        
        <div class="footer">
          <p><strong>QrCondo App</strong> - Sistema de Controle de Encomendas</p>
          <p>Documento gerado em ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}</p>
        </div>
      </body>
      </html>
    `;
  }
};
