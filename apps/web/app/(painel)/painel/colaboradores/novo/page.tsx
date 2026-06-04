'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { TopBar } from '@/components/layout/TopBar'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { colaboradoresApi } from '@/lib/api/colaboradores'
import { SeletorPermissoes } from '@/components/painel/SeletorPermissoes'
import { SeletorHorario } from '@/components/painel/SeletorHorario'

export default function NovoColaboradorPage() {
  const router = useRouter()
  const [nome,       setNome]       = useState('')
  const [email,      setEmail]      = useState('')
  const [senha,      setSenha]      = useState('')
  const [permissoes, setPermissoes] = useState<string[]>(['caixa'])
  const [diasSemana, setDiasSemana] = useState<number[] | null>(null)
  const [horaInicio, setHoraInicio] = useState('08:00')
  const [horaFim,    setHoraFim]    = useState('18:00')
  const [loading,    setLoading]    = useState(false)
  const [erro,       setErro]       = useState('')

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
        nome, email, senha, permissoes,
        dias_semana: diasSemana,
        hora_inicio: diasSemana ? horaInicio : null,
        hora_fim:    diasSemana ? horaFim    : null,
      })
      router.push(`/painel/colaboradores/${c.id}`)
    } catch (err: any) {
      setErro(err?.response?.data?.error ?? 'Erro ao salvar.')
    } finally { setLoading(false) }
  }

  return (
    <>
      <TopBar title="Novo Colaborador" />
      <main className="flex-1 overflow-y-auto p-4 md:p-6 pb-10">
        <form onSubmit={handleSalvar} className="max-w-lg flex flex-col gap-5">

          <section className="bg-deep-ocean border border-ocean-depth rounded-2xl p-5 flex flex-col gap-4">
            <h3 className="text-sea-foam font-semibold text-xs uppercase tracking-wider">Dados de acesso</h3>
            <Input label="Nome *" value={nome} onChange={e => setNome(e.target.value)} placeholder="Nome do colaborador" />
            <Input label="Email *" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="email@exemplo.com" />
            <Input label="Senha *" type="password" value={senha} onChange={e => setSenha(e.target.value)} placeholder="Mínimo 6 caracteres" />
          </section>

          <section className="bg-deep-ocean border border-ocean-depth rounded-2xl p-5">
            <SeletorHorario dias={diasSemana} horaInicio={horaInicio} horaFim={horaFim} onChange={handleHorario} />
          </section>

          <section className="bg-deep-ocean border border-ocean-depth rounded-2xl p-5">
            <SeletorPermissoes value={permissoes} onChange={setPermissoes} />
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
