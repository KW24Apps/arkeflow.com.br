ALTER TABLE configuracoes_loja
  ADD COLUMN IF NOT EXISTS atalhos_caixa jsonb NOT NULL DEFAULT '{}';
