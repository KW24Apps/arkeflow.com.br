ALTER TABLE vendas ADD COLUMN IF NOT EXISTS turno_id UUID REFERENCES turnos_caixa(id);
CREATE INDEX IF NOT EXISTS idx_vendas_turno_id ON vendas(turno_id);
