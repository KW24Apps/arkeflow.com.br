-- Grupo: novo nível de plataforma acima de Loja (cobre redes/franquias e serve como
-- "cliente" genérico compartilhado entre Arkevest e Arkeconnect). Puramente aditivo:
-- não altera lojas/planos/assinaturas existentes, não faz backfill.
CREATE TABLE grupos (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome        TEXT        NOT NULL,
  documento   TEXT,
  telefone    TEXT,
  email       TEXT,
  status      TEXT        NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo', 'inativo', 'suspenso')),
  criado_em   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- grupo_id em lojas: nullable, sem backfill. ON DELETE SET NULL garante que remover um
-- grupo nunca apaga ou bloqueia lojas existentes (apenas desvincula).
ALTER TABLE lojas
  ADD COLUMN IF NOT EXISTS grupo_id UUID REFERENCES grupos(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_lojas_grupo_id ON lojas(grupo_id);
