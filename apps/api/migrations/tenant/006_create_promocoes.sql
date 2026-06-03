CREATE TABLE promocoes (
  id                UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome              TEXT          NOT NULL,
  tipo              TEXT          NOT NULL
                      CHECK (tipo IN ('desconto_fixo', 'desconto_percentual', 'compre_ganhe', 'segunda_peca', 'categoria')),
  valor_desconto    NUMERIC(10,2),
  unidade           TEXT,           -- 'reais' ou 'percentual'
  quantidade_minima INT,
  quantidade_brinde INT,
  percentual_brinde NUMERIC(5,2),
  inicio            DATE,
  fim               DATE,
  categoria_alvo    TEXT,
  ativo             BOOLEAN       NOT NULL DEFAULT true
);

CREATE TABLE promocoes_produtos (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  promocao_id   UUID NOT NULL REFERENCES promocoes(id) ON DELETE CASCADE,
  produto_id    UUID NOT NULL REFERENCES produtos(id) ON DELETE CASCADE,
  UNIQUE (promocao_id, produto_id)
);
