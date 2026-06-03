import fs from 'fs'
import path from 'path'
import { Pool } from 'pg'
import { env } from '../config/env'

// Aplica arquivos .sql em ordem numérica, registrando os já executados
async function runMigrations(pool: Pool, dir: string) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS _migrations (
      name    TEXT PRIMARY KEY,
      run_at  TIMESTAMPTZ DEFAULT NOW()
    )
  `)

  const files = fs.readdirSync(dir).filter(f => f.endsWith('.sql')).sort()

  for (const file of files) {
    const { rows } = await pool.query('SELECT 1 FROM _migrations WHERE name = $1', [file])
    if (rows.length > 0) {
      console.log(`  skip  ${file}`)
      continue
    }

    const sql = fs.readFileSync(path.join(dir, file), 'utf8')
    await pool.query(sql)
    await pool.query('INSERT INTO _migrations (name) VALUES ($1)', [file])
    console.log(`  ✓     ${file}`)
  }
}

const target = process.argv[2] as 'platform' | 'tenant'

if (!['platform', 'tenant'].includes(target)) {
  console.error('Uso: pnpm migrate:platform | pnpm migrate:tenant')
  process.exit(1)
}

const pool = new Pool({ connectionString: env.DATABASE_URL })
const dir = path.resolve(__dirname, '../../migrations', target)

runMigrations(pool, dir)
  .then(() => { console.log('\nMigrations concluídas.'); pool.end() })
  .catch(err => { console.error(err); process.exit(1) })
