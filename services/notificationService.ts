import * as Contacts from 'expo-contacts';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Linking, Platform, Alert } from 'react-native';
import { Encomenda } from '../types';
import { pdfService } from './pdfService';

export const notificationService = {
  
  enviarAvisoSMS: async (encomenda: Encomenda) => {
    try {
      const { status } = await Contacts.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert("Permissão Negada", "Acesse as configurações para permitir acesso aos contatos.");
        return;
      }

      const blocoFmt = String(encomenda.bloco).padStart(2, '0');
      const aptoFmt = String(encomenda.apartamento).padStart(3, '0');
      const termoBusca = `${blocoFmt}/${aptoFmt}`;

      const { data } = await Contacts.getContactsAsync({
        name: termoBusca,
        fields: [Contacts.Fields.PhoneNumbers],
      });

      if (data.length === 0) {
        Alert.alert("Não encontrado", `Nenhum contato com "${termoBusca}" na agenda.`);
        return;
      }

      const telefone = data[0].phoneNumbers?.[0]?.number;
      if (!telefone) {
        Alert.alert("Erro", "Contato encontrado sem número de telefone.");
        return;
      }

      const mensagem = `CRSGS: Encomenda de ${encomenda.remetente || 'Remetente'}, disponível para ${encomenda.destinatario} (${termoBusca}).`;
      
      const url = Platform.OS === 'ios' 
        ? `sms:${telefone}&body=${encodeURIComponent(mensagem)}` 
        : `sms:${telefone}?body=${encodeURIComponent(mensagem)}`;

      const suportado = await Linking.canOpenURL(url);
      if (suportado) {
        await Linking.openURL(url);
      } else {
        Alert.alert("Erro", "Aplicativo de SMS não disponível.");
      }
    } catch (err) {
      Alert.alert("Erro", "Falha ao acessar agenda de contatos.");
    }
  },

  compartilharComprovante: async (encomenda: Encomenda) => {
    try {
      // 1. Obtemos o HTML base do pdfService
      let html = pdfService.gerarHTMLEncomenda(encomenda);

      // 2. Definimos um CSS compacto para forçar tudo em uma única página
      const estiloCompacto = `
        <style>
          @page { margin: 10mm; }
          body { font-family: sans-serif; font-size: 12px; line-height: 1.2; margin: 0; padding: 0; }
          h1 { font-size: 18px; margin: 0 0 5px 0; }
          h3 { font-size: 14px; margin: 10px 0 5px 0; border-bottom: 1px solid #eee; }
          p { margin: 2px 0; }
          .signature-container { 
            margin-top: 15px; 
            text-align: center; 
            page-break-inside: avoid; 
          }
          .signature-img { 
            width: 250px; 
            height: auto; 
            max-height: 100px; 
            border-bottom: 1px solid #000; 
          }
          .footer { font-size: 10px; margin-top: 15px; color: #666; text-align: center; }
        </style>
      `;

      // 3. Injetamos a assinatura se existir
      let assinaturaHtml = "";
      if (encomenda.assinatura) {
        assinaturaHtml = `
          <div class="signature-container">
            <p><strong>Assinatura Digital:</strong></p>
            <img src="${encomenda.assinatura}" class="signature-img" />
            <p>Retirado em: ${new Date(encomenda.data_retirada!).toLocaleString('pt-BR')}</p>
          </div>
        `;
      }

      // 4. Montamos o HTML final combinando o estilo compacto e o conteúdo
     
      html = `
        <html>
          <head>${estiloCompacto}</head>
          <body>
            ${html.replace(/<style>[\s\S]*?<\/style>/, "")} ${assinaturaHtml}
            <div class="footer">Este documento é um comprovante oficial de entrega.</div>
          </body>
        </html>
      `;

      // 5. Gera o PDF
      const { uri } = await Print.printToFileAsync({ html });

      // 6. Compartilha
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: 'application/pdf',
          dialogTitle: `Comprovante - ${encomenda.destinatario}`,
          UTI: 'com.adobe.pdf'
        });
      }
    } catch (err) {
      console.error(err);
      Alert.alert("Erro", "Falha ao gerar o comprovante compactado.");
    }
  }
};