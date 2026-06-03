CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE produtos (
  id                UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome              TEXT          NOT NULL,
  categoria         TEXT,
  marca             TEXT,
  descricao         TEXT,
  preco_base        NUMERIC(10,2) NOT NULL,
  foto_url          TEXT,
  controle_estoque  BOOLEAN       NOT NULL DEFAULT true,
  ativo             BOOLEAN       NOT NULL DEFAULT true
);

CREATE TABLE atributos_produto (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  produto_id  UUID NOT NULL REFERENCES produtos(id) ON DELETE CASCADE,
  nome        TEXT NOT NULL  -- ex: "tamanho", "cor", "modelo"
);

CREATE TABLE versoes (
  id                UUID          PRIMARY KEY DEFAULT uuid_generate_v4(),
  produto_id        UUID          NOT NULL REFERENCES produtos(id) ON DELETE CASCADE,
  atributos_json    JSONB         NOT NULL DEFAULT '{}',  -- ex: {"tamanho":"P","cor":"Azul"}
  preco_especifico  NUMERIC(10,2),                        -- sobrescreve preco_base se preenchido
  estoque_atual     INT           NOT NULL DEFAULT 0,
  estoque_minimo    INT           NOT NULL DEFAULT 0,
  ativo             BOOLEAN       NOT NULL DEFAULT true
);

CREATE INDEX idx_versoes_produto   ON versoes(produto_id);
CREATE INDEX idx_versoes_atributos ON versoes USING gin(atributos_json);
