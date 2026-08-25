-- Remove tabelas orfas em arkeflow_platform (clientes/produtos vazias, residuo do bug de
-- migrate:tenant corrigido no commit 4529c3f, 2026-06-06 -- antes desse fix, migrate:tenant
-- rodava contra a DATABASE_URL padrao em vez de por loja). Confirmado morto: 0 linhas nas duas,
-- nenhuma query no codigo via platformPool referencia clientes/produtos (sempre via
-- getTenantPool, que resolve pro banco da loja -- loja_teste, nao arkeflow_platform).
-- Ver projetos/modelo-identidade-hub/tarefas/02_RELATORIO_investigacao-multitenancy.md.
DROP TABLE IF EXISTS clientes;
DROP TABLE IF EXISTS produtos;
