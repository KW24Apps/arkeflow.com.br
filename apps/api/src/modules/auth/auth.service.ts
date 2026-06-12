import bcrypt from 'bcryptjs'
import { randomUUID } from 'crypto'
import { platformPool, getTenantPool } from '../../config/database'
import { AppError } from '../../core/errors/AppError'
import type { JwtPayload } from '@arkeflow/shared'

function conflitaPlataforma(atual: string, entrando: string): boolean {
  if (entrando === 'mobile') return atual === 'mobile'
  // web e desktop conflitam entre si, mas não com mobile
  return atual === 'web' || atual === 'desktop'
}

export async function login(
  email: string, senha: string, ip?: string, forcar?: boolean, plataforma: 'web' | 'mobile' | 'desktop' = 'web'
): Promise<JwtPayload> {
  const { rows } = await platformPool.query(
    `SELECT u.id, u.nome, u.email, u.username, u.senha_hash, u.nivel, u.loja_id,
            u.dias_semana, u.hora_inicio, u.hora_fim,
            u.sessao_atual, u.sessao_ip, u.sessao_em, u.sessao_plataforma, u.ultimo_acesso,
            COALESCE(mp.permissoes, u.permissoes, '[]'::jsonb) AS permissoes
     FROM usuarios u
     LEFT JOIN modelos_permissao mp ON mp.id = u.modelo_permissao_id
     WHERE (u.email = $1 OR u.username = $1) AND u.ativo = true`,
    [email]
  )

  const usuario = rows[0]
  if (!usuario) throw new AppError('Entre em contato com o administrador.', 401, 'CONTA_NAO_ENCONTRADA')

  const senhaValida = await bcrypt.compare(senha, usuario.senha_hash)
  if (!senhaValida) throw new AppError('Senha incorreta.', 401, 'SENHA_INCORRETA')

  // Verifica restrição de horário (só para vendedor)
  if (usuario.nivel === 'vendedor' && (usuario.dias_semana || usuario.hora_inicio)) {
    const now       = new Date()
    const diaSemana = now.getDay()
    const horaAtual = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`

    if (usuario.dias_semana && !usuario.dias_semana.includes(diaSemana)) {
      throw new AppError('Acesso não permitido neste dia da semana.', 403, 'FORA_HORARIO')
    }
    if (usuario.hora_inicio && usuario.hora_fim) {
      if (horaAtual < usuario.hora_inicio || horaAtual > usuario.hora_fim) {
        throw new AppError(
          `Acesso permitido somente entre ${usuario.hora_inicio} e ${usuario.hora_fim}.`,
          403, 'FORA_HORARIO'
        )
      }
    }
  }

  // Busca banco_id da loja
  let banco_id: string | null = null
  if (usuario.loja_id) {
    const { rows: [loja] } = await platformPool.query(
      'SELECT banco_id FROM lojas WHERE id = $1', [usuario.loja_id]
    )
    banco_id = loja?.banco_id ?? null
  }

  // Determina janela de inatividade para validar se sessão anterior ainda está ativa
  let inatividadeMinutos = 360
  if (banco_id) {
    const { rows: [cfg] } = await getTenantPool(banco_id).query<{ inatividade_minutos: number }>(
      'SELECT inatividade_minutos FROM configuracoes_loja LIMIT 1'
    )
    inatividadeMinutos = cfg?.inatividade_minutos ?? 360
  }

  const ultimoAcesso: Date | null = usuario.ultimo_acesso ?? null
  const sessaoPlataformaAtual = (usuario.sessao_plataforma as string) ?? 'web'
  const sessaoAtiva =
    usuario.sessao_atual !== null &&
    ultimoAcesso !== null &&
    (Date.now() - (ultimoAcesso as Date).getTime()) / 60000 <= inatividadeMinutos &&
    conflitaPlataforma(sessaoPlataformaAtual, plataforma)

  if (sessaoAtiva && !forcar) {
    throw new AppError('Sessão ativa em outro dispositivo', 409, 'SESSAO_ATIVA', {
      ip: usuario.sessao_ip,
      em: usuario.sessao_em,
    })
  }

  // Cria nova sessão (sobrescreve qualquer sessão anterior)
  const sid = randomUUID()
  await platformPool.query(
    `UPDATE usuarios SET sessao_atual = $2, sessao_ip = $3, sessao_em = NOW(), ultimo_acesso = NOW(), sessao_plataforma = $4 WHERE id = $1`,
    [usuario.id, sid, ip ?? null, plataforma]
  )

  await platformPool.query(
    `INSERT INTO logs_acesso (usuario_id, loja_id, ip, tipo) VALUES ($1, $2, $3, 'login')`,
    [usuario.id, usuario.loja_id ?? null, ip ?? null]
  ).catch(() => {})

  const permissoes: string[] =
    usuario.nivel === 'vendedor' ? (usuario.permissoes ?? []) : ['*']

  return {
    id:         usuario.id,
    nome:       usuario.nome,
    email:      usuario.email,
    username:   usuario.username ?? null,
    nivel:      usuario.nivel,
    loja_id:    usuario.loja_id ?? null,
    banco_id,
    permissoes,
    sid,
    plataforma,
  }
}
