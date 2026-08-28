import 'dotenv/config'
import bcrypt from 'bcryptjs'
import { platformPool } from '../config/database'

// Usuario de teste do "Cliente Teste — Connect Dev" (ver migration
// 026_seed_test_client_connect.sql), pra validar o login real do Connect. Senha nunca fica em
// texto plano numa migration versionada -- roda uma vez, hash gravado direto no banco. Email/
// senha reais ficam só em ACESSOS.md, nunca aqui nem no relatório da tarefa (a EXCEÇÃO é o
// bloco de teste manual pedido explicitamente pela task 12 do Connect, com prazo curto e
// disposable -- ver relatório daquela task pra saber onde as credenciais reais foram
// entregues, nunca commitadas neste repositório nem no de documentação).
//
// 4º argumento opcional (nome) -- task 12 pediu 2-3 usuários genéricos pra teste manual de
// roteamento, distintos o suficiente pra identificar cada um na fila do Canal Aberto; sem
// quebrar quem já chamava este script só com email/senha (nome cai no default de sempre).
const NOME_CLIENTE_TESTE = 'Cliente Teste — Connect Dev'
const email = process.argv[2] ?? 'connect.dev@arkeflow.com.br'
const senha = process.argv[3] ?? 'ConnectDev@2026'
// nome/nivel só têm default quando NENHUM dos dois novos argumentos é passado (chamada clássica,
// sem quebrar o comportamento já documentado em ACESSOS.md pro dono real 'connect.dev@...') --
// omitir nome mas passar nivel (ou vice-versa) usa o default só do que faltou.
const nome = process.argv[4] ?? 'Usuário Teste Connect'
const nivel = process.argv[5] ?? 'dono_loja'

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
     VALUES ($1, $4, $2, $3, $5, true, '["*"]')
     ON CONFLICT (email) DO UPDATE SET senha_hash = $3, cliente_id = $1, nome = $4`,
    [cliente.id, email, hash, nome, nivel]
  )

  console.log(`\nUsuário de teste (Connect) criado com sucesso.`)
  console.log(`  Cliente: ${NOME_CLIENTE_TESTE} (${cliente.id})`)
  console.log(`  Email:   ${email}`)
  console.log(`  Senha:   ${senha}\n`)
  await platformPool.end()
})().catch(err => { console.error(err); process.exit(1) })
