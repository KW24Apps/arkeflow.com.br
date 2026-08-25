-- Hub de identidade multi-produto: dentro de CADA banco de tenant, "clientes" (cliente final da
-- loja) e "produtos" (item de estoque) sao renomeados pra clareza/simetria com o hub -- nao por
-- colisao tecnica (esses nomes so existem aqui, nunca em arkeflow_platform). Rename seguro (FK
-- interna se atualiza automaticamente, dado/id preservados). Ver
-- projetos/modelo-identidade-hub/tarefas/01_TAREFA_clientes-produtos-licenciamento.md (secao
-- "Naming"). Tabelas dependentes (clientes_contatos, clientes_credito, atributos_produto,
-- promocoes_produtos, versoes, etc.) MANTEM o nome atual -- so as duas tabelas nomeadas
-- explicitamente na tarefa sao renomeadas.
ALTER TABLE clientes RENAME TO clientes_arkevest;
ALTER TABLE produtos RENAME TO produtos_arkevest;
