'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { TopBar } from '@/components/layout/TopBar'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { colaboradoresApi } from '@/lib/api/colaboradores'
import { SeletorHorario } from '@/components/painel/SeletorHorario'
import { api } from '@/lib/api/client'

interface Modelo { id: string; nome: string; sistema: boolean }

export default function NovoColaboradorPage() {
  const router = useRouter()
  const [nome,     setNome]     = useState('')
  const [email,    setEmail]    = useState('')
  const [username, setUsername] = useState('')
  const [senha,    setSenha]    = useState('')
  const [modeloId,  setModeloId]  = useState('')
  const [modelos,   setModelos]   = useState<Modelo[]>([])
  const [diasSemana, setDiasSemana] = useState<number[] | null>(null)
  const [horaInicio, setHoraInicio] = useState('08:00')
  const [horaFim,    setHoraFim]    = useState('18:00')
  const [loading,    setLoading]    = useState(false)
  const [erro,       setErro]       = useState('')

  useEffect(() => {
    api.get<Modelo[]>('/modelos-permissao').then(r => {
      setModelos(r.data)
      // Pré-seleciona o modelo Administrador se for o único (não deve acontecer para vendedores)
    })
  }, [])

  function handleHorario(dias: number[] | null, inicio: string, fim: string) {
    setDiasSemana(dias); setHoraInicio(inicio); setHoraFim(fim)
  }

  async function handleSalvar(e: React.FormEvent) {
    e.preventDefault()
    setErro('')
    if (!nome || !email || !senha) { setErro('Preencha nome, email e senha.'); return }
    if (senha.length < 6) { setErro('Senha mínimo 6 caracteres.'); return }
    setLoading(true)
    try {
      const c = await colaboradoresApi.create({
        nome, email, username: username || undefined, senha,
        permissoes: [],               // permissões vêm do modelo
        modelo_permissao_id: modeloId || undefined,
        dias_semana: diasSemana,
        hora_inicio: diasSemana ? horaInicio : null,
        hora_fim:    diasSemana ? horaFim    : null,
      } as any)
      router.push(`/painel/colaboradores/${c.id}`)
    } catch (err: any) {
      setErro(err?.response?.data?.error ?? 'Erro ao salvar.')
    } finally { setLoading(false) }
  }

  return (
    <>
      <TopBar />
      <main className="flex-1 overflow-y-auto p-4 md:p-6 pb-10">
        <form onSubmit={handleSalvar} className="max-w-lg flex flex-col gap-5">

          <section className="bg-deep-ocean border border-ocean-depth rounded-2xl p-5 flex flex-col gap-4">
            <h3 className="text-sea-foam font-semibold text-xs uppercase tracking-wider">Dados de acesso</h3>
            <Input label="Nome *" value={nome} onChange={e => setNome(e.target.value)} placeholder="Nome do colaborador" />
            <Input label="Email *" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="email@exemplo.com" />
            <Input label="Usuário (opcional)" value={username} onChange={e => setUsername(e.target.value.toLowerCase())} placeholder="ex: joao.silva" />
            <p className="text-steel text-xs -mt-2">Letras minúsculas, números, ponto e _. Permite login sem digitar o email completo.</p>
            <Input label="Senha *" type="password" value={senha} onChange={e => setSenha(e.target.value)} placeholder="Mínimo 6 caracteres" />
          </section>

          <section className="bg-deep-ocean border border-ocean-depth rounded-2xl p-5">
            <SeletorHorario dias={diasSemana} horaInicio={horaInicio} horaFim={horaFim} onChange={handleHorario} />
          </section>

          <section className="bg-deep-ocean border border-ocean-depth rounded-2xl p-5 flex flex-col gap-3">
            <div>
              <label className="text-xs font-medium text-steel uppercase tracking-wider">Modelo de permissão</label>
              <p className="text-steel text-xs mt-0.5">Define quais menus este colaborador pode acessar</p>
            </div>
            {modelos.filter(m => !m.sistema).length === 0 ? (
              <p className="text-yellow-400 text-xs">
                Nenhum modelo criado ainda.{' '}
                <a href="/painel/colaboradores/permissoes" className="underline">Criar modelo</a>
              </p>
            ) : (
              <select value={modeloId} onChange={e => setModeloId(e.target.value)}
                className="min-h-[48px] bg-midnight border border-ocean-depth rounded-xl px-4 text-sm text-sea-foam outline-none focus:border-electric-cyan">
                <option value="">Sem modelo — sem acesso ao painel</option>
                {modelos.filter(m => !m.sistema).map(m => (
                  <option key={m.id} value={m.id}>{m.nome}</option>
                ))}
              </select>
            )}
          </section>

          {erro && <p className="text-red-400 text-sm text-center">{erro}</p>}

          <div className="flex gap-3">
            <button type="button" onClick={() => router.back()}
              className="flex-1 min-h-[52px] border border-ocean-depth text-steel rounded-2xl text-sm">
              Cancelar
            </button>
            <Button type="submit" loading={loading} className="flex-1 min-h-[52px] rounded-2xl">
              Criar Colaborador
            </Button>
          </div>
        </form>
      </main>
    </>
  )
}
