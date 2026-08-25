-- Hub de identidade multi-produto: "loja" era um termo especifico do Arkevest, nao cabe mais
-- com Connect/KW Connect no mesmo hub. Rename seguro (dado/id/constraint preservados) -- nunca
-- drop-and-recreate. Ver projetos/modelo-identidade-hub/tarefas/01_TAREFA_clientes-produtos-licenciamento.md
-- (secao "Naming").

ALTER TABLE lojas RENAME TO clientes;

-- Colunas FK que apontavam pra lojas.id -- o rename da tabela acima ja atualiza a definicao da
-- FK automaticamente; so precisamos renomear a COLUNA em quem referencia, de loja_id pra
-- cliente_id, pra manter o nome consistente com a nova entidade.
ALTER TABLE usuarios           RENAME COLUMN loja_id TO cliente_id;
ALTER TABLE assinaturas        RENAME COLUMN loja_id TO cliente_id;
ALTER TABLE logs_acesso        RENAME COLUMN loja_id TO cliente_id;
ALTER TABLE modelos_permissao  RENAME COLUMN loja_id TO cliente_id;
ALTER TABLE pacotes_nota       RENAME COLUMN loja_id TO cliente_id;

-- lojas_contatos era dependente direto de lojas -- renomeia junto por consistencia (nao ha
-- colisao: clientes_contatos so existe hoje dentro de cada banco de tenant, nunca em
-- arkeflow_platform).
ALTER TABLE lojas_contatos      RENAME TO clientes_contatos;
ALTER TABLE clientes_contatos   RENAME COLUMN loja_id TO cliente_id;

-- Indices/constraints com nome antigo -- so cosmetico (Postgres ja atualiza a FK em si), mas
-- deixa o catalogo legivel.
ALTER INDEX IF EXISTS idx_lojas_grupo_id            RENAME TO idx_clientes_grupo_id;
ALTER INDEX IF EXISTS idx_lojas_contatos_loja        RENAME TO idx_clientes_contatos_cliente;
ALTER TABLE clientes  RENAME CONSTRAINT lojas_pkey          TO clientes_pkey;
ALTER TABLE clientes  RENAME CONSTRAINT lojas_banco_id_key  TO clientes_banco_id_key;
ALTER TABLE clientes  RENAME CONSTRAINT lojas_cnpj_key      TO clientes_cnpj_key;
ALTER TABLE clientes  RENAME CONSTRAINT lojas_status_check  TO clientes_status_check;
ALTER TABLE clientes  RENAME CONSTRAINT lojas_grupo_id_fkey TO clientes_grupo_id_fkey;
