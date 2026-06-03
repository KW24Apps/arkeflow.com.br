import fs from 'fs'
import path from 'path'
import { Pool } from 'pg'
import { env } from '../config/env'

const target = process.argv[2] as 'platform'

if (target !== 'platform') {
  console.error('Uso: pnpm seed:platform')
  process.exit(1)
}

const pool = new Pool({ connectionString: env.DATABASE_URL })
const dir = path.resolve(__dirname, '../../seeds', target)

const files = fs.readdirSync(dir).filter(f => f.endsWith('.sql')).sort()

;(async () => {
  for (const file of files) {
    const sql = fs.readFileSync(path.join(dir, file), 'utf8')
    await pool.query(sql)
    console.log(`  ✓  ${file}`)
  }
  console.log('\nSeed concluído.')
  pool.end()
})().catch(err => { console.error(err); process.exit(1) })
