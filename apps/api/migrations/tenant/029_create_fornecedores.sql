CREATE TABLE fornecedores (
  id            UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  razao_social  TEXT        NOT NULL,
  nome_fantasia TEXT,
  cnpj          TEXT        UNIQUE,
  email         TEXT,
  telefones     JSONB       NOT NULL DEFAULT '[]',
  cep           TEXT,
  logradouro    TEXT,
  numero        TEXT,
  complemento   TEXT,
  bairro        TEXT,
  cidade        TEXT,
  estado        TEXT,
  ativo         BOOLEAN     NOT NULL DEFAULT true,
  arquivado     BOOLEAN     NOT NULL DEFAULT false,
  criado_em     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
