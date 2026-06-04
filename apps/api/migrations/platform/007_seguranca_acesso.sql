-- Controle de horário de acesso por colaborador
ALTER TABLE usuarios
  ADD COLUMN dias_semana  JSONB,  -- ex: [1,2,3,4,5] = seg a sex (0=dom, 6=sab). null = sem restrição
  ADD COLUMN hora_inicio  TIME,   -- ex: '08:00'. null = sem restrição
  ADD COLUMN hora_fim     TIME;   -- ex: '18:00'

-- Histórico de acessos (login/logout) por usuário
CREATE TABLE logs_acesso (
  id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  usuario_id  UUID        NOT NULL REFERENCES usuarios(id),
  loja_id     UUID        REFERENCES lojas(id),
  ip          TEXT,
  tipo        TEXT        NOT NULL CHECK (tipo IN ('login', 'logout')),
  criado_em   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_logs_acesso_loja     ON logs_acesso(loja_id, criado_em DESC);
CREATE INDEX idx_logs_acesso_usuario  ON logs_acesso(usuario_id, criado_em DESC);
