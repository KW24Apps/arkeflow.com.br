'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { TopBar } from '@/components/layout/TopBar'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { clientesApi } from '@/lib/api/clientes'

export default function NovoClientePage() {
  const router = useRouter()
  const [nome,     setNome]     = useState('')
  const [telefone, setTelefone] = useState('')
  const [cpf,      setCpf]      = useState('')
  const [email,    setEmail]    = useState('')
  const [loading,  setLoading]  = useState(false)
  const [erro,     setErro]     = useState('')

  async function handleSalvar(e: React.FormEvent) {
    e.preventDefault()
    setErro('')
    if (!nome.trim()) { setErro('Nome é obrigatório.'); return }
    setLoading(true)
    try {
      const c = await clientesApi.create({ nome, telefone: telefone || undefined, cpf: cpf || undefined, email: email || undefined })
      router.push(`/painel/clientes/${c.id}`)
    } catch (err: any) {
      setErro(err?.response?.data?.error ?? 'Erro ao salvar.')
    } finally { setLoading(false) }
  }

  return (
    <>
      <TopBar title="Novo Cliente" />
      <main className="flex-1 overflow-y-auto p-4 md:p-6 pb-10">
        <form onSubmit={handleSalvar} className="max-w-lg flex flex-col gap-5">
          <section className="bg-deep-ocean border border-ocean-depth rounded-2xl p-5 flex flex-col gap-4">
            <Input label="Nome *" value={nome} onChange={e => setNome(e.target.value)} placeholder="Nome completo" />
            <Input label="Telefone" type="tel" value={telefone} onChange={e => setTelefone(e.target.value)} placeholder="(00) 00000-0000" />
            <Input label="CPF" value={cpf} onChange={e => setCpf(e.target.value)} placeholder="000.000.000-00" />
            <Input label="Email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="email@exemplo.com" />
          </section>

          {erro && <p className="text-red-400 text-sm text-center">{erro}</p>}

          <div className="flex gap-3">
            <button type="button" onClick={() => router.back()}
              className="flex-1 min-h-[52px] border border-ocean-depth text-steel rounded-2xl text-sm">
              Cancelar
            </button>
            <Button type="submit" loading={loading} className="flex-1 min-h-[52px] rounded-2xl">
              Salvar Cliente
            </Button>
          </div>
        </form>
      </main>
    </>
  )
}
