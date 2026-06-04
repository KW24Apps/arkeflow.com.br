-- Dados complementares da loja (editáveis pelo dono)
ALTER TABLE lojas
  ADD COLUMN IF NOT EXISTS logo_url    TEXT,
  ADD COLUMN IF NOT EXISTS link_loja   TEXT,      -- futuro subdomínio/domínio próprio
  ADD COLUMN IF NOT EXISTS cep         TEXT,
  ADD COLUMN IF NOT EXISTS logradouro  TEXT,
  ADD COLUMN IF NOT EXISTS numero      TEXT,
  ADD COLUMN IF NOT EXISTS complemento TEXT,
  ADD COLUMN IF NOT EXISTS bairro      TEXT,
  ADD COLUMN IF NOT EXISTS cidade      TEXT,
  ADD COLUMN IF NOT EXISTS estado      CHAR(2);

-- Contatos da loja (comercial, financeiro, sócio/representante)
CREATE TABLE IF NOT EXISTS lojas_contatos (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  loja_id     UUID        NOT NULL REFERENCES lojas(id) ON DELETE CASCADE,
  tipo        TEXT        NOT NULL CHECK (tipo IN ('comercial', 'financeiro', 'socio')),
  nome        TEXT        NOT NULL,
  telefone    TEXT,
  email       TEXT,
  criado_em   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lojas_contatos_loja ON lojas_contatos(loja_id);
