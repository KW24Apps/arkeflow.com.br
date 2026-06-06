ALTER TABLE pagamentos_venda
  ADD COLUMN IF NOT EXISTS valor_recebido NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS troco          NUMERIC(10,2);
