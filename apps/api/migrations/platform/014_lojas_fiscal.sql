-- Dados fiscais da loja
ALTER TABLE lojas
  ADD COLUMN IF NOT EXISTS regime_tributario         VARCHAR(30),
  ADD COLUMN IF NOT EXISTS certificado_digital_path  TEXT,
  ADD COLUMN IF NOT EXISTS certificado_digital_senha TEXT;
