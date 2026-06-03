import 'dotenv/config'
import bcrypt from 'bcryptjs'
import { platformPool } from '../config/database'

const email = process.argv[2] ?? 'admin@arkeflow.com.br'
const senha = process.argv[3] ?? 'Admin@2025'

;(async () => {
  const hash = await bcrypt.hash(senha, 10)

  await platformPool.query(
    `INSERT INTO usuarios (nome, email, senha_hash, nivel, ativo)
     VALUES ('Administrador', $1, $2, 'admin_plataforma', true)
     ON CONFLICT (email) DO UPDATE SET senha_hash = $2`,
    [email, hash]
  )

  console.log(`\nAdmin criado com sucesso.`)
  console.log(`  Email: ${email}`)
  console.log(`  Senha: ${senha}\n`)
  platformPool.end()
})().catch(err => { console.error(err); process.exit(1) })
