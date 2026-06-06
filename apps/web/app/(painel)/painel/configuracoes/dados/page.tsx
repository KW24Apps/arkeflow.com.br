'use client'

import { useEffect, useState } from 'react'
import { TopBar } from '@/components/layout/TopBar'
import { ContatosForm, type Contato } from '@/components/painel/ContatosForm'
import { api } from '@/lib/api/client'

interface DadosLoja {
  id: string; nome: string; cnpj: string | null; telefone: string | null
  email: string | null; status: string; logo_url: string | null; link_loja: string | null
  cep: string | null; logradouro: string | null; numero: string | null
  complemento: string | null; bairro: string | null; cidade: string | null; estado: string | null
  contatos: Contato[]
}

// ── Glass constants ───────────────────────────────────────────────────────────

const CARD: React.CSSProperties = {
  background: 'rgba(8,18,30,0.48)',
  backdropFilter: 'blur(8px)',
  border: '0.5px solid rgba(255,255,255,0.09)',
  borderRadius: '10px',
  padding: '16px',
}

const INPUT: React.CSSProperties = {
  background: 'rgba(8,18,30,0.5)',
  border: '0.5px solid rgba(255,255,255,0.12)',
  borderRadius: '8px',
  padding: '9px 12px',
  fontSize: '13px',
  color: 'rgba(255,255,255,0.75)',
  width: '100%',
  outline: 'none',
}

function Lbl({ children }: { children: React.ReactNode }) {
  return (
    <label style={{ display: 'block', fontSize: '9px', textTransform: 'uppercase' as const, letterSpacing: '0.1em', color: 'rgba(255,255,255,0.35)', marginBottom: '4px' }}>
      {children}
    </label>
  )
}

function fmtCEP(v: string) {
  const d = v.replace(/\D/g, '').slice(0, 8)
  return d.length > 5 ? `${d.slice(0,5)}-${d.slice(5)}` : d
}

function GInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      style={{ ...INPUT, ...props.style }}
      className="outline-none"
      onFocus={e => { e.currentTarget.style.borderColor = 'rgba(0,239,255,0.4)'; props.onFocus?.(e) }}
      onBlur={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'; props.onBlur?.(e) }}
    />
  )
}

export default function DadosEmpresaPage() {
  const [dados,    setDados]    = useState<DadosLoja | null>(null)
  const [loading,  setLoading]  = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [msg,      setMsg]      = useState('')

  const [buscandoCep, setBuscandoCep] = useState(false)
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

  async function buscarCep() {
    const raw = cep.replace(/\D/g, '')
    if (raw.length !== 8) return
    setBuscandoCep(true)
    try {
      const res  = await fetch(`https://viacep.com.br/ws/${raw}/json/`)
      const data = await res.json()
      if (!data.erro) {
        setLogradouro(data.logradouro || '')
        setBairro(data.bairro || '')
        setCidade(data.localidade || '')
        setEstado(data.uf || '')
      }
    } catch {}
    finally { setBuscandoCep(false) }
  }

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

  if (loading) return (
    <><TopBar /><div className="flex justify-center py-16"><div className="w-8 h-8 border-2 border-electric-cyan border-t-transparent rounded-full animate-spin" /></div></>
  )

  return (
    <>
      <TopBar />
      <main className="flex-1 overflow-y-auto p-4 md:p-5 pb-10">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-start">

          {/* ── LEFT: Identificação + Endereço ──────────────────────── */}
          <div className="flex flex-col gap-3">

            {/* Identificação */}
            <div style={CARD} className="flex flex-col gap-4">
              <p style={{ fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.3)' }}>Identificação</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Lbl>Nome da loja</Lbl>
                  <p style={{ fontSize: '13px', fontWeight: 500, color: 'rgba(255,255,255,0.75)' }}>{dados?.nome}</p>
                </div>
                <div>
                  <Lbl>CNPJ</Lbl>
                  <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.45)' }}>{dados?.cnpj ?? '—'}</p>
                </div>
              </div>
              <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.25)' }}>
                CNPJ e plano só podem ser alterados pelo suporte ARKEflow.
              </p>
            </div>

            {/* Endereço */}
            <div style={CARD} className="flex flex-col gap-4">
              <p style={{ fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.3)' }}>Endereço</p>

              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2 flex flex-col">
                  <Lbl>CEP</Lbl>
                  <div className="flex gap-2">
                    <GInput
                      value={cep}
                      onChange={e => setCep(fmtCEP(e.target.value))}
                      onBlur={() => buscarCep()}
                      placeholder="00000-000"
                      style={{ flex: 1 }}
                    />
                    <button onClick={buscarCep} disabled={buscandoCep}
                      style={{ background: 'rgba(0,239,255,0.15)', border: '0.5px solid rgba(0,239,255,0.3)', borderRadius: '8px', padding: '9px 14px', fontSize: '12px', color: '#0ef', flexShrink: 0 }}>
                      {buscandoCep ? '...' : 'Buscar'}
                    </button>
                  </div>
                </div>
                <div className="flex flex-col">
                  <Lbl>Estado</Lbl>
                  <GInput value={estado} onChange={e => setEstado(e.target.value.toUpperCase())} placeholder="SP" />
                </div>
              </div>

              <div className="flex flex-col">
                <Lbl>Logradouro</Lbl>
                <GInput value={logradouro} onChange={e => setLogradouro(e.target.value)} placeholder="Rua, Av., etc." />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="flex flex-col">
                  <Lbl>Número</Lbl>
                  <GInput value={numero} onChange={e => setNumero(e.target.value)} />
                </div>
                <div className="col-span-2 flex flex-col">
                  <Lbl>Complemento</Lbl>
                  <GInput value={complemento} onChange={e => setComplemento(e.target.value)} placeholder="Sala, Loja..." />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col">
                  <Lbl>Bairro</Lbl>
                  <GInput value={bairro} onChange={e => setBairro(e.target.value)} />
                </div>
                <div className="flex flex-col">
                  <Lbl>Cidade</Lbl>
                  <GInput value={cidade} onChange={e => setCidade(e.target.value)} />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <Lbl>Link da loja (futuro)</Lbl>
                <GInput
                  value={linkLoja}
                  onChange={e => setLinkLoja(e.target.value.toLowerCase().replace(/\s/g, ''))}
                  placeholder="minha-loja (subdomínio futuro)"
                />
                <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.25)', marginTop: '2px' }}>
                  Futuramente: minha-loja.arkeflow.com.br ou domínio próprio
                </p>
              </div>

              {msg && (
                <p style={{ fontSize: '12px', textAlign: 'center', color: msg.includes('sucesso') ? 'rgba(100,220,160,0.85)' : 'rgba(248,113,113,0.85)' }}>
                  {msg}
                </p>
              )}

              <button
                onClick={handleSalvar}
                disabled={salvando}
                className="w-full min-h-[44px] disabled:opacity-40 transition-opacity"
                style={{ background: 'rgba(0,239,255,0.85)', borderRadius: '8px', color: '#0a0a1a', fontSize: '13px', fontWeight: 600, border: 'none' }}
              >
                {salvando ? 'Salvando...' : 'Salvar Endereço'}
              </button>
            </div>

          </div>

          {/* ── RIGHT: Contatos ──────────────────────────────────────── */}
          <div style={CARD} className="flex flex-col gap-4">
            <p style={{ fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.3)' }}>Contatos</p>
            <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.25)' }}>
              Organize os contatos da empresa por função. Útil para envio de notas, cobranças e comunicações comerciais.
            </p>
            <ContatosForm
              contatos={contatos}
              onAdd={handleAddContato}
              onRemove={handleRemoveContato}
            />
          </div>

        </div>
      </main>
    </>
  )
}
