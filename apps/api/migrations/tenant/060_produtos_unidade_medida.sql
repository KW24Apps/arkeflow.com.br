-- SPED Fiscal Bloco H (VL_UNIT / inventário físico): unidade de medida por produto
-- Valores típicos para moda: UN (peça), PAR (calçado), CX (caixa)
ALTER TABLE produtos
  ADD COLUMN IF NOT EXISTS unidade_medida VARCHAR(10) NOT NULL DEFAULT 'UN';
