-- Medidas corporais do cliente para auxiliar na busca de produtos
-- Estrutura: {"Tórax / Busto": "96cm", "Cintura (Cós)": "80cm", ...}
ALTER TABLE clientes
  ADD COLUMN IF NOT EXISTS medidas_json JSONB DEFAULT '{}';
