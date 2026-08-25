-- Cliente de teste dedicado pro desenvolvimento/validacao do login do Connect -- nome
-- inequivoco de teste (nunca pode ser confundido com cliente real do Arkevest em nenhuma
-- listagem). Sem cnpj real (fica NULL -- unique constraint permite, cada NULL e distinto).
-- banco_id: cliente do Connect nao tem loja/banco tenant do Arkevest -- valor placeholder
-- claramente rotulado pra satisfazer a coluna NOT NULL/UNIQUE hoje (ver ressalva no relatorio
-- sobre banco_id talvez precisar virar nullable no modelo do hub).
INSERT INTO clientes (nome, banco_id, status)
VALUES ('Cliente Teste — Connect Dev', 'sem_banco_connect_teste', 'ativo');

-- Licenca: ativa o produto Connect pra esse cliente de teste.
INSERT INTO cliente_produto (cliente_id, produto_id, ativo)
SELECT c.id, p.id, true
FROM clientes c, produtos_plataforma p
WHERE c.nome = 'Cliente Teste — Connect Dev' AND p.slug = 'connect';

-- Usuario de teste vinculado a esse cliente -- senha_hash preenchida via script (bcrypt), nao
-- em texto plano numa migration versionada. Ver 027_seed_test_client_connect_user.ts.
