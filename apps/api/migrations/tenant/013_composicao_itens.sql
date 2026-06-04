-- Substitui o campo composicao (texto livre) por estrutura JSON com percentuais
ALTER TABLE produtos
  ADD COLUMN composicao_itens JSONB NOT NULL DEFAULT '[]';

-- Migra dados existentes: se havia texto, converte para array vazio (sem dados reais ainda)
-- Em produção, seria necessário um script de conversão
