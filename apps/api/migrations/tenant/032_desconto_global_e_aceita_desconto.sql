-- Global discount cap on configuracoes_loja
ALTER TABLE configuracoes_loja
  ADD COLUMN IF NOT EXISTS desconto_max_percentual  NUMERIC(5,2)  NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS desconto_max_valor       NUMERIC(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS promocao_aceita_desconto BOOLEAN       NOT NULL DEFAULT false;

-- Per-payment-method discount eligibility flag
ALTER TABLE formas_pagamento
  ADD COLUMN IF NOT EXISTS aceita_desconto BOOLEAN NOT NULL DEFAULT true;
