CREATE TABLE pacotes_nota (
  id          UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
  loja_id     UUID         NOT NULL REFERENCES lojas(id),
  quantidade  INT          NOT NULL,
  utilizadas  INT          NOT NULL DEFAULT 0,
  valor_pago  NUMERIC(10,2) NOT NULL,
  validade    DATE         NOT NULL,
  criado_em   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
