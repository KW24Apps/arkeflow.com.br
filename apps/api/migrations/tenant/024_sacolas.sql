-- Sacolas (hold carts) created by mobile salespeople
CREATE TABLE sacolas (
  id            UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  criado_por    UUID,                                    -- usuario_id from platform
  nome_vendedor TEXT,                                    -- denormalized for fast display
  cliente_id    UUID,
  cliente_nome  TEXT,
  status        TEXT        NOT NULL DEFAULT 'aguardando'
                  CHECK (status IN ('aguardando','em_atendimento','finalizada','cancelada')),
  observacao    TEXT,
  criado_em     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE sacola_itens (
  id             UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  sacola_id      UUID          NOT NULL REFERENCES sacolas(id) ON DELETE CASCADE,
  versao_id      UUID          NOT NULL,
  produto_id     UUID          NOT NULL,
  nome           TEXT          NOT NULL,
  atributos      JSONB         NOT NULL DEFAULT '{}',
  preco_unitario NUMERIC(10,2) NOT NULL,
  quantidade     INTEGER       NOT NULL DEFAULT 1,
  codigo_barras  TEXT
);

CREATE INDEX ON sacolas(status);
CREATE INDEX ON sacolas(criado_em DESC);
CREATE INDEX ON sacola_itens(sacola_id);
