-- Campos fiscais em ajustes_estoque para rastreabilidade de movimentações
-- nota_fiscal_id e venda_id sem FK (tabelas referencidas criadas separadamente)

ALTER TABLE ajustes_estoque
  ADD COLUMN IF NOT EXISTS custo_unitario  NUMERIC(12,4),
  ADD COLUMN IF NOT EXISTS nota_fiscal_id  UUID,
  ADD COLUMN IF NOT EXISTS venda_id        UUID,
  ADD COLUMN IF NOT EXISTS cfop            VARCHAR(10),
  ADD COLUMN IF NOT EXISTS origem          TEXT
    CHECK (origem IN (
      'compra_nfe', 'compra_manual', 'venda', 'ajuste_manual',
      'inventario', 'devolucao_cliente', 'devolucao_fornecedor'
    ));

CREATE INDEX IF NOT EXISTS idx_ajustes_nota_fiscal_id
  ON ajustes_estoque (nota_fiscal_id)
  WHERE nota_fiscal_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_ajustes_venda_id
  ON ajustes_estoque (venda_id)
  WHERE venda_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_ajustes_origem
  ON ajustes_estoque (origem);
