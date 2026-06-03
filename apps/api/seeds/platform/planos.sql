INSERT INTO planos (nome, preco_mensal, max_usuarios, franquia_notas, tem_financeiro, tem_cashback, tem_promocoes)
VALUES
  ('Básico',    99.00,  3,  50,  true, false, false),
  ('Completo', 120.00, 10, 100,  true, true,  true)
ON CONFLICT DO NOTHING;
