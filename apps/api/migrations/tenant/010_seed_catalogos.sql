-- Tipos de produto
INSERT INTO tipos_produto (nome) VALUES
  ('Camiseta'), ('Camisa'), ('Polo'), ('Regata'), ('Blusa'),
  ('Moletom'), ('Casaco'), ('Jaqueta'), ('Sobretudo'), ('Colete'),
  ('Calça'), ('Bermuda'), ('Short'), ('Legging'), ('Saia'),
  ('Vestido'), ('Macacão'), ('Conjunto'),
  ('Cueca'), ('Calcinha'), ('Sutiã'), ('Camisola'),
  ('Meia'), ('Meião'),
  ('Outro')
ON CONFLICT DO NOTHING;

-- Tamanhos (padrão brasileiro + numéricos)
INSERT INTO tamanhos (nome, ordem) VALUES
  ('PP',  1), ('P',   2), ('M',   3), ('G',   4),
  ('GG',  5), ('XG',  6), ('XGG', 7), ('2XG', 8),
  ('3XG', 9), ('4XG', 10),
  ('34', 20), ('36', 21), ('38', 22), ('40', 23),
  ('42', 24), ('44', 25), ('46', 26), ('48', 27),
  ('50', 28), ('52', 29), ('54', 30),
  ('2',  40), ('4',  41), ('6',  42), ('8',  43),
  ('10', 44), ('12', 45), ('14', 46), ('16', 47),
  ('Único', 99)
ON CONFLICT DO NOTHING;

-- Cores básicas
INSERT INTO cores (nome, hex_cor) VALUES
  ('Branco',       '#FFFFFF'),
  ('Preto',        '#000000'),
  ('Cinza Claro',  '#D3D3D3'),
  ('Cinza',        '#808080'),
  ('Cinza Escuro', '#404040'),
  ('Azul Claro',   '#ADD8E6'),
  ('Azul',         '#0000FF'),
  ('Azul Marinho', '#001F5B'),
  ('Azul Royal',   '#4169E1'),
  ('Vermelho',     '#FF0000'),
  ('Vinho',        '#722F37'),
  ('Verde',        '#008000'),
  ('Verde Militar','#4B5320'),
  ('Amarelo',      '#FFFF00'),
  ('Laranja',      '#FFA500'),
  ('Rosa',         '#FFC0CB'),
  ('Pink',         '#FF69B4'),
  ('Roxo',         '#800080'),
  ('Lilás',        '#C8A2C8'),
  ('Marrom',       '#8B4513'),
  ('Caramelo',     '#C68642'),
  ('Bege',         '#F5F5DC'),
  ('Areia',        '#C2B280'),
  ('Jeans',        '#5B7FA6'),
  ('Estampado',    NULL),
  ('Mescla',       NULL)
ON CONFLICT DO NOTHING;

-- Composições
INSERT INTO composicoes (nome) VALUES
  ('Algodão'),
  ('Poliéster'),
  ('Elastano'),
  ('Viscose'),
  ('Linho'),
  ('Lã'),
  ('Nylon'),
  ('Jeans (Denim)'),
  ('Couro'),
  ('Couro Sintético'),
  ('Algodão + Poliéster'),
  ('Algodão + Elastano'),
  ('Poliéster + Elastano')
ON CONFLICT DO NOTHING;
