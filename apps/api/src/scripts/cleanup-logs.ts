import 'dotenv/config'
import { platformPool } from '../config/database'

// Retenção padrão: 90 dias. Sobrescreva com LOG_RETENTION_DIAS=30
const DIAS = parseInt(process.env.LOG_RETENTION_DIAS ?? '90')

;(async () => {
  const { rowCount } = await platformPool.query(
    `DELETE FROM logs_acesso WHERE criado_em < NOW() - INTERVAL '${DIAS} days'`
  )
  console.log(`Limpeza concluída: ${rowCount} registros de log removidos (mais de ${DIAS} dias).`)
  platformPool.end()
})().catch(err => { console.error(err); process.exit(1) })
