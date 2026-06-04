import bcrypt from 'bcryptjs'
import { platformPool } from '../../config/database'
import { AppError } from '../../core/errors/AppError'
import type { JwtPayload } from '@arkeflow/shared'

export async function login(email: string, senha: string, ip?: string): Promise<JwtPayload> {
  const { rows } = await platformPool.query(
    `SELECT id, email, senha_hash, nivel, loja_id, permissoes,
            dias_semana, hora_inicio, hora_fim
     FROM usuarios
     WHERE email = $1 AND ativo = true`,
    [email]
  )

  const usuario = rows[0]
  if (!usuario) throw new AppError('Email ou senha inválidos', 401)

  const senhaValida = await bcrypt.compare(senha, usuario.senha_hash)
  if (!senhaValida) throw new AppError('Email ou senha inválidos', 401)

  // Verifica restrição de horário (só para vendedor)
  if (usuario.nivel === 'vendedor' && (usuario.dias_semana || usuario.hora_inicio)) {
    const now        = new Date()
    const diaSemana  = now.getDay()  // 0=dom … 6=sab
    const horaAtual  = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`

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

  // Atualiza último acesso e registra log
  await platformPool.query(
    'UPDATE usuarios SET ultimo_acesso = NOW() WHERE id = $1', [usuario.id]
  )
  await platformPool.query(
    `INSERT INTO logs_acesso (usuario_id, loja_id, ip, tipo)
     VALUES ($1, $2, $3, 'login')`,
    [usuario.id, usuario.loja_id ?? null, ip ?? null]
  ).catch(() => {})  // não bloqueia login se o log falhar

  const permissoes: string[] =
    usuario.nivel === 'vendedor' ? (usuario.permissoes ?? []) : ['*']

  return {
    id: usuario.id,
    email: usuario.email,
    nivel: usuario.nivel,
    loja_id: usuario.loja_id ?? null,
    banco_id,
    permissoes,
  }
}
