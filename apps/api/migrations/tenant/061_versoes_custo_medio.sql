-- Custo Médio Ponderado Móvel por variação (VL_UNIT no SPED Fiscal Bloco H)
-- Recalculado pelo backend a cada entrada de estoque
ALTER TABLE versoes
  ADD COLUMN IF NOT EXISTS custo_medio NUMERIC(12,4) NOT NULL DEFAULT 0;
