-- Suporte a múltiplas categorias, código promocional e flag aplica_todos
ALTER TABLE promocoes
  ADD COLUMN IF NOT EXISTS categorias_alvo JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS aplica_todos    BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS codigo          TEXT;   -- código promocional futuro (ex: VERAO20)

CREATE UNIQUE INDEX IF NOT EXISTS idx_promocoes_codigo ON promocoes(codigo) WHERE codigo IS NOT NULL;
