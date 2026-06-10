ALTER TABLE turnos_caixa
  ADD COLUMN IF NOT EXISTS valor_esperado            numeric(10,2),
  ADD COLUMN IF NOT EXISTS divergencia               numeric(10,2),
  ADD COLUMN IF NOT EXISTS divergencia_justificativa text,
  ADD COLUMN IF NOT EXISTS autorizacao_id            uuid REFERENCES autorizacoes_log(id);
