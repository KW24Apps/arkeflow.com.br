ALTER TABLE usuarios
  ADD COLUMN IF NOT EXISTS ultimo_acesso_web    TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS ultimo_acesso_mobile TIMESTAMPTZ;

UPDATE usuarios SET
  ultimo_acesso_web    = ultimo_acesso,
  ultimo_acesso_mobile = ultimo_acesso
WHERE ultimo_acesso IS NOT NULL;
