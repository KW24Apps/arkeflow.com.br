-- Permissões por menu para colaboradores (vendedores)
-- Array de slugs de menu: ["caixa","estoque","clientes"]
-- dono_loja sempre tem acesso total — este campo só é lido para vendedores
ALTER TABLE usuarios
  ADD COLUMN permissoes JSONB NOT NULL DEFAULT '[]';
