ALTER TABLE configuracoes_loja
  ADD COLUMN IF NOT EXISTS crediario_habilitado          BOOLEAN      NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS crediario_max_parcelas        INTEGER      NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS crediario_entrada_obrigatoria BOOLEAN      NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS crediario_entrada_min_pct     NUMERIC(5,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS crediario_juros_habilitado    BOOLEAN      NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS crediario_juros_sem_ate       INTEGER      NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS crediario_juros_mes           NUMERIC(5,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS crediario_atraso_habilitado   BOOLEAN      NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS crediario_atraso_multa        NUMERIC(5,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS crediario_atraso_mora_mes     NUMERIC(5,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS crediario_formas_entrada      JSONB        NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS crediario_formas_parcela      JSONB        NOT NULL DEFAULT '[]'::jsonb;
