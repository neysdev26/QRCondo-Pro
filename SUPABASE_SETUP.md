# Configuração do Supabase - QrCondo

## 📋 Instruções para Criar as Tabelas

Acesse o painel do Supabase em: https://acryossmsuyhbbgqkkon.supabase.co

Vá em **SQL Editor** e execute os comandos abaixo:

---

## 1️⃣ Criar Tabela de Encomendas

```sql
-- Criar tabela de encomendas
CREATE TABLE encomendas (
  id TEXT PRIMARY KEY,
  qr_code TEXT NOT NULL UNIQUE,
  destinatario TEXT NOT NULL,
  bloco TEXT NOT NULL,
  apartamento TEXT NOT NULL,
  remetente TEXT,
  observacoes TEXT,
  data_chegada TIMESTAMPTZ NOT NULL,
  data_retirada TIMESTAMPTZ,
  assinatura TEXT,
  nome_recebedor TEXT,
  porteiro_entrega TEXT,
  status TEXT NOT NULL CHECK (status IN ('pendente', 'retirada')),
  porteiro TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Criar índices para melhor performance
CREATE INDEX idx_encomendas_qr_code ON encomendas(qr_code);
CREATE INDEX idx_encomendas_status ON encomendas(status);
CREATE INDEX idx_encomendas_bloco ON encomendas(bloco);
CREATE INDEX idx_encomendas_data_chegada ON encomendas(data_chegada DESC);

-- Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_encomendas_updated_at
BEFORE UPDATE ON encomendas
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
```

---

## 2️⃣ Criar Tabela de Blocos

```sql
-- Criar tabela de blocos
CREATE TABLE blocos (
  id TEXT PRIMARY KEY,
  nome TEXT NOT NULL UNIQUE,
  apartamentos TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Criar índices
CREATE INDEX idx_blocos_nome ON blocos(nome);

-- Trigger para atualizar updated_at automaticamente
CREATE TRIGGER update_blocos_updated_at
BEFORE UPDATE ON blocos
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
```

---

## 3️⃣ Habilitar Row Level Security (RLS) - IMPORTANTE!

```sql
-- Habilitar RLS nas tabelas
ALTER TABLE encomendas ENABLE ROW LEVEL SECURITY;
ALTER TABLE blocos ENABLE ROW LEVEL SECURITY;

-- Política de acesso público para encomendas (ajuste conforme necessidade de segurança)
CREATE POLICY "Permitir acesso público a encomendas"
ON encomendas FOR ALL
USING (true)
WITH CHECK (true);

-- Política de acesso público para blocos
CREATE POLICY "Permitir acesso público a blocos"
ON blocos FOR ALL
USING (true)
WITH CHECK (true);
```

⚠️ **IMPORTANTE**: As políticas acima permitem acesso total. Se você quiser adicionar autenticação no futuro, substitua `true` por regras específicas de usuário.

---

## 4️⃣ Habilitar Realtime

Para que as atualizações funcionem em tempo real:

1. Vá em **Database** → **Replication** no painel do Supabase
2. Habilite replication para as tabelas:
   - ✅ `encomendas`
   - ✅ `blocos`

Ou execute via SQL:

```sql
-- Habilitar realtime para as tabelas
ALTER PUBLICATION supabase_realtime ADD TABLE encomendas;
ALTER PUBLICATION supabase_realtime ADD TABLE blocos;
```

---

## 5️⃣ (Opcional) Inserir Blocos de Exemplo

```sql
-- Inserir blocos de exemplo
INSERT INTO blocos (id, nome, apartamentos) VALUES
  ('1', 'Bloco A', ARRAY['101', '102', '103', '201', '202', '203']),
  ('2', 'Bloco B', ARRAY['101', '102', '103', '201', '202', '203']),
  ('3', 'Bloco C', ARRAY['101', '102', '103', '201', '202', '203']);
```

---

## ✅ Verificação

Após executar os comandos, verifique se tudo está correto:

```sql
-- Verificar tabelas criadas
SELECT * FROM encomendas LIMIT 1;
SELECT * FROM blocos;

-- Verificar índices
SELECT indexname FROM pg_indexes WHERE tablename = 'encomendas';
SELECT indexname FROM pg_indexes WHERE tablename = 'blocos';

-- Verificar políticas RLS
SELECT * FROM pg_policies WHERE tablename IN ('encomendas', 'blocos');
```

---

## 🚀 Como Funciona Agora

1. **Sincronização Automática**: Todos os dispositivos (mobile e web) sincronizam automaticamente via Supabase
2. **Tempo Real**: Mudanças aparecem instantaneamente em todos os dispositivos conectados
3. **Fallback Local**: Se o Supabase estiver indisponível, o app continua funcionando com armazenamento local
4. **Backup Automático**: Dados são salvos localmente e no Supabase simultaneamente

---

## 📱 Acessar do PC

Depois de configurar, você pode acessar o app pelo navegador e ver os mesmos dados em tempo real que aparecem no celular!

URL de desenvolvimento: `http://localhost:8081` (após executar `npx expo start`)
