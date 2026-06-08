ALTER TABLE produtos ADD COLUMN IF NOT EXISTS codigo_barras TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS uniq_produtos_codigo_barras
  ON produtos (codigo_barras)
  WHERE codigo_barras IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uniq_versoes_codigo_barras
  ON versoes (codigo_barras)
  WHERE codigo_barras IS NOT NULL;
