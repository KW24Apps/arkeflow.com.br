-- Dados completos do colaborador/funcionário
-- Separado da tabela usuarios para manter autenticação limpa
CREATE TABLE colaboradores_perfil (
  id              UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
  usuario_id      UUID         NOT NULL UNIQUE REFERENCES usuarios(id) ON DELETE CASCADE,

  -- Dados pessoais
  cpf             TEXT,
  rg              TEXT,
  data_nascimento DATE,
  telefone        TEXT,
  cargo           TEXT,          -- ex: Vendedor, Caixa, Gerente

  -- Endereço
  cep             TEXT,
  logradouro      TEXT,
  numero          TEXT,
  complemento     TEXT,
  bairro          TEXT,
  cidade          TEXT,
  estado          CHAR(2),

  -- Conta bancária
  banco           TEXT,
  agencia         TEXT,
  conta           TEXT,
  conta_digito    TEXT,
  tipo_conta      TEXT CHECK (tipo_conta IN ('corrente', 'poupanca')),
  pix             TEXT,          -- chave pix (cpf, email, telefone ou aleatória)

  -- Dados de emprego
  data_admissao   DATE,
  salario         NUMERIC(10,2),
  tipo_contrato   TEXT CHECK (tipo_contrato IN ('clt', 'pj', 'mei', 'autonomo', 'estagio', 'outro')),

  criado_em       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
