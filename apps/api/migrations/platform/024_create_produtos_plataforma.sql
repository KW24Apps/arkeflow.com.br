-- Catalogo de produtos vendaveis do hub (Arkevest, Connect/KW Connect, futuros). Nao confundir
-- com o "produtos" de cada tenant (mercadoria de estoque da loja) -- esse fica dentro de cada
-- banco de tenant, renomeado pra produtos_arkevest na migration de tenant correspondente.
CREATE TABLE produtos_plataforma (
  id         UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug       TEXT        NOT NULL UNIQUE,
  nome       TEXT        NOT NULL,
  dominio    TEXT,
  ativo      BOOLEAN     NOT NULL DEFAULT true,
  criado_em  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO produtos_plataforma (slug, nome, dominio) VALUES
  ('arkevest', 'Arkevest', 'app.arkevest.com.br'),
  ('connect',  'KW Connect', 'connect.arkeflow.com.br');
