-- Adiciona tipo primeira_compra e campo aplicacao
ALTER TABLE promocoes
  ADD COLUMN IF NOT EXISTS aplicacao TEXT DEFAULT 'produtos_selecionados'
    CHECK (aplicacao IN ('produtos_selecionados', 'categoria', 'todos')),
  ADD COLUMN IF NOT EXISTS quantidade_compre INT;  -- X em "compre X leve Y"

-- Atualiza constraint do tipo para incluir primeira_compra e unifica tipos
ALTER TABLE promocoes DROP CONSTRAINT IF EXISTS promocoes_tipo_check;
ALTER TABLE promocoes ADD CONSTRAINT promocoes_tipo_check
  CHECK (tipo IN (
    'desconto_percentual',
    'desconto_fixo',
    'segunda_peca',
    'compre_ganhe',
    'primeira_compra'
  ));
