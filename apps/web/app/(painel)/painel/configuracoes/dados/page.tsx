'use client'

import { useEffect, useState } from 'react'
import { TopBar } from '@/components/layout/TopBar'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { ContatosForm, type Contato } from '@/components/painel/ContatosForm'
import { api } from '@/lib/api/client'

interface DadosLoja {
  id: string; nome: string; cnpj: string | null; telefone: string | null
  email: string | null; status: string; logo_url: string | null; link_loja: string | null
  cep: string | null; logradouro: string | null; numero: string | null
  complemento: string | null; bairro: string | null; cidade: string | null; estado: string | null
  contatos: Contato[]
}

export default function DadosEmpresaPage() {
  const [dados,    setDados]    = useState<DadosLoja | null>(null)
  const [loading,  setLoading]  = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [msg,      setMsg]      = useState('')

  // Campos editáveis
  const [cep,         setCep]         = useState('')
  const [logradouro,  setLogradouro]  = useState('')
  const [numero,      setNumero]      = useState('')
  const [complemento, setComplemento] = useState('')
  const [bairro,      setBairro]      = useState('')
  const [cidade,      setCidade]      = useState('')
  const [estado,      setEstado]      = useState('')
  const [linkLoja,    setLinkLoja]    = useState('')
  const [contatos,    setContatos]    = useState<Contato[]>([])

  useEffect(() => {
    api.get<DadosLoja>('/dados-loja').then(r => {
      const d = r.data
      setDados(d)
      setCep(d.cep ?? ''); setLogradouro(d.logradouro ?? ''); setNumero(d.numero ?? '')
      setComplemento(d.complemento ?? ''); setBairro(d.bairro ?? '')
      setCidade(d.cidade ?? ''); setEstado(d.estado ?? ''); setLinkLoja(d.link_loja ?? '')
      setContatos(d.contatos)
    }).finally(() => setLoading(false))
  }, [])

  async function handleSalvar() {
    setSalvando(true); setMsg('')
    try {
      await api.put('/dados-loja', { cep, logradouro, numero, complemento, bairro, cidade, estado, link_loja: linkLoja || null })
      setMsg('Dados salvos com sucesso.')
    } catch { setMsg('Erro ao salvar.') }
    finally { setSalvando(false) }
  }

  async function handleAddContato(c: Omit<Contato, 'id'>) {
    const { data } = await api.post<Contato>('/dados-loja/contatos', c)
    setContatos(prev => [...prev, data])
  }

  async function handleRemoveContato(id: string) {
    await api.delete(`/dados-loja/contatos/${id}`)
    setContatos(prev => prev.filter(c => c.id !== id))
  }

  if (loading) return <><TopBar title="Dados da Empresa" /><div className="flex justify-center py-16"><div className="w-8 h-8 border-2 border-electric-cyan border-t-transparent rounded-full animate-spin" /></div></>

  return (
    <>
      <TopBar title="Dados da Empresa" />
      <main className="flex-1 overflow-y-auto p-4 md:p-6 pb-10">
        <div className="max-w-lg flex flex-col gap-5">

          {/* Dados não editáveis */}
          <section className="bg-deep-ocean border border-ocean-depth rounded-2xl p-5 flex flex-col gap-3">
            <h3 className="text-sea-foam font-semibold text-xs uppercase tracking-wider">Identificação</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-steel text-xs uppercase tracking-wider mb-1">Nome da loja</p>
                <p className="text-sea-foam text-sm font-medium">{dados?.nome}</p>
              </div>
              <div>
                <p className="text-steel text-xs uppercase tracking-wider mb-1">CNPJ</p>
                <p className="text-steel text-sm">{dados?.cnpj ?? '—'}</p>
              </div>
            </div>
            <p className="text-steel text-xs">CNPJ e plano só podem ser alterados pelo suporte ARKEflow.</p>
          </section>

          {/* Endereço */}
          <section className="bg-deep-ocean border border-ocean-depth rounded-2xl p-5 flex flex-col gap-4">
            <h3 className="text-sea-foam font-semibold text-xs uppercase tracking-wider">Endereço</h3>
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2"><Input label="CEP" value={cep} onChange={e => setCep(e.target.value)} placeholder="00000-000" /></div>
              <Input label="Estado" value={estado} onChange={e => setEstado(e.target.value.toUpperCase())} placeholder="SP" />
            </div>
            <Input label="Logradouro" value={logradouro} onChange={e => setLogradouro(e.target.value)} placeholder="Rua, Av., etc." />
            <div className="grid grid-cols-3 gap-3">
              <Input label="Número" value={numero} onChange={e => setNumero(e.target.value)} />
              <div className="col-span-2"><Input label="Complemento" value={complemento} onChange={e => setComplemento(e.target.value)} placeholder="Sala, Loja..." /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input label="Bairro" value={bairro} onChange={e => setBairro(e.target.value)} />
              <Input label="Cidade" value={cidade} onChange={e => setCidade(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-steel uppercase tracking-wider">Link da loja (futuro)</label>
              <input value={linkLoja} onChange={e => setLinkLoja(e.target.value.toLowerCase().replace(/\s/g, ''))}
                placeholder="minha-loja (subdomínio futuro)"
                className="min-h-[48px] bg-midnight border border-ocean-depth rounded-xl px-4 text-sm text-sea-foam placeholder-steel outline-none focus:border-electric-cyan" />
              <p className="text-steel text-xs">Futuramente: minha-loja.arkeflow.com.br ou domínio próprio</p>
            </div>

            {msg && <p className={`text-sm text-center ${msg.includes('sucesso') ? 'text-mint-green' : 'text-red-400'}`}>{msg}</p>}
            <Button onClick={handleSalvar} loading={salvando} className="min-h-[52px] rounded-2xl w-full">
              Salvar Endereço
            </Button>
          </section>

          {/* Contatos */}
          <section className="bg-deep-ocean border border-ocean-depth rounded-2xl p-5">
            <h3 className="text-sea-foam font-semibold text-xs uppercase tracking-wider mb-4">Contatos</h3>
            <p className="text-steel text-xs mb-4">
              Organize os contatos da empresa por função. Útil para envio de notas, cobranças e comunicações comerciais.
            </p>
            <ContatosForm
              contatos={contatos}
              onAdd={handleAddContato}
              onRemove={handleRemoveContato}
            />
          </section>

        </div>
      </main>
    </>
  )
}
