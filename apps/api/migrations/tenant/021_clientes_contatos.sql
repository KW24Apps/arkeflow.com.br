-- Contatos do cliente (comercial, financeiro, sócio/representante)
CREATE TABLE IF NOT EXISTS clientes_contatos (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  cliente_id  UUID        NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  tipo        TEXT        NOT NULL CHECK (tipo IN ('comercial', 'financeiro', 'socio')),
  nome        TEXT        NOT NULL,
  telefone    TEXT,
  email       TEXT,
  criado_em   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_clientes_contatos_cliente ON clientes_contatos(cliente_id);
