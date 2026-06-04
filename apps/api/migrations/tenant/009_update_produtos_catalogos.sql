-- Adiciona tipo e composição aos produtos
ALTER TABLE produtos
  ADD COLUMN tipo_id     UUID REFERENCES tipos_produto(id),
  ADD COLUMN composicao  TEXT,   -- ex: "Algodão, Poliéster"
  ADD COLUMN descricao2  TEXT;   -- renomear após migrar dados existentes

-- Atualiza versoes para referenciar tamanho e cor por ID quando aplicável
-- (mantemos atributos_json flexível para casos não cobertos pelos catálogos)
