CREATE TABLE formas_pagamento (
  id                  UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome                TEXT          NOT NULL,
  tipo                TEXT          NOT NULL,  -- dinheiro | pix | debito | credito | crediario | outro
  padrao_sistema      BOOLEAN       NOT NULL DEFAULT false,  -- formas padrão não podem ser excluídas
  desconto_percentual NUMERIC(5,2)  NOT NULL DEFAULT 0,
  desconto_maximo     NUMERIC(10,2) NOT NULL DEFAULT 0,      -- 0 = sem limite
  ativo               BOOLEAN       NOT NULL DEFAULT true
);
