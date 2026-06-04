-- Adiciona validade em meses às regras de cashback (null = sem vencimento)
ALTER TABLE regras_cashback
  ADD COLUMN validade_meses INT;
