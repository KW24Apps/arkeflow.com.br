'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { TopBar } from '@/components/layout/TopBar'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { useAuthStore } from '@/store/auth.store'
import { api } from '@/lib/api/client'

export default function MeusDadosPage() {
  const router  = useRouter()
  const usuario = useAuthStore(s => s.usuario)
  const setAuth = useAuthStore(s => s.setAuth)

  const [nome,     setNome]     = useState('')
  const [email,    setEmail]    = useState('')
  const [username, setUsername] = useState('')

  // Carrega dados do servidor — JWT pode estar stale em sessões antigas
  useEffect(() => {
    api.get<{ usuario: any }>('/auth/me').then(r => {
      const u = r.data.usuario
      setNome(u.nome ?? '')
      setEmail(u.email ?? '')
      setUsername(u.username ?? '')
    }).catch(() => {
      // fallback para o store
      setNome(usuario?.nome ?? '')
      setEmail(usuario?.email ?? '')
      setUsername((usuario as any)?.username ?? '')
    })
  }, [])
  const [novaSenha,setNovaSenha]= useState('')
  const [confirma, setConfirma] = useState('')

  const [salvando, setSalvando] = useState(false)
  const [msg,      setMsg]      = useState('')
  const [erro,     setErro]     = useState('')

  async function handleSalvar(e: React.FormEvent) {
    e.preventDefault()
    setErro(''); setMsg('')

    if (novaSenha && novaSenha !== confirma) {
      setErro('As senhas não coincidem.'); return
    }
    if (novaSenha && novaSenha.length < 6) {
      setErro('Senha mínimo 6 caracteres.'); return
    }

    setSalvando(true)
    try {
      await api.put(`/colaboradores/${usuario!.id}`, {
        nome,
        email:    email || undefined,
        username: username || null,
      })

      if (novaSenha) {
        await api.put(`/colaboradores/${usuario!.id}/senha`, { senha: novaSenha })
      }

      // Re-autentica para atualizar o JWT com o novo nome
      const { data } = await api.get<{ usuario: any }>('/auth/me')
      const token = JSON.parse(localStorage.getItem('arkeflow_auth') ?? '{}')?.state?.token
      if (token) setAuth(token, data.usuario)

      setNovaSenha(''); setConfirma('')
      setMsg('Dados atualizados com sucesso.')
    } catch (err: any) {
      setErro(err?.response?.data?.error ?? 'Erro ao salvar.')
    } finally { setSalvando(false) }
  }

  return (
    <>
      <TopBar />
      <main className="flex-1 overflow-y-auto p-4 md:p-6 pb-10">
        <form onSubmit={handleSalvar} className="max-w-lg flex flex-col gap-5">

          {/* Avatar */}
          <div className="flex items-center gap-4 bg-deep-ocean border border-ocean-depth rounded-2xl p-5">
            <div className="w-16 h-16 rounded-full bg-ocean-depth flex items-center justify-center text-2xl font-bold text-sea-foam">
              {nome.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="text-sea-foam font-semibold text-lg">{nome || '—'}</p>
              <p className="text-steel text-sm capitalize">{usuario?.nivel?.replace('_', ' ') ?? ''}</p>
            </div>
          </div>

          {/* Dados de acesso */}
          <section className="bg-deep-ocean border border-ocean-depth rounded-2xl p-5 flex flex-col gap-4">
            <h3 className="text-sea-foam font-semibold text-xs uppercase tracking-wider">Identificação</h3>
            <Input label="Nome" value={nome} onChange={e => setNome(e.target.value)} placeholder="Seu nome completo" />
            <Input label="Email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="email@exemplo.com" />
            <div className="flex flex-col gap-1.5">
              <Input label="Usuário (opcional)" value={username} onChange={e => setUsername(e.target.value.toLowerCase())} placeholder="ex: gabriel.acker" />
              <p className="text-steel text-xs">Permite login sem digitar o email completo</p>
            </div>
          </section>

          {/* Senha */}
          <section className="bg-deep-ocean border border-ocean-depth rounded-2xl p-5 flex flex-col gap-4">
            <h3 className="text-sea-foam font-semibold text-xs uppercase tracking-wider">Alterar Senha</h3>
            <p className="text-steel text-xs -mt-2">Deixe em branco para manter a senha atual</p>
            <Input label="Nova senha" type="password" value={novaSenha} onChange={e => setNovaSenha(e.target.value)} placeholder="Mínimo 6 caracteres" />
            <Input label="Confirmar nova senha" type="password" value={confirma} onChange={e => setConfirma(e.target.value)} placeholder="Repita a senha" />
          </section>

          {erro && <p className="text-red-400 text-sm text-center">{erro}</p>}
          {msg  && <p className="text-mint-green text-sm text-center">{msg}</p>}

          <div className="flex gap-3">
            <button type="button" onClick={() => router.back()}
              className="flex-1 min-h-[52px] border border-ocean-depth text-steel rounded-2xl text-sm">
              Voltar
            </button>
            <Button type="submit" loading={salvando} className="flex-1 min-h-[52px] rounded-2xl">
              Salvar
            </Button>
          </div>

        </form>
      </main>
    </>
  )
}
