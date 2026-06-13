ALTER TABLE usuarios
  ADD COLUMN IF NOT EXISTS sessao_web        TEXT,
  ADD COLUMN IF NOT EXISTS sessao_web_ip     TEXT,
  ADD COLUMN IF NOT EXISTS sessao_web_em     TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS sessao_mobile     TEXT,
  ADD COLUMN IF NOT EXISTS sessao_mobile_ip  TEXT,
  ADD COLUMN IF NOT EXISTS sessao_mobile_em  TIMESTAMPTZ;
