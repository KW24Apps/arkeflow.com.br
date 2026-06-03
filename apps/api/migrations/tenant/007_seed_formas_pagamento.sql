INSERT INTO formas_pagamento (nome, tipo, padrao_sistema) VALUES
  ('Dinheiro',  'dinheiro',  true),
  ('PIX',       'pix',       true),
  ('Débito',    'debito',    true),
  ('Crédito',   'credito',   true),
  ('Crediário', 'crediario', true)
ON CONFLICT DO NOTHING;
