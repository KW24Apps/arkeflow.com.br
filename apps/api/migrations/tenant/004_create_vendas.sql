CREATE TABLE vendas (
  id                  UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  cliente_id          UUID          REFERENCES clientes(id),
  usuario_id          UUID          NOT NULL,  -- ref ao banco da plataforma — sem FK real
  promocao_id         UUID,
  subtotal            NUMERIC(10,2) NOT NULL,
  desconto_promocao   NUMERIC(10,2) NOT NULL DEFAULT 0,
  desconto_pagamento  NUMERIC(10,2) NOT NULL DEFAULT 0,
  cashback_usado      NUMERIC(10,2) NOT NULL DEFAULT 0,
  total               NUMERIC(10,2) NOT NULL,
  cashback_gerado     NUMERIC(10,2) NOT NULL DEFAULT 0,
  status              TEXT          NOT NULL DEFAULT 'finalizada'
                        CHECK (status IN ('finalizada', 'cancelada', 'pendente_sync')),
  criado_em           TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE TABLE itens_venda (
  id              UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  venda_id        UUID          NOT NULL REFERENCES vendas(id) ON DELETE CASCADE,
  versao_id       UUID          NOT NULL REFERENCES versoes(id),
  quantidade      INT           NOT NULL,
  preco_unitario  NUMERIC(10,2) NOT NULL,
  desconto_item   NUMERIC(10,2) NOT NULL DEFAULT 0
);

CREATE TABLE pagamentos_venda (
  id                  UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  venda_id            UUID          NOT NULL REFERENCES vendas(id) ON DELETE CASCADE,
  forma_pagamento_id  UUID          NOT NULL REFERENCES formas_pagamento(id),
  valor               NUMERIC(10,2) NOT NULL,
  parcelas            INT           NOT NULL DEFAULT 1,
  detalhe             TEXT
);

-- Criada apenas quando a forma de pagamento for crediário
CREATE TABLE parcelas_crediario (
  id                  UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  pagamento_venda_id  UUID          NOT NULL REFERENCES pagamentos_venda(id) ON DELETE CASCADE,
  numero_parcela      INT           NOT NULL,
  valor               NUMERIC(10,2) NOT NULL,
  vencimento          DATE          NOT NULL,
  pago_em             DATE,
  status              TEXT          NOT NULL DEFAULT 'pendente'
                        CHECK (status IN ('pendente', 'pago', 'vencido'))
);

CREATE TABLE historico_cashback (
  id          UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  cliente_id  UUID          NOT NULL REFERENCES clientes(id),
  venda_id    UUID          REFERENCES vendas(id),
  tipo        TEXT          NOT NULL CHECK (tipo IN ('ganho', 'resgate')),
  valor       NUMERIC(10,2) NOT NULL,
  criado_em   TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_itens_venda     ON itens_venda(venda_id);
CREATE INDEX idx_pagamentos_venda ON pagamentos_venda(venda_id);
CREATE INDEX idx_cashback_cliente ON historico_cashback(cliente_id);
