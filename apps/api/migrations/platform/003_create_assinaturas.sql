CREATE TABLE assinaturas (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  loja_id     UUID NOT NULL REFERENCES lojas(id),
  plano_id    UUID NOT NULL REFERENCES planos(id),
  inicio      DATE NOT NULL,
  vencimento  DATE NOT NULL,
  status      TEXT NOT NULL DEFAULT 'ativa' CHECK (status IN ('ativa', 'trial', 'suspensa', 'cancelada'))
);
