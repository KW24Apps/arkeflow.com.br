import bcrypt from 'bcryptjs'
import { platformPool } from '../../config/database'
import { AppError } from '../../core/errors/AppError'
import type { JwtPayload } from '@arkeflow/shared'

export async function login(email: string, senha: string): Promise<JwtPayload> {
  const { rows } = await platformPool.query(
    `SELECT id, email, senha_hash, nivel, loja_id
     FROM usuarios
     WHERE email = $1 AND ativo = true`,
    [email]
  )

  const usuario = rows[0]
  if (!usuario) throw new AppError('Email ou senha inválidos', 401)

  const senhaValida = await bcrypt.compare(senha, usuario.senha_hash)
  if (!senhaValida) throw new AppError('Email ou senha inválidos', 401)

  // Busca banco_id da loja — null para admin_plataforma
  let banco_id: string | null = null
  if (usuario.loja_id) {
    const { rows: lojaRows } = await platformPool.query(
      'SELECT banco_id FROM lojas WHERE id = $1',
      [usuario.loja_id]
    )
    banco_id = lojaRows[0]?.banco_id ?? null
  }

  await platformPool.query(
    'UPDATE usuarios SET ultimo_acesso = NOW() WHERE id = $1',
    [usuario.id]
  )

  return {
    id: usuario.id,
    email: usuario.email,
    nivel: usuario.nivel,
    loja_id: usuario.loja_id ?? null,
    banco_id,
  }
}
