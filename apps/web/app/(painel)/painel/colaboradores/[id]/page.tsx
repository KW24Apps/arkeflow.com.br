'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { TopBar } from '@/components/layout/TopBar'
import { Input } from '@/components/ui/Input'
import { colaboradoresApi, type Colaborador } from '@/lib/api/colaboradores'
import { SeletorPermissoes } from '@/components/painel/SeletorPermissoes'

export default function ColaboradorDetalhe() {
  const { id }  = useParams<{ id: string }>()
  const router  = useRouter()
  const [colab,       setColab]       = useState<Colaborador | null>(null)
  const [loading,     setLoading]     = useState(true)
  const [salvando,    setSalvando]    = useState(false)
  const [nome,        setNome]        = useState('')
  const [permissoes,  setPermissoes]  = useState<string[]>([])
  const [novaSenha,   setNovaSenha]   = useState('')
  const [msgSenha,    setMsgSenha]    = useState('')
  const [msg,         setMsg]         = useState('')

  useEffect(() => {
    colaboradoresApi.get(id).then(c => {
      setColab(c); setNome(c.nome); setPermissoes(c.permissoes)
    }).finally(() => setLoading(false))
  }, [id])

  async function handleSalvar() {
    setSalvando(true); setMsg('')
    try {
      const c = await colaboradoresApi.update(id, { nome, permissoes })
      setColab(c); setMsg('Salvo com sucesso.')
    } catch (err: any) {
      setMsg(err?.response?.data?.error ?? 'Erro ao salvar.')
    } finally { setSalvando(false) }
  }

  async function handleRedefinirSenha() {
    setMsgSenha('')
    if (novaSenha.length < 6) { setMsgSenha('Mínimo 6 caracteres.'); return }
    try {
      await colaboradoresApi.redefinirSenha(id, novaSenha)
      setNovaSenha(''); setMsgSenha('Senha atualizada.')
    } catch (err: any) {
      setMsgSenha(err?.response?.data?.error ?? 'Erro ao redefinir senha.')
    }
  }

  async function handleDesativar() {
    if (!confirm('Desativar este colaborador?')) return
    await colaboradoresApi.remove(id)
    router.push('/painel/colaboradores')
  }

  if (loading) return (
    <><TopBar title="Colaborador" />
      <div className="flex justify-center py-16"><div className="w-8 h-8 border-2 border-electric-cyan border-t-transparent rounded-full animate-spin" /></div>
    </>
  )
  if (!colab) return <><TopBar title="Colaborador" /><p className="text-center text-steel py-16">Não encontrado.</p></>

  return (
    <>
      <TopBar title={colab.nome} />
      <main className="flex-1 overflow-y-auto p-4 md:p-6 pb-10">
        <div className="max-w-lg flex flex-col gap-4">

          {/* Dados */}
          <section className="bg-deep-ocean border border-ocean-depth rounded-2xl p-5 flex flex-col gap-4">
            <h3 className="text-sea-foam font-semibold text-xs uppercase tracking-wider">Dados</h3>
            <Input label="Nome" value={nome} onChange={e => setNome(e.target.value)} />
            <div className="flex flex-col gap-1">
              <label className="text-xs text-steel uppercase tracking-wider">Email</label>
              <p className="text-sea-foam text-sm px-1">{colab.email}</p>
            </div>
            {colab.ultimo_acesso && (
              <p className="text-steel text-xs">
                Último acesso: {new Date(colab.ultimo_acesso).toLocaleString('pt-BR')}
              </p>
            )}
          </section>

          {/* Permissões */}
          <section className="bg-deep-ocean border border-ocean-depth rounded-2xl p-5">
            <SeletorPermissoes value={permissoes} onChange={setPermissoes} />
          </section>

          {msg && (
            <p className={`text-sm text-center ${msg.includes('sucesso') ? 'text-mint-green' : 'text-red-400'}`}>{msg}</p>
          )}

          <button onClick={handleSalvar} disabled={salvando}
            className="min-h-[52px] bg-electric-cyan text-midnight rounded-2xl text-sm font-semibold disabled:opacity-40">
            {salvando ? 'Salvando...' : 'Salvar Alterações'}
          </button>

          {/* Redefinir senha */}
          <section className="bg-deep-ocean border border-ocean-depth rounded-2xl p-5 flex flex-col gap-3">
            <h3 className="text-sea-foam font-semibold text-xs uppercase tracking-wider">Redefinir Senha</h3>
            <Input label="Nova senha" type="password" value={novaSenha} onChange={e => setNovaSenha(e.target.value)} placeholder="Mínimo 6 caracteres" />
            {msgSenha && (
              <p className={`text-xs ${msgSenha.includes('atualizada') ? 'text-mint-green' : 'text-red-400'}`}>{msgSenha}</p>
            )}
            <button onClick={handleRedefinirSenha} disabled={!novaSenha}
              className="min-h-[48px] border border-ocean-depth text-sea-foam rounded-xl text-sm hover:border-teal-current transition-colors disabled:opacity-40">
              Redefinir Senha
            </button>
          </section>

          <button onClick={handleDesativar}
            className="min-h-[48px] border border-red-500/30 text-red-400 rounded-2xl text-sm">
            Desativar colaborador
          </button>

        </div>
      </main>
    </>
  )
}
