INSERT INTO medidas (nome) VALUES
  ('Tórax / Busto'),
  ('Cintura (Cós)'),
  ('Quadril'),
  ('Comprimento Total'),
  ('Ombro a Ombro'),
  ('Comprimento da Manga'),
  ('Gancho (Cavalo)'),
  ('Coxa'),
  ('Largura da Barra / Punho')
ON CONFLICT DO NOTHING;
