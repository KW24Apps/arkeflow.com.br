-- Remove tabelas orfas em arkeflow_platform (residuo do bug de migrate:tenant corrigido no
-- commit 4529c3f, 2026-06-06 -- antes desse fix, migrate:tenant rodava contra a DATABASE_URL
-- padrao em vez de por loja). Confirmado morto: nenhuma query no codigo via platformPool
-- referencia essas tabelas (sempre via getTenantPool, que resolve pro banco da loja --
-- loja_teste, nao arkeflow_platform).
--
-- clientes/produtos tem dependentes diretos/transitivos (mesmo residuo do mesmo bug). Achado
-- ao rodar em producao: "CASCADE" no DROP TABLE só derruba a CONSTRAINT que referencia a
-- tabela, não a tabela dependente inteira -- por isso os 11 dependentes abaixo precisam de
-- DROP explícito próprio (todos confirmados com 0 linhas antes desta migration, decisão
-- explícita do usuário: limpar tudo, não só clientes/produtos):
--   clientes  -> vendas, historico_cashback, clientes_contatos
--   produtos  -> atributos_produto, versoes, promocoes_produtos
--   (transitivo, via vendas/versoes) -> itens_venda, pagamentos_venda, notas_fiscais,
--   lancamentos, ajustes_estoque
-- Ver projetos/modelo-identidade-hub/tarefas/02_RELATORIO_investigacao-multitenancy.md.
DROP TABLE IF EXISTS clientes CASCADE;
DROP TABLE IF EXISTS produtos CASCADE;
DROP TABLE IF EXISTS clientes_contatos CASCADE;
DROP TABLE IF EXISTS itens_venda CASCADE;
DROP TABLE IF EXISTS pagamentos_venda CASCADE;
DROP TABLE IF EXISTS notas_fiscais CASCADE;
DROP TABLE IF EXISTS lancamentos CASCADE;
DROP TABLE IF EXISTS historico_cashback CASCADE;
DROP TABLE IF EXISTS ajustes_estoque CASCADE;
DROP TABLE IF EXISTS vendas CASCADE;
DROP TABLE IF EXISTS promocoes_produtos CASCADE;
DROP TABLE IF EXISTS atributos_produto CASCADE;
DROP TABLE IF EXISTS versoes CASCADE;
