CREATE TABLE medidas (
  id    UUID    PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome  TEXT    NOT NULL UNIQUE,
  ativo BOOLEAN NOT NULL DEFAULT true
);
