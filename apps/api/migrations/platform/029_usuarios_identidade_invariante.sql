-- Campos de identidade invariante do usuário, independentes de produto (Connect/Vest) -- task
-- 12 do projeto backend-real-plataforma-nativa (Connect), preparação de schema pro futuro
-- sistema de login/recuperação próprio da plataforma (nickname como identificador de login,
-- telefone único como canal de recuperação via código enviado pelo WhatsApp oficial da própria
-- plataforma, e-mail pessoal como canal alternativo) -- login/recuperação em si ficam de fora
-- desta migration, só o espaço reservado. Aditivo e nullable, não quebra login/sessão atuais
-- (email+senha ou username+senha continuam intocados).
--
-- `nickname` já existe como `username` (migration 012, "alternativa ao email no login") e
-- `nome padrão` já existe como `nome` (migration 005) -- nenhum dos dois precisa de coluna nova
-- aqui, só documentar que já cumprem esse papel.
--
-- Não confundir com `colaboradores_perfil.cpf`/`.telefone` (migration 008) -- aquela tabela é
-- HR/folha de pagamento específica do Arkevest (salário, admissão, dados bancários), conceito
-- de produto diferente. Os campos aqui são de identidade da PESSOA, cross-produto.
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS cpf TEXT;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS telefone TEXT UNIQUE;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS email_pessoal TEXT;

COMMENT ON COLUMN usuarios.telefone IS
  'Identidade invariante da pessoa (cross-produto) -- reservado pro futuro canal de recuperação '
  'via código enviado pelo WhatsApp oficial da própria plataforma. Não usado por login ainda.';
COMMENT ON COLUMN usuarios.email_pessoal IS
  'E-mail pessoal do usuário, distinto do e-mail de login/trabalho -- reservado pro futuro canal '
  'alternativo de recuperação. Não usado por login ainda.';
COMMENT ON COLUMN usuarios.cpf IS
  'Identidade invariante da pessoa (cross-produto), distinto de colaboradores_perfil.cpf (HR/'
  'folha de pagamento, específico do Arkevest).';
