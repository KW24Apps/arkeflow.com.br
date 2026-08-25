import bcrypt from 'bcryptjs'
import { randomUUID } from 'crypto'
import { platformPool, getTenantPool } from '../../config/database'
import { AppError } from '../../core/errors/AppError'
import type { JwtPayload } from '@arkeflow/shared'

export async function login(
  email: string, senha: string, ip?: string, forcar?: boolean,
  plataforma: 'web' | 'mobile' | 'desktop' = 'web',
  currentSid?: string | null
): Promise<JwtPayload> {
  const { rows } = await platformPool.query(
    `SELECT u.id, u.nome, u.email, u.username, u.senha_hash, u.nivel, u.cliente_id,
            u.dias_semana, u.hora_inicio, u.hora_fim,
            u.sessao_web, u.sessao_web_ip, u.sessao_web_em,
            u.sessao_mobile, u.sessao_mobile_ip, u.sessao_mobile_em,
            u.ultimo_acesso_web, u.ultimo_acesso_mobile,
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

  // Busca banco_id do cliente
  let banco_id: string | null = null
  if (usuario.cliente_id) {
    const { rows: [cliente] } = await platformPool.query(
      'SELECT banco_id FROM clientes WHERE id = $1', [usuario.cliente_id]
    )
    banco_id = cliente?.banco_id ?? null
  }

  // Determina janela de inatividade para validar se sessão anterior ainda está ativa
  let inatividadeMinutos = 360
  if (banco_id) {
    const { rows: [cfg] } = await getTenantPool(banco_id).query<{ inatividade_minutos: number }>(
      'SELECT inatividade_minutos FROM configuracoes_loja LIMIT 1'
    )
    inatividadeMinutos = cfg?.inatividade_minutos ?? 360
  }

  const isWeb = plataforma === 'web' || plataforma === 'desktop'
  const sessaoAtualSid = isWeb ? (usuario.sessao_web  ?? null) : (usuario.sessao_mobile  ?? null)
  const sessaoAtualIp  = isWeb ? (usuario.sessao_web_ip ?? null) : (usuario.sessao_mobile_ip ?? null)
  const sessaoAtualEm  = isWeb ? (usuario.sessao_web_em ?? null) : (usuario.sessao_mobile_em ?? null)
  const ultimoAcesso: Date | null = isWeb
    ? (usuario.ultimo_acesso_web ?? null)
    : (usuario.ultimo_acesso_mobile ?? null)
  const mesmoDispositivo = currentSid != null && currentSid === sessaoAtualSid

  const sessaoAtiva =
    sessaoAtualSid !== null &&
    ultimoAcesso !== null &&
    (Date.now() - ultimoAcesso.getTime()) / 60000 <= inatividadeMinutos &&
    !mesmoDispositivo

  if (sessaoAtiva && !forcar) {
    throw new AppError('Sessão ativa em outro dispositivo', 409, 'SESSAO_ATIVA', {
      ip: sessaoAtualIp,
      em: sessaoAtualEm,
    })
  }

  const sid = randomUUID()
  if (isWeb) {
    await platformPool.query(
      `UPDATE usuarios SET sessao_web = $2, sessao_web_ip = $3, sessao_web_em = NOW(), ultimo_acesso_web = NOW() WHERE id = $1`,
      [usuario.id, sid, ip ?? null]
    )
  } else {
    await platformPool.query(
      `UPDATE usuarios SET sessao_mobile = $2, sessao_mobile_ip = $3, sessao_mobile_em = NOW(), ultimo_acesso_mobile = NOW() WHERE id = $1`,
      [usuario.id, sid, ip ?? null]
    )
  }

  await platformPool.query(
    `INSERT INTO logs_acesso (usuario_id, cliente_id, ip, tipo, plataforma) VALUES ($1, $2, $3, 'login', $4)`,
    [usuario.id, usuario.cliente_id ?? null, ip ?? null, plataforma]
  ).catch(() => {})

  const permissoes: string[] =
    usuario.nivel === 'vendedor' ? (usuario.permissoes ?? []) : ['*']

  return {
    id:         usuario.id,
    nome:       usuario.nome,
    email:      usuario.email,
    username:   usuario.username ?? null,
    nivel:      usuario.nivel,
    cliente_id: usuario.cliente_id ?? null,
    banco_id,
    permissoes,
    sid,
    plataforma,
  }
}
