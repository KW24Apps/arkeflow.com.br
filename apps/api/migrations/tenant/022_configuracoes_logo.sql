ALTER TABLE configuracoes_loja
  ADD COLUMN IF NOT EXISTS logo_url  TEXT,
  ADD COLUMN IF NOT EXISTS link_loja TEXT;
