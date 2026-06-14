CREATE TABLE provas_em_casa (
  id             UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  criado_por     UUID,
  nome_vendedor  TEXT,
  cliente_id     UUID,
  cliente_nome   TEXT,
  prazo          DATE,
  observacao     TEXT,
  status         TEXT NOT NULL DEFAULT 'em_prova'
                   CHECK (status IN ('em_prova', 'aguardando_caixa', 'finalizada', 'cancelada')),
  criado_em      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE prova_itens (
  id             UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  prova_id       UUID          NOT NULL REFERENCES provas_em_casa(id) ON DELETE CASCADE,
  versao_id      UUID          NOT NULL,
  produto_id     UUID          NOT NULL,
  nome           TEXT          NOT NULL,
  atributos      JSONB         NOT NULL DEFAULT '{}',
  preco_unitario NUMERIC(10,2) NOT NULL,
  quantidade     INTEGER       NOT NULL DEFAULT 1,
  codigo_barras  TEXT,
  devolvido      BOOLEAN       NOT NULL DEFAULT false
);

CREATE INDEX ON provas_em_casa(status);
CREATE INDEX ON provas_em_casa(criado_em DESC);
CREATE INDEX ON prova_itens(prova_id);
