CREATE TABLE planos (
  id              UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome            TEXT         NOT NULL,
  preco_mensal    NUMERIC(10,2) NOT NULL,
  max_usuarios    INT          NOT NULL DEFAULT 5,
  franquia_notas  INT          NOT NULL DEFAULT 0,
  tem_financeiro  BOOLEAN      NOT NULL DEFAULT false,
  tem_cashback    BOOLEAN      NOT NULL DEFAULT false,
  tem_promocoes   BOOLEAN      NOT NULL DEFAULT false,
  ativo           BOOLEAN      NOT NULL DEFAULT true
);
