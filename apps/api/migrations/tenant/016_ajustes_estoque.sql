CREATE TABLE ajustes_estoque (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  versao_id   UUID        NOT NULL REFERENCES versoes(id),
  tipo        TEXT        NOT NULL CHECK (tipo IN ('entrada', 'saida', 'ajuste')),
  quantidade  INT         NOT NULL,
  motivo      TEXT,
  usuario_id  UUID        NOT NULL,
  criado_em   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_ajustes_versao ON ajustes_estoque(versao_id);
