ALTER TABLE configuracoes_loja
  ADD COLUMN IF NOT EXISTS cashback_habilitado        boolean      NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS cashback_aceita_promocao   boolean      NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS cashback_aceita_desconto   boolean      NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS cashback_aceita_crediario  boolean      NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS cashback_limite_modo       text         NOT NULL DEFAULT 'livre'
    CHECK (cashback_limite_modo IN ('livre','percentual')),
  ADD COLUMN IF NOT EXISTS cashback_limite_percentual numeric(5,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cashback_carencia_dias     integer      NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cashback_validade_meses    integer      NOT NULL DEFAULT 0;
