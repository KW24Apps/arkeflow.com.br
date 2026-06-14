ALTER TABLE configuracoes_loja
  ADD COLUMN IF NOT EXISTS prova_habilitada         BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS prova_prazo_obrigatorio  BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS prova_alerta_dias        INTEGER NOT NULL DEFAULT 2;
