'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { loginRequest } from '@/lib/api/auth'
import { useAuthStore } from '@/store/auth.store'
import type { NivelUsuario, JwtPayload } from '@arkeflow/shared'

// Vendedor com permissões de painel → painel. Sem permissões → PDV mobile.
function getRedirectPath(usuario: JwtPayload): string {
  const rotas: Record<NivelUsuario, string> = {
    admin_plataforma: '/admin/dashboard',
    parceiro:         '/painel/dashboard',
    dono_loja:        '/painel/dashboard',
    vendedor:         '/pdv',
  }
  if (usuario.nivel === 'vendedor') {
    const temPainel = Array.isArray(usuario.permissoes) && usuario.permissoes.length > 0
    return temPainel ? '/painel/dashboard' : '/pdv'
  }
  return rotas[usuario.nivel]
}

export function LoginForm() {
  const router = useRouter()
  const setAuth = useAuthStore(s => s.setAuth)

  const [email, setEmail]     = useState('')
  const [senha, setSenha]     = useState('')
  const [erro, setErro]       = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErro('')
    setLoading(true)

    try {
      const { token, usuario } = await loginRequest(email, senha)
      setAuth(token, usuario)

      // Salva em cookie para o middleware Next.js poder ler
      document.cookie = `arkeflow_token=${token}; path=/; max-age=${60 * 60 * 24 * 7}`

      router.push(getRedirectPath(usuario))
    } catch (err: any) {
      setErro(err?.response?.data?.error ?? 'Erro ao conectar. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <Input
        label="Email ou usuário"
        type="text"
        name="email"
        placeholder="seu@email.com ou nome_usuario"
        value={email}
        onChange={e => setEmail(e.target.value)}
        required
        autoComplete="username email"
      />
      <Input
        label="Senha"
        type="password"
        name="password"
        placeholder="••••••••"
        value={senha}
        onChange={e => setSenha(e.target.value)}
        required
        autoComplete="current-password"
      />

      {erro && (
        <p className="text-xs text-red-400 text-center -mt-1">{erro}</p>
      )}

      <Button type="submit" loading={loading} className="mt-1">
        Entrar
      </Button>
    </form>
  )
}
