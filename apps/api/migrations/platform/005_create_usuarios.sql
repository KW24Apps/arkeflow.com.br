CREATE TABLE usuarios (
  id            UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  loja_id       UUID        REFERENCES lojas(id),  -- null para admin_plataforma
  nome          TEXT        NOT NULL,
  email         TEXT        NOT NULL UNIQUE,
  senha_hash    TEXT        NOT NULL,
  nivel         TEXT        NOT NULL CHECK (nivel IN ('admin_plataforma', 'parceiro', 'dono_loja', 'vendedor')),
  ativo         BOOLEAN     NOT NULL DEFAULT true,
  ultimo_acesso TIMESTAMPTZ
);

CREATE INDEX idx_usuarios_loja ON usuarios(loja_id);
