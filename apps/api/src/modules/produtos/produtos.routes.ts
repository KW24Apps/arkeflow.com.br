import type { FastifyInstance } from 'fastify'
import { authMiddleware } from '../../core/middlewares/auth'
import { authorize } from '../../core/middlewares/authorize'
import * as ctrl from './produtos.controller'
import { getTenantPoolFromRequest } from '../../core/tenant/resolver'

const dono = [authMiddleware, authorize('dono_loja')]
const loja = [authMiddleware, authorize('dono_loja', 'vendedor')]

export async function produtosRoutes(app: FastifyInstance) {
  // Busca por código de barras — nível 1: variação exata; nível 2: produto universal
  app.get('/barcode/:codigo', { preHandler: loja }, async (req, reply) => {
    const pool = getTenantPoolFromRequest(req)
    const { codigo } = req.params as { codigo: string }

    // Level 1: variation barcode wins
    const { rows: [versao] } = await pool.query(
      `SELECT v.*, p.nome AS produto_nome, p.preco_base, p.controle_estoque, p.aceita_desconto, p.id AS produto_id, tp.nome AS tipo_nome
       FROM versoes v
       JOIN produtos_arkevest p ON p.id = v.produto_id
       LEFT JOIN tipos_produto tp ON tp.id = p.tipo_id
       WHERE v.codigo_barras = $1 AND v.ativo = true AND v.arquivado = false AND p.ativo = true AND p.arquivado = false`,
      [codigo]
    )
    if (versao) return reply.send({ match: 'versao', ...versao })

    // Level 2: product-level barcode → return product + active variations
    const { rows: [produto] } = await pool.query(
      `SELECT p.*, tp.nome AS tipo_nome FROM produtos_arkevest p LEFT JOIN tipos_produto tp ON tp.id = p.tipo_id WHERE p.codigo_barras = $1 AND p.ativo = true AND p.arquivado = false`,
      [codigo]
    )
    if (!produto) return reply.status(404).send({ error: 'Código de barras não encontrado' })

    const { rows: versoes } = await pool.query(
      `SELECT * FROM versoes WHERE produto_id = $1 AND ativo = true AND arquivado = false ORDER BY atributos_json::text`,
      [produto.id]
    )
    return reply.send({ match: 'produto', produto, versoes })
  })

  // Listagem e consulta — vendedor também pode ler
  app.get('/',    { preHandler: loja }, ctrl.listHandler)
  app.get('/:id', { preHandler: loja }, ctrl.getHandler)

  // CRUD — apenas dono da loja
  app.post('/',    { preHandler: dono }, ctrl.createHandler)
  app.put('/:id',  { preHandler: dono }, ctrl.updateHandler)
  app.delete('/:id', { preHandler: dono }, ctrl.deleteHandler)

  // Atributos
  app.post('/:id/atributos',               { preHandler: dono }, ctrl.addAtributoHandler)
  app.delete('/:id/atributos/:atributo_id',{ preHandler: dono }, ctrl.removeAtributoHandler)

  // Versões
  app.post('/:id/versoes',              { preHandler: dono }, ctrl.createVersaoHandler)
  app.put('/:id/versoes/:versao_id',    { preHandler: dono }, ctrl.updateVersaoHandler)
  app.delete('/:id/versoes/:versao_id', { preHandler: dono }, ctrl.deleteVersaoHandler)
}
