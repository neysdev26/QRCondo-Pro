📦 QRCondo Pro - Gestão de Encomendas
Sistema mobile para controle de entrada e saída de encomendas em condomínios, 
focado em performance e integridade de dados.

🚀 Funcionalidades Principais
Scanner QR Code: Leitura rápida com mira visual centralizada e feedback sonoro (BIP).
Dashboard Inteligente: Métricas em tempo real (Chegadas, Pendentes e Entregues).
Assinatura Digital: Captura de assinatura na tela para comprovação de entrega.
Comprovante PDF: Geração e compartilhamento automático de protocolos de entrega.
Busca com Autocomplete: Sugestões inteligentes para destinatários e remetentes.

🛠️ Arquitetura Técnica
O app utiliza uma arquitetura de Tabela de Histórico, garantindo que a tabela principal de operação permaneça leve.
Frontend: React Native (Expo Router)
Backend: Supabase (PostgreSQL)
Estratégia de Dados: 
* encomendas: Apenas registros pendentes na portaria.
* encomendas_historico: Registros finalizados com assinatura.
* dashboard_stats: View SQL para processamento de métricas no servidor.

📊 Lógica do Dashboard
Para garantir a precisão de 100+ pacotes diários, a contagem foi delegada ao banco de dados:
Métrica         Origem do Cálculo (SQL)
Chegaram Hoje   Soma de encomendas + encomendas_historico com data_chegada = hoje.
Pendentes       Total de registros na tabela encomendas.
Entregues       HojeTotal de registros na tabela encomendas_historico com data_retirada = hoje.

⚙️ Configuração do Banco (SQL)
Para o funcionamento correto dos contadores, a seguinte View deve estar presente no Supabase:
SQLCREATE OR REPLACE VIEW dashboard_stats AS SELECT
  (SELECT count(*) FROM encomendas WHERE (data_chegada AT TIME ZONE 'UTC' AT TIME ZONE 'America/Sao_Paulo')::date = current_date) +
  (SELECT count(*) FROM encomendas_historico WHERE (data_chegada AT TIME ZONE 'UTC' AT TIME ZONE 'America/Sao_Paulo')::date = current_date) as chegados_hoje,
  (SELECT count(*) FROM encomendas) as pendentes_total,
  (SELECT count(*) FROM encomendas_historico WHERE (data_retirada AT TIME ZONE 'UTC' AT TIME ZONE 'America/Sao_Paulo')::date = current_date) as entregues_hoje;
