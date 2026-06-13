ALTER TABLE configuracoes_loja
  ADD COLUMN IF NOT EXISTS cadastro_exige_cpf        BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS cadastro_exige_email       BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS cadastro_exige_endereco    BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS crediario_exige_email      BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS crediario_exige_endereco   BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS prova_exige_cpf            BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS prova_exige_email          BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS prova_exige_endereco       BOOLEAN NOT NULL DEFAULT true;
