-- Controle de abertura/fechamento de caixa por turno
CREATE TABLE turnos_caixa (
  id            UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  usuario_id    UUID          NOT NULL,           -- quem abriu o caixa
  saldo_inicial NUMERIC(10,2) NOT NULL DEFAULT 0, -- dinheiro contado na abertura
  saldo_final   NUMERIC(10,2),                    -- dinheiro contado no fechamento
  observacao    TEXT,
  status        TEXT          NOT NULL DEFAULT 'aberto'
                  CHECK (status IN ('aberto', 'fechado')),
  aberto_em     TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  fechado_em    TIMESTAMPTZ
);

-- Sangrias e suprimentos do caixa (dinheiro retirado/adicionado durante o turno)
CREATE TABLE movimentos_caixa (
  id          UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  turno_id    UUID          NOT NULL REFERENCES turnos_caixa(id),
  tipo        TEXT          NOT NULL CHECK (tipo IN ('sangria', 'suprimento')),
  valor       NUMERIC(10,2) NOT NULL,
  motivo      TEXT,
  criado_em   TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);
