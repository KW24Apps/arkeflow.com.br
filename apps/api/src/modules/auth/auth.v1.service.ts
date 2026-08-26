import crypto from 'crypto'
import { platformPool } from '../../config/database'
import { AppError } from '../../core/errors/AppError'
import type { JwtPayload } from '@arkeflow/shared'

export interface ProdutoCaller {
  id:   string
  slug: string
}

export function hashApiKey(rawKey: string): string {
  return crypto.createHash('sha256').update(rawKey).digest('hex')
}

// Identifica QUEM está chamando o hub (o backend do produto, ex.: Connect) -- não confundir com o
// JWT do usuário final, que autentica o usuário dentro daquele produto.
export async function resolveApiKeyCaller(rawKey: string | undefined): Promise<ProdutoCaller> {
  if (!rawKey) throw new AppError('Chave de API ausente (header X-Api-Key)', 401, 'API_KEY_AUSENTE')

  const hash = hashApiKey(rawKey)
  const { rows: [produto] } = await platformPool.query<ProdutoCaller>(
    `SELECT id, slug FROM produtos_plataforma WHERE api_key_hash = $1 AND ativo = true`,
    [hash]
  )
  if (!produto) throw new AppError('Chave de API inválida', 401, 'API_KEY_INVALIDA')
  return produto
}

// Sem licença ativa pro produto = sem token. Sempre por cliente_produto, nunca atalho de grupo.
export async function assertLicenciado(clienteId: string | null, produtoSlug: string): Promise<void> {
  if (!clienteId) {
    throw new AppError('Usuário não pertence a um cliente licenciado', 403, 'PRODUTO_NAO_LICENCIADO')
  }
  const { rows } = await platformPool.query(
    `SELECT 1 FROM cliente_produto cp
     JOIN produtos_plataforma pp ON pp.id = cp.produto_id
     WHERE cp.cliente_id = $1 AND pp.slug = $2 AND cp.ativo = true AND pp.ativo = true`,
    [clienteId, produtoSlug]
  )
  if (rows.length === 0) {
    throw new AppError('Cliente não possui licença ativa para este produto', 403, 'PRODUTO_NAO_LICENCIADO')
  }
}

export interface IdentityResponse {
  usuario: {
    id:       string
    nome:     string
    email:    string
    username: string | null
    nivel:    string
  }
  cliente: { id: string; nome: string } | null
  produtos: string[]
}

// Reconstrói o perfil completo (usuário + cliente + produtos ativos) sempre lendo do banco na
// hora -- não confia em campos "congelados" no JWT, pra licenciamento revogado valer na hora.
export async function buildIdentityResponse(payload: Pick<JwtPayload, 'id' | 'nome' | 'email' | 'username' | 'nivel' | 'cliente_id'>): Promise<IdentityResponse> {
  let cliente: { id: string; nome: string } | null = null
  let produtos: string[] = []

  if (payload.cliente_id) {
    const [{ rows: [c] }, { rows: prodRows }] = await Promise.all([
      platformPool.query<{ id: string; nome: string }>(
        `SELECT id, nome FROM clientes WHERE id = $1`, [payload.cliente_id]
      ),
      platformPool.query<{ slug: string }>(
        `SELECT pp.slug FROM cliente_produto cp
         JOIN produtos_plataforma pp ON pp.id = cp.produto_id
         WHERE cp.cliente_id = $1 AND cp.ativo = true AND pp.ativo = true`,
        [payload.cliente_id]
      ),
    ])
    cliente  = c ? { id: c.id, nome: c.nome } : null
    produtos = prodRows.map(r => r.slug)
  }

  return {
    usuario: {
      id:       payload.id,
      nome:     payload.nome,
      email:    payload.email,
      username: payload.username ?? null,
      nivel:    payload.nivel,
    },
    cliente,
    produtos,
  }
}
