'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { TopBar } from '@/components/layout/TopBar'
import { Input } from '@/components/ui/Input'
import { colaboradoresApi, type Colaborador, type LogAcesso } from '@/lib/api/colaboradores'
import { SeletorPermissoes } from '@/components/painel/SeletorPermissoes'
import { SeletorHorario } from '@/components/painel/SeletorHorario'

type Aba = 'dados' | 'logs'

export default function ColaboradorDetalhe() {
  const { id }  = useParams<{ id: string }>()
  const router  = useRouter()
  const [aba, setAba] = useState<Aba>('dados')
  const [colab,      setColab]      = useState<Colaborador | null>(null)
  const [logs,       setLogs]       = useState<LogAcesso[]>([])
  const [loading,    setLoading]    = useState(true)
  const [salvando,   setSalvando]   = useState(false)
  const [msg,        setMsg]        = useState('')

  const [nome,       setNome]       = useState('')
  const [permissoes, setPermissoes] = useState<string[]>([])
  const [diasSemana, setDiasSemana] = useState<number[] | null>(null)
  const [horaInicio, setHoraInicio] = useState('08:00')
  const [horaFim,    setHoraFim]    = useState('18:00')
  const [novaSenha,  setNovaSenha]  = useState('')
  const [msgSenha,   setMsgSenha]   = useState('')

  useEffect(() => {
    Promise.all([colaboradoresApi.get(id), colaboradoresApi.logs(id)])
      .then(([c, l]) => {
        setColab(c); setLogs(l)
        setNome(c.nome); setPermissoes(c.permissoes)
        setDiasSemana(c.dias_semana)
        setHoraInicio(c.hora_inicio ?? '08:00')
        setHoraFim(c.hora_fim ?? '18:00')
      }).finally(() => setLoading(false))
  }, [id])

  function handleHorario(dias: number[] | null, inicio: string, fim: string) {
    setDiasSemana(dias); setHoraInicio(inicio); setHoraFim(fim)
  }

  async function handleSalvar() {
    setSalvando(true); setMsg('')
    try {
      const c = await colaboradoresApi.update(id, {
        nome, permissoes,
        dias_semana: diasSemana,
        hora_inicio: diasSemana ? horaInicio : null,
        hora_fim:    diasSemana ? horaFim    : null,
      })
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
    } catch (err: any) { setMsgSenha(err?.response?.data?.error ?? 'Erro.') }
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

  const isDono = colab.nivel === 'dono_loja'

  return (
    <>
      <TopBar title={colab.nome} />
      <main className="flex-1 overflow-y-auto pb-10">

        <div className="bg-deep-ocean border-b border-ocean-depth flex px-4">
          {(['dados', 'logs'] as Aba[]).map(a => (
            <button key={a} onClick={() => setAba(a)}
              className={`min-h-[44px] px-6 text-sm font-medium border-b-2 transition-colors ${
                aba === a ? 'text-electric-cyan border-electric-cyan' : 'text-steel border-transparent hover:text-sea-foam'
              }`}>
              {a === 'dados' ? 'Dados' : `Histórico (${logs.length})`}
            </button>
          ))}
        </div>

        <div className="p-4 md:p-6">
          <div className="max-w-lg flex flex-col gap-4">

            {aba === 'dados' && (
              <>
                <section className="bg-deep-ocean border border-ocean-depth rounded-2xl p-5 flex flex-col gap-4">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sea-foam font-semibold text-xs uppercase tracking-wider">Dados</h3>
                    {isDono && <span className="bg-electric-cyan/20 text-electric-cyan text-[10px] px-2 py-0.5 rounded-full font-medium uppercase">Dono</span>}
                  </div>
                  <Input label="Nome" value={nome} onChange={e => setNome(e.target.value)} />
                  <div><label className="text-xs text-steel uppercase tracking-wider">Email</label>
                    <p className="text-sea-foam text-sm mt-1 px-1">{colab.email}</p></div>
                </section>

                {!isDono && (
                  <>
                    <section className="bg-deep-ocean border border-ocean-depth rounded-2xl p-5">
                      <SeletorHorario dias={diasSemana} horaInicio={horaInicio} horaFim={horaFim} onChange={handleHorario} />
                    </section>

                    <section className="bg-deep-ocean border border-ocean-depth rounded-2xl p-5">
                      <SeletorPermissoes value={permissoes} onChange={setPermissoes} />
                    </section>
                  </>
                )}

                {msg && <p className={`text-sm text-center ${msg.includes('sucesso') ? 'text-mint-green' : 'text-red-400'}`}>{msg}</p>}

                <button onClick={handleSalvar} disabled={salvando}
                  className="min-h-[52px] bg-electric-cyan text-midnight rounded-2xl text-sm font-semibold disabled:opacity-40">
                  {salvando ? 'Salvando...' : 'Salvar Alterações'}
                </button>

                <section className="bg-deep-ocean border border-ocean-depth rounded-2xl p-5 flex flex-col gap-3">
                  <h3 className="text-sea-foam font-semibold text-xs uppercase tracking-wider">Redefinir Senha</h3>
                  <Input label="Nova senha" type="password" value={novaSenha} onChange={e => setNovaSenha(e.target.value)} placeholder="Mínimo 6 caracteres" />
                  {msgSenha && <p className={`text-xs ${msgSenha.includes('atualizada') ? 'text-mint-green' : 'text-red-400'}`}>{msgSenha}</p>}
                  <button onClick={handleRedefinirSenha} disabled={!novaSenha}
                    className="min-h-[48px] border border-ocean-depth text-sea-foam rounded-xl text-sm hover:border-teal-current transition-colors disabled:opacity-40">
                    Redefinir Senha
                  </button>
                </section>

                {!isDono && (
                  <button onClick={handleDesativar}
                    className="min-h-[48px] border border-red-500/30 text-red-400 rounded-2xl text-sm">
                    Desativar colaborador
                  </button>
                )}
              </>
            )}

            {aba === 'logs' && (
              <section className="bg-deep-ocean border border-ocean-depth rounded-2xl p-5">
                <h3 className="text-sea-foam font-semibold text-xs uppercase tracking-wider mb-3">
                  Histórico de acessos
                </h3>
                {logs.length === 0 ? (
                  <p className="text-steel text-sm text-center py-6">Nenhum acesso registrado</p>
                ) : (
                  <div className="flex flex-col gap-2">
                    {logs.map((l, i) => (
                      <div key={i} className="flex items-center justify-between bg-midnight rounded-xl px-4 py-3">
                        <div>
                          <p className={`text-sm font-medium ${l.tipo === 'login' ? 'text-mint-green' : 'text-steel'}`}>
                            {l.tipo === 'login' ? '▶ Login' : '◀ Logout'}
                          </p>
                          {l.ip && <p className="text-steel text-xs">IP: {l.ip}</p>}
                        </div>
                        <p className="text-steel text-xs">{new Date(l.criado_em).toLocaleString('pt-BR')}</p>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            )}

          </div>
        </div>
      </main>
    </>
  )
}
