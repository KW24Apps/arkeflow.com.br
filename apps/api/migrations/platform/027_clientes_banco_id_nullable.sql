-- Achado real ao rodar migrate:tenant em producao (ver
-- projetos/modelo-identidade-hub/tarefas/01_RELATORIO_clientes-produtos-licenciamento.md):
-- banco_id era NOT NULL, mas um cliente do hub pode nao ter loja/banco tenant nenhum (ex.:
-- cliente só-Connect, sem produto Arkevest). O placeholder usado na migration 026
-- ('sem_banco_connect_teste') quebrava migrate:tenant (tentava conectar num banco inexistente).
-- Corrige pra NULL = "sem banco tenant" de verdade. UNIQUE em banco_id continua valendo (NULLs
-- nao colidem entre si no Postgres).
ALTER TABLE clientes ALTER COLUMN banco_id DROP NOT NULL;

UPDATE clientes SET banco_id = NULL WHERE banco_id = 'sem_banco_connect_teste';
