import 'dotenv/config'
import bcrypt from 'bcryptjs'
import { platformPool } from '../config/database'

// Usuario de teste do "Cliente Teste — Connect Dev" (ver migration
// 026_seed_test_client_connect.sql), pra validar o login real do Connect. Senha nunca fica em
// texto plano numa migration versionada -- roda uma vez, hash gravado direto no banco. Email/
// senha reais ficam só em ACESSOS.md, nunca aqui nem no relatório da tarefa.
const NOME_CLIENTE_TESTE = 'Cliente Teste — Connect Dev'
const email = process.argv[2] ?? 'connect.dev@arkeflow.com.br'
const senha = process.argv[3] ?? 'ConnectDev@2026'

;(async () => {
  const { rows: [cliente] } = await platformPool.query(
    `SELECT id FROM clientes WHERE nome = $1`, [NOME_CLIENTE_TESTE]
  )
  if (!cliente) {
    console.error(`Cliente '${NOME_CLIENTE_TESTE}' não encontrado -- rode as migrations de platform primeiro.`)
    process.exit(1)
  }

  const hash = await bcrypt.hash(senha, 10)

  await platformPool.query(
    `INSERT INTO usuarios (cliente_id, nome, email, senha_hash, nivel, ativo, permissoes)
     VALUES ($1, 'Usuário Teste Connect', $2, $3, 'dono_loja', true, '["*"]')
     ON CONFLICT (email) DO UPDATE SET senha_hash = $3, cliente_id = $1`,
    [cliente.id, email, hash]
  )

  console.log(`\nUsuário de teste (Connect) criado com sucesso.`)
  console.log(`  Cliente: ${NOME_CLIENTE_TESTE} (${cliente.id})`)
  console.log(`  Email:   ${email}`)
  console.log(`  Senha:   ${senha}\n`)
  await platformPool.end()
})().catch(err => { console.error(err); process.exit(1) })
