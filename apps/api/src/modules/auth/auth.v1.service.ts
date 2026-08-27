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

// Encerra a sessão de verdade no servidor (mesma lógica de POST /auth/logout clássico, ver
// auth.routes.ts) -- limpa sessao_web/sessao_web_ip/sessao_web_em, senão o registro fica
// "ativo" até expirar por inatividade (default 360min) mesmo depois do usuário sair pelo botão.
// Bug real (task 05, connect.arkeflow.com.br): clearSession() do Connect só limpava o
// localStorage, nunca avisava o hub -- próximo login batia em SESSAO_ATIVA mesmo tendo saído.
export async function logoutSessaoWeb(payload: Pick<JwtPayload, 'id' | 'cliente_id' | 'plataforma'>, ip: string): Promise<void> {
  const isWeb = !payload.plataforma || payload.plataforma === 'web' || payload.plataforma === 'desktop'
  const clearCol = isWeb
    ? 'sessao_web = NULL, sessao_web_ip = NULL, sessao_web_em = NULL'
    : 'sessao_mobile = NULL, sessao_mobile_ip = NULL, sessao_mobile_em = NULL'

  await Promise.all([
    platformPool.query(`UPDATE usuarios SET ${clearCol} WHERE id = $1`, [payload.id]),
    platformPool.query(
      `INSERT INTO logs_acesso (usuario_id, cliente_id, ip, tipo, plataforma, motivo) VALUES ($1,$2,$3,'logout',$4,'manual')`,
      [payload.id, payload.cliente_id ?? null, ip, payload.plataforma ?? 'web']
    ).catch(() => {}),
  ])
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

// Resolve cliente_id pelo email/username SEM validar senha -- usado só pra checar licença ANTES
// de chamar login() (que já muda sessao_web/sid/logs_acesso como efeito colateral de validar
// credenciais). Sem isso, uma tentativa de login não-licenciada, mesmo com senha certa, já teria
// sequestrado a sessão web ativa do usuário no Arkevest antes de ser rejeitada pela licença.
// `found: false` deixa o erro real (conta não encontrada) pra login() emitir, sem mascarar com
// "não licenciado".
export async function resolveClienteIdSemAutenticar(identifier: string): Promise<{ found: boolean; clienteId: string | null }> {
  const { rows: [row] } = await platformPool.query<{ cliente_id: string | null }>(
    `SELECT cliente_id FROM usuarios WHERE (email = $1 OR username = $1) AND ativo = true`,
    [identifier]
  )
  return row ? { found: true, clienteId: row.cliente_id } : { found: false, clienteId: null }
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
