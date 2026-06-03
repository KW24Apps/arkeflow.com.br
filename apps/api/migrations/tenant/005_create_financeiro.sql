CREATE TABLE notas_fiscais (
  id            UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  venda_id      UUID        NOT NULL REFERENCES vendas(id),
  tipo          TEXT        NOT NULL CHECK (tipo IN ('nfe', 'nfce')),
  numero        TEXT,
  chave_acesso  TEXT        UNIQUE,
  status        TEXT        NOT NULL DEFAULT 'pendente'
                  CHECK (status IN ('pendente', 'autorizada', 'rejeitada', 'cancelada')),
  xml_url       TEXT,
  emitida_em    TIMESTAMPTZ
);

CREATE TABLE lancamentos (
  id          UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  tipo        TEXT          NOT NULL CHECK (tipo IN ('entrada', 'saida')),
  descricao   TEXT          NOT NULL,
  valor       NUMERIC(10,2) NOT NULL,
  venda_id    UUID          REFERENCES vendas(id),  -- null para lançamentos manuais
  data        DATE          NOT NULL DEFAULT CURRENT_DATE,
  categoria   TEXT,
  status      TEXT          NOT NULL DEFAULT 'realizado'
                CHECK (status IN ('realizado', 'pendente'))
);

CREATE INDEX idx_lancamentos_data ON lancamentos(data);
