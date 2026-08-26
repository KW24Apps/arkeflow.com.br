import 'dotenv/config'
import crypto from 'crypto'
import { platformPool } from '../config/database'

// Gera (ou rotaciona) a API key de um produto pra autenticar chamadas produto-a-hub
// (/api/v1/auth/*). A chave em texto plano só é exibida aqui, uma vez -- nunca gravada em
// migration/repo. Guardar em ACESSOS.md do lado de quem consome (ex.: connect.arkeflow.com.br).
const slug = process.argv[2]
if (!slug) {
  console.error('Uso: pnpm generate:product-api-key <slug>  (ex.: connect)')
  process.exit(1)
}

;(async () => {
  const { rows: [produto] } = await platformPool.query(
    `SELECT id FROM produtos_plataforma WHERE slug = $1`, [slug]
  )
  if (!produto) {
    console.error(`Produto '${slug}' não encontrado em produtos_plataforma.`)
    process.exit(1)
  }

  const rawKey = crypto.randomBytes(32).toString('hex')
  const hash   = crypto.createHash('sha256').update(rawKey).digest('hex')

  await platformPool.query(
    `UPDATE produtos_plataforma SET api_key_hash = $2 WHERE id = $1`,
    [produto.id, hash]
  )

  console.log(`\nAPI key gerada pro produto '${slug}'.`)
  console.log(`  Header a enviar: X-Api-Key: ${rawKey}`)
  console.log(`  (essa chave não fica salva em lugar nenhum -- guarde agora)\n`)
  await platformPool.end()
})().catch(err => { console.error(err); process.exit(1) })
