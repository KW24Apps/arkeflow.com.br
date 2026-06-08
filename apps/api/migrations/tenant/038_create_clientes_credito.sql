CREATE TABLE IF NOT EXISTS clientes_credito (
  cliente_id       UUID PRIMARY KEY REFERENCES clientes(id) ON DELETE CASCADE,
  credito_liberado BOOLEAN NOT NULL DEFAULT false,
  limite           NUMERIC(10,2) NOT NULL DEFAULT 0,
  criado_em        TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em    TIMESTAMPTZ NOT NULL DEFAULT now()
);
