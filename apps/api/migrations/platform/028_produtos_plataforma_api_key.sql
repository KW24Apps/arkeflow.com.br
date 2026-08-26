-- Autenticação produto-a-hub (task 03, api-identidade-licenciamento): cada produto que chama
-- /api/v1/auth/* (ex.: Connect) tem uma API key própria. Guardamos só o hash (SHA-256, chave de
-- alta entropia gerada por nós -- não é senha de usuário, bcrypt seria custo sem benefício aqui).
-- A chave em texto plano nunca é persistida -- gerada uma vez pelo script
-- generate-product-api-key.ts e entregue fora do banco/repo (ACESSOS.md).
ALTER TABLE produtos_plataforma ADD COLUMN api_key_hash TEXT UNIQUE;
