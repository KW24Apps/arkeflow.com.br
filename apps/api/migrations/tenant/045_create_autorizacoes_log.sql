CREATE TABLE IF NOT EXISTS autorizacoes_log (
  id                    UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  usuario_operador_id   UUID        NOT NULL,
  acao                  TEXT        NOT NULL,
  metodo                TEXT        NOT NULL CHECK (metodo IN ('senha_mestra', 'supervisor')),
  supervisor_id         UUID,
  autorizado_por        TEXT,
  autorizado_nome       TEXT,
  justificativa         TEXT,
  turno_id              UUID,
  detalhe               JSONB       NOT NULL DEFAULT '{}',
  criado_em             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_autorizacoes_log_criado_em ON autorizacoes_log(criado_em DESC);
CREATE INDEX IF NOT EXISTS idx_autorizacoes_log_acao     ON autorizacoes_log(acao);
