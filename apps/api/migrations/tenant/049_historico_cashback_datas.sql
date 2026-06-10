ALTER TABLE historico_cashback
  ADD COLUMN IF NOT EXISTS disponivel_a_partir_de date,
  ADD COLUMN IF NOT EXISTS expira_em date;
