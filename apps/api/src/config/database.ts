import { Pool } from 'pg'
import { env } from './env'

// Pool do banco central da plataforma — singleton
export const platformPool = new Pool({ connectionString: env.DATABASE_URL })

// Cache de pools por loja — evita abrir um novo pool a cada requisição
const tenantPools = new Map<string, Pool>()

export function getTenantPool(databaseName: string): Pool {
  if (!tenantPools.has(databaseName)) {
    const url = new URL(env.DATABASE_URL)
    url.pathname = `/${databaseName}`
    tenantPools.set(databaseName, new Pool({ connectionString: url.toString() }))
  }
  return tenantPools.get(databaseName)!
}
