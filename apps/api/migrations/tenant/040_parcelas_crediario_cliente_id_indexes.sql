ALTER TABLE parcelas_crediario ADD COLUMN IF NOT EXISTS cliente_id UUID REFERENCES clientes(id);
CREATE INDEX IF NOT EXISTS idx_parcelas_crediario_cliente   ON parcelas_crediario(cliente_id);
CREATE INDEX IF NOT EXISTS idx_parcelas_crediario_status_vc ON parcelas_crediario(status, vencimento);
