-- Configurações globais da loja
CREATE TABLE configuracoes_loja (
  id                 UUID    PRIMARY KEY DEFAULT uuid_generate_v4(),
  controle_estoque   BOOLEAN NOT NULL DEFAULT true,   -- se false, ignora estoque em todos os produtos
  -- campos futuros de configuração entram aqui
  atualizado_em      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Insere registro padrão
INSERT INTO configuracoes_loja (controle_estoque) VALUES (true);

-- Código/SKU no produto (referência interna, busca manual)
ALTER TABLE produtos ADD COLUMN codigo TEXT;
CREATE INDEX idx_produtos_codigo ON produtos(codigo);

-- Código de barras na versão (EAN/QR — um por variação, ex: tamanho G cor Azul)
ALTER TABLE versoes ADD COLUMN codigo_barras TEXT;
CREATE INDEX idx_versoes_codigo_barras ON versoes(codigo_barras);
