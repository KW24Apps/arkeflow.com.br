-- Licenciamento: unico lugar onde "cliente X tem acesso ao produto Y" e decidido. Nunca a nivel
-- de grupo (grupo so serve pra consolidacao de cobranca/bloqueio futura, ver 01_TAREFA -- secao
-- de contexto). Um usuario tem acesso a todo produto ativo do SEU cliente (sem restricao extra
-- por usuario nesta entrega, ver objetivo 4 do 01_TAREFA).
CREATE TABLE cliente_produto (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  cliente_id  UUID        NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  produto_id  UUID        NOT NULL REFERENCES produtos_plataforma(id),
  ativo       BOOLEAN     NOT NULL DEFAULT true,
  criado_em   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (cliente_id, produto_id)
);

CREATE INDEX idx_cliente_produto_cliente ON cliente_produto(cliente_id);
CREATE INDEX idx_cliente_produto_produto ON cliente_produto(produto_id);
