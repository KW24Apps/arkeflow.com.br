-- Vinculação de ajustes manuais ao fornecedor de origem
ALTER TABLE ajustes_estoque
  ADD COLUMN IF NOT EXISTS fornecedor_id UUID REFERENCES fornecedores(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_ajustes_fornecedor_id
  ON ajustes_estoque (fornecedor_id)
  WHERE fornecedor_id IS NOT NULL;
