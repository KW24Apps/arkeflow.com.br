-- Tipos de produto (camiseta, calça, etc.)
CREATE TABLE tipos_produto (
  id    UUID    PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome  TEXT    NOT NULL UNIQUE,
  ativo BOOLEAN NOT NULL DEFAULT true
);

-- Tamanhos com ordem para exibição correta
CREATE TABLE tamanhos (
  id     UUID    PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome   TEXT    NOT NULL UNIQUE,
  ordem  INT     NOT NULL DEFAULT 0,
  ativo  BOOLEAN NOT NULL DEFAULT true
);

-- Cores com código hex opcional
CREATE TABLE cores (
  id      UUID    PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome    TEXT    NOT NULL UNIQUE,
  hex_cor TEXT,
  ativo   BOOLEAN NOT NULL DEFAULT true
);

-- Composições de tecido (algodão, poliéster, etc.)
CREATE TABLE composicoes (
  id    UUID    PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome  TEXT    NOT NULL UNIQUE,
  ativo BOOLEAN NOT NULL DEFAULT true
);
