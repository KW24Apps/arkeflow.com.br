'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { loginRequest } from '@/lib/api/auth'
import type { SessaoAtivaError } from '@/lib/api/auth'
import { useAuthStore } from '@/store/auth.store'
import type { JwtPayload } from '@arkeflow/shared'

// Este app só atende admin_plataforma — demais perfis não têm rota aqui
// (dono_loja/colaborador usam app.arkevest.com.br)
function getRedirectPath(usuario: JwtPayload): string | null {
  if (usuario.nivel === 'admin_plataforma') return '/admin/dashboard'
  return null
}

function formatarData(em: string | null): string {
  if (!em) return 'data desconhecida'
  return new Date(em).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

export function LoginForm() {
  const router  = useRouter()
  const setAuth = useAuthStore(s => s.setAuth)

  const [email, setEmail]     = useState('')
  const [senha, setSenha]     = useState('')
  const [erro, setErro]       = useState('')
  const [loading, setLoading] = useState(false)

  const [sessaoAtiva, setSessaoAtiva] = useState<SessaoAtivaError | null>(null)
  const cancelarBtnRef = useRef<HTMLButtonElement>(null)

  async function doLogin(forcar?: boolean) {
    setErro('')
    setLoading(true)
    try {
      const { token, usuario } = await loginRequest(email, senha, forcar)

      const redirectPath = getRedirectPath(usuario)
      if (!redirectPath) {
        setErro('Este é o painel administrativo. Use app.arkevest.com.br para acessar sua loja.')
        return
      }

      setAuth(token, usuario)
      document.cookie = `arkeflow_token=${token}; path=/; max-age=${60 * 60 * 24 * 7}`
      router.push(redirectPath)
    } catch (err: any) {
      if (err?.response?.status === 409 && err?.response?.data?.code === 'SESSAO_ATIVA') {
        setSessaoAtiva(err.response.data as SessaoAtivaError)
        setTimeout(() => cancelarBtnRef.current?.focus(), 0)
      } else {
        setErro(err?.response?.data?.error ?? 'Erro ao conectar. Tente novamente.')
      }
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    await doLogin()
  }

  async function handleForcar() {
    setSessaoAtiva(null)
    await doLogin(true)
  }

  return (
    <>
      <style>{`
        .sa-cancelar {
          background: rgba(255,255,255,0.04);
          border: 0.5px solid rgba(255,255,255,0.15);
          color: rgba(255,255,255,0.7);
          transition: background 120ms, border-color 120ms, color 120ms;
        }
        .sa-cancelar:hover {
          background: rgba(255,255,255,0.08);
          border-color: rgba(255,255,255,0.30);
          color: rgba(255,255,255,0.9);
        }
        .sa-cancelar:focus-visible {
          outline: none;
          box-shadow: 0 0 0 2px rgba(255,255,255,0.25);
        }
        .sa-continuar {
          background: rgba(0,239,255,0.12);
          border: 0.5px solid rgba(0,239,255,0.35);
          color: rgba(0,239,255,0.9);
          transition: background 120ms, border-color 120ms;
        }
        .sa-continuar:hover {
          background: rgba(0,239,255,0.20);
          border-color: rgba(0,239,255,0.60);
        }
        .sa-continuar:focus-visible {
          outline: none;
          box-shadow: 0 0 0 2px rgba(0,239,255,0.35);
        }
      `}</style>

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

      {/* ── Modal: sessão ativa em outro dispositivo ─────────────────── */}
      {sessaoAtiva && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(2,8,16,0.82)' }}
        >
          <div
            style={{
              background: 'rgba(8,18,30,0.92)',
              backdropFilter: 'blur(16px)',
              border: '0.5px solid rgba(255,255,255,0.12)',
              borderRadius: '14px',
              padding: '28px 24px 24px',
              maxWidth: '380px',
              width: '100%',
            }}
          >
            <p style={{ fontSize: '15px', fontWeight: 600, color: 'rgba(255,255,255,0.9)', marginBottom: '10px' }}>
              Você já está conectado em outro dispositivo
            </p>
            <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)', lineHeight: 1.55, marginBottom: '22px' }}>
              Último acesso em <span style={{ color: 'rgba(255,255,255,0.75)' }}>{formatarData(sessaoAtiva.em)}</span>
              {sessaoAtiva.ip ? (
                <> a partir de <span style={{ color: 'rgba(255,255,255,0.75)' }}>{sessaoAtiva.ip}</span></>
              ) : null}.
              {' '}Deseja desconectar esse dispositivo e continuar aqui?
            </p>

            <div
              className="flex gap-3"
              onKeyDown={e => {
                if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
                  e.preventDefault()
                  const btns = [cancelarBtnRef.current, document.getElementById('sa-continuar-btn')]
                  const idx = btns.indexOf(document.activeElement as HTMLButtonElement)
                  btns[(idx + 1) % 2]?.focus()
                }
              }}
            >
              <button
                ref={cancelarBtnRef}
                type="button"
                className="sa-cancelar"
                style={{ flex: 1, padding: '10px 0', borderRadius: '10px', fontSize: '13px', fontWeight: 500, cursor: 'pointer' }}
                onClick={() => setSessaoAtiva(null)}
              >
                Cancelar
              </button>
              <button
                id="sa-continuar-btn"
                type="button"
                className="sa-continuar"
                style={{ flex: 1, padding: '10px 0', borderRadius: '10px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
                onClick={handleForcar}
                disabled={loading}
              >
                {loading ? 'Entrando...' : 'Continuar aqui'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
