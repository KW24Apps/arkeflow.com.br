CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE lojas (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome        TEXT        NOT NULL,
  cnpj        TEXT        UNIQUE,
  telefone    TEXT,
  email       TEXT,
  banco_id    TEXT        NOT NULL UNIQUE,  -- nome do banco PostgreSQL desta loja
  status      TEXT        NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo', 'inativo', 'suspenso')),
  criado_em   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
