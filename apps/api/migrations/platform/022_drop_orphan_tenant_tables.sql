-- Remove tabelas orfas em arkeflow_platform (residuo do bug de migrate:tenant corrigido no
-- commit 4529c3f, 2026-06-06 -- antes desse fix, migrate:tenant rodava contra a DATABASE_URL
-- padrao em vez de por loja). Confirmado morto: nenhuma query no codigo via platformPool
-- referencia essas tabelas (sempre via getTenantPool, que resolve pro banco da loja --
-- loja_teste, nao arkeflow_platform).
--
-- clientes/produtos tem dependentes diretos/transitivos (mesmo residuo do mesmo bug) --
-- CASCADE explicito, com a lista completa do que e arrastado documentada aqui (todas com 0
-- linhas confirmadas antes desta migration, decisao explicita do usuario):
--   clientes  -> vendas, historico_cashback, clientes_contatos
--   produtos  -> atributos_produto, versoes, promocoes_produtos
--   (transitivo, via vendas/versoes) -> itens_venda, pagamentos_venda, notas_fiscais,
--   lancamentos, ajustes_estoque
-- Ver projetos/modelo-identidade-hub/tarefas/02_RELATORIO_investigacao-multitenancy.md.
DROP TABLE IF EXISTS clientes CASCADE;
DROP TABLE IF EXISTS produtos CASCADE;
