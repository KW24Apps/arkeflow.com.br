import { platformPool } from '../../config/database'

// Cria o modelo "Administrador" padrão para um cliente
// Chamado no cadastro de novo cliente e na migração de clientes existentes
export async function provisionarModeloAdmin(cliente_id: string) {
  await platformPool.query(
    `INSERT INTO modelos_permissao (cliente_id, nome, permissoes, sistema)
     VALUES ($1, 'Administrador', '["*"]', true)
     ON CONFLICT DO NOTHING`,
    [cliente_id]
  )
}
