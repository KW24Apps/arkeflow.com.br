-- Modelos/grupos de permissão por loja
CREATE TABLE modelos_permissao (
  id          UUID    PRIMARY KEY DEFAULT uuid_generate_v4(),
  loja_id     UUID    NOT NULL REFERENCES lojas(id) ON DELETE CASCADE,
  nome        TEXT    NOT NULL,
  permissoes  JSONB   NOT NULL DEFAULT '[]',
  criado_em   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_modelos_permissao_loja ON modelos_permissao(loja_id);

-- Vincula modelo ao usuário (substitui permissoes individuais quando preenchido)
ALTER TABLE usuarios ADD COLUMN modelo_permissao_id UUID REFERENCES modelos_permissao(id);
