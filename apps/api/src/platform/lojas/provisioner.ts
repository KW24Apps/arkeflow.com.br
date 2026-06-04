import { platformPool } from '../../config/database'

// Cria o modelo "Administrador" padrão para uma loja
// Chamado no cadastro de nova loja e na migração de lojas existentes
export async function provisionarModeloAdmin(loja_id: string) {
  await platformPool.query(
    `INSERT INTO modelos_permissao (loja_id, nome, permissoes, sistema)
     VALUES ($1, 'Administrador', '["*"]', true)
     ON CONFLICT DO NOTHING`,
    [loja_id]
  )
}
