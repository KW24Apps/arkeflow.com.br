ALTER TABLE configuracoes_loja
  ADD COLUMN IF NOT EXISTS supervisao_habilitada    boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS senha_mestra_habilitada  boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS senha_mestra_hash        text,
  ADD COLUMN IF NOT EXISTS exige_auth_fechar_falta  boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS exige_auth_fechar_sobra  boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS exige_auth_cancelar_item boolean NOT NULL DEFAULT false;
