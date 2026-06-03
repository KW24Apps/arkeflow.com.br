CREATE TABLE regras_cashback (
  id          UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome        TEXT          NOT NULL,
  percentual  NUMERIC(5,2)  NOT NULL DEFAULT 0,
  padrao      BOOLEAN       NOT NULL DEFAULT false,  -- apenas uma pode ser padrão
  ativo       BOOLEAN       NOT NULL DEFAULT true
);

CREATE TABLE clientes (
  id                UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome              TEXT          NOT NULL,
  telefone          TEXT,
  cpf               TEXT          UNIQUE,
  email             TEXT,
  regra_cashback_id UUID          REFERENCES regras_cashback(id),
  saldo_cashback    NUMERIC(10,2) NOT NULL DEFAULT 0,
  criado_em         TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);
