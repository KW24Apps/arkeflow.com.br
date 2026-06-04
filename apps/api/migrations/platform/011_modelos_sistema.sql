-- Adiciona flag de modelo de sistema (Administrador) — não editável
ALTER TABLE modelos_permissao ADD COLUMN IF NOT EXISTS sistema BOOLEAN NOT NULL DEFAULT false;
