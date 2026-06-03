import { api } from './client'
import type { JwtPayload } from '@arkeflow/shared'

interface LoginResponse {
  token: string
  usuario: JwtPayload
}

export async function loginRequest(email: string, senha: string): Promise<LoginResponse> {
  const { data } = await api.post<LoginResponse>('/auth/login', { email, senha })
  return data
}

export async function meRequest(): Promise<JwtPayload> {
  const { data } = await api.get<{ usuario: JwtPayload }>('/auth/me')
  return data.usuario
}
