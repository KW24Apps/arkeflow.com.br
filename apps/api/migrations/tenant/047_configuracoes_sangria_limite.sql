ALTER TABLE configuracoes_loja
  ADD COLUMN IF NOT EXISTS sangria_limite_habilitado boolean     NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS sangria_limite_valor      numeric(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS sangria_fundo_troco       numeric(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS sangria_limite_modo       text          NOT NULL DEFAULT 'avisar'
    CONSTRAINT sangria_limite_modo_check CHECK (sangria_limite_modo IN ('avisar', 'obrigar'));
