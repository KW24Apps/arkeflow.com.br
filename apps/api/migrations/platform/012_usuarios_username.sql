-- Nome de usuário opcional — alternativa ao email no login
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS username TEXT UNIQUE;
CREATE INDEX IF NOT EXISTS idx_usuarios_username ON usuarios(username);
