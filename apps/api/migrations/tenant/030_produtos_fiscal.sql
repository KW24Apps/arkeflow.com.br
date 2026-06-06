ALTER TABLE produtos
  ADD COLUMN IF NOT EXISTS ncm               VARCHAR(10),
  ADD COLUMN IF NOT EXISTS cfop              VARCHAR(10),
  ADD COLUMN IF NOT EXISTS origem_mercadoria SMALLINT,
  ADD COLUMN IF NOT EXISTS csosn             VARCHAR(10),
  ADD COLUMN IF NOT EXISTS cst               VARCHAR(10),
  ADD COLUMN IF NOT EXISTS icms_st           DECIMAL(5,2),
  ADD COLUMN IF NOT EXISTS ipi               DECIMAL(5,2),
  ADD COLUMN IF NOT EXISTS pis               DECIMAL(5,2),
  ADD COLUMN IF NOT EXISTS cofins            DECIMAL(5,2);
