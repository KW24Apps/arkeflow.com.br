'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { TopBar } from '@/components/layout/TopBar'
import { fornecedoresApi, type Fornecedor } from '@/lib/api/fornecedores'
import { ConfirmModal } from '@/components/ui/ConfirmModal'

const CARD = {
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
  return <label style={{ display: 'block', fontSize: '9px', textTransform: 'uppercase' as const, letterSpacing: '0.1em', color: 'rgba(255,255,255,0.35)', marginBottom: '4px' }}>{children}</label>
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

function fmtCNPJ(v: string) {
  const d = v.replace(/\D/g, '').slice(0, 14)
  if (d.length <= 2)  return d
  if (d.length <= 5)  return `${d.slice(0,2)}.${d.slice(2)}`
  if (d.length <= 8)  return `${d.slice(0,2)}.${d.slice(2,5)}.${d.slice(5)}`
  if (d.length <= 12) return `${d.slice(0,2)}.${d.slice(2,5)}.${d.slice(5,8)}/${d.slice(8)}`
  return `${d.slice(0,2)}.${d.slice(2,5)}.${d.slice(5,8)}/${d.slice(8,12)}-${d.slice(12)}`
}

function fmtPhone(v: string) {
  const d = v.replace(/\D/g, '').slice(0, 11)
  if (!d) return ''
  if (d.length <= 2)  return `(${d}`
  if (d.length <= 6)  return `(${d.slice(0,2)}) ${d.slice(2)}`
  if (d.length <= 10) return `(${d.slice(0,2)}) ${d.slice(2,6)}-${d.slice(6)}`
  return `(${d.slice(0,2)}) ${d.slice(2,7)}-${d.slice(7)}`
}

function fmtCEP(v: string) {
  const d = v.replace(/\D/g, '').slice(0, 8)
  return d.length > 5 ? `${d.slice(0,5)}-${d.slice(5)}` : d
}

export default function FornecedorDetalhe() {
  const { id }  = useParams<{ id: string }>()
  const router  = useRouter()

  const [fornecedor,   setFornecedor]   = useState<Fornecedor | null>(null)
  const [loading,      setLoading]      = useState(true)
  const [salvando,     setSalvando]     = useState(false)
  const [modal, setModal] = useState<{ open: boolean; onConfirm: () => void }>({ open: false, onConfirm: () => {} })

  const [cnpj,         setCnpj]         = useState('')
  const [razaoSocial,  setRazaoSocial]  = useState('')
  const [nomeFantasia, setNomeFantasia] = useState('')
  const [email,        setEmail]        = useState('')
  const [telefones,    setTelefones]    = useState<string[]>([''])
  const [cep,          setCep]          = useState('')
  const [logradouro,   setLogradouro]   = useState('')
  const [numero,       setNumero]       = useState('')
  const [complemento,  setComplemento]  = useState('')
  const [bairro,       setBairro]       = useState('')
  const [cidade,       setCidade]       = useState('')
  const [estado,       setEstado]       = useState('')

  const [buscandoCnpj, setBuscandoCnpj] = useState(false)
  const [buscandoCep,  setBuscandoCep]  = useState(false)

  useEffect(() => {
    fornecedoresApi.get(id).then(f => {
      setFornecedor(f)
      setCnpj(f.cnpj ? fmtCNPJ(f.cnpj) : '')
      setRazaoSocial(f.razao_social)
      setNomeFantasia(f.nome_fantasia ?? '')
      setEmail(f.email ?? '')
      setTelefones(f.telefones?.length ? f.telefones : [''])
      setCep(f.cep ?? ''); setLogradouro(f.logradouro ?? ''); setNumero(f.numero ?? '')
      setComplemento(f.complemento ?? ''); setBairro(f.bairro ?? '')
      setCidade(f.cidade ?? ''); setEstado(f.estado ?? '')
    }).catch(() => setFornecedor(null)).finally(() => setLoading(false))
  }, [id])

  async function buscarCnpj() {
    const raw = cnpj.replace(/\D/g, '')
    if (raw.length !== 14) return
    setBuscandoCnpj(true)
    try {
      const res  = await fetch(`https://minhareceita.org/${raw}`)
      if (!res.ok) return
      const data = await res.json()
      setRazaoSocial(data.razao_social || razaoSocial)
      setNomeFantasia(data.nome_fantasia || nomeFantasia)
      if (data.email) setEmail(data.email)
      if (data.cep)   setCep(fmtCEP(data.cep.replace(/\D/g, '')))
      if (data.logradouro) setLogradouro(data.logradouro)
      if (data.numero)     setNumero(data.numero)
      if (data.complemento) setComplemento(data.complemento)
      if (data.bairro)     setBairro(data.bairro)
      if (data.municipio)  setCidade(data.municipio)
      if (data.uf)         setEstado(data.uf)
      const tel = data.ddd_telefone_1?.replace(/\D/g, '')
      if (tel) setTelefones([fmtPhone(tel)])
    } catch {}
    finally { setBuscandoCnpj(false) }
  }

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
    setSalvando(true)
    try {
      const f = await fornecedoresApi.update(id, {
        razao_social:  razaoSocial,
        nome_fantasia: nomeFantasia || null,
        cnpj:          cnpj.replace(/\D/g, '') || null,
        email:         email || null,
        telefones:     telefones.filter(t => t.trim()),
        cep:           cep || null,
        logradouro:    logradouro || null,
        numero:        numero || null,
        complemento:   complemento || null,
        bairro:        bairro || null,
        cidade:        cidade || null,
        estado:        estado || null,
      } as any)
      setFornecedor(f)
    } finally { setSalvando(false) }
  }

  async function handleRemover() {
    await fornecedoresApi.remove(id)
    router.push('/painel/fornecedores')
  }

  if (loading) return (
    <><TopBar /><div className="flex justify-center py-16"><div className="w-8 h-8 border-2 border-electric-cyan border-t-transparent rounded-full animate-spin" /></div></>
  )
  if (!fornecedor) return (
    <><TopBar /><p className="text-center py-16" style={{ color: 'rgba(255,255,255,0.4)' }}>Não encontrado.</p></>
  )

  return (
    <>
      <TopBar />
      <main className="flex-1 overflow-hidden flex flex-col">

        {/* Compact header */}
        <div className="shrink-0 flex items-center gap-3 px-4 py-2.5"
          style={{ background: 'rgba(8,18,30,0.5)', backdropFilter: 'blur(8px)', borderBottom: '0.5px solid rgba(255,255,255,0.08)' }}>
          <div className="flex items-center justify-center shrink-0"
            style={{ width: '38px', height: '38px', background: 'rgba(0,239,255,0.15)', border: '1px solid rgba(0,239,255,0.25)', borderRadius: '50%' }}>
            <span style={{ color: '#0ef', fontWeight: 700, fontSize: '15px' }}>{fornecedor.razao_social.charAt(0).toUpperCase()}</span>
          </div>
          <div className="flex-1 min-w-0">
            <p style={{ fontSize: '14px', fontWeight: 500, color: 'rgba(255,255,255,0.85)', lineHeight: 1.2 }}>
              {fornecedor.nome_fantasia || fornecedor.razao_social}
            </p>
            <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.35)', marginTop: '1px' }}>
              {fornecedor.cnpj ? fmtCNPJ(fornecedor.cnpj) : 'Sem CNPJ'}
              {(fornecedor.cidade || fornecedor.estado) && ` · ${[fornecedor.cidade, fornecedor.estado].filter(Boolean).join('/')}`}
            </p>
          </div>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto p-3">
          <div className="grid grid-cols-2 gap-3 items-start">

            {/* LEFT: Dados */}
            <div style={CARD} className="flex flex-col gap-3">
              <p style={{ fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.3)' }}>Dados</p>

              <div className="flex flex-col">
                <Lbl>CNPJ</Lbl>
                <div className="flex gap-2">
                  <GInput value={cnpj} onChange={e => setCnpj(fmtCNPJ(e.target.value))} onBlur={() => buscarCnpj()} placeholder="00.000.000/0000-00" style={{ flex: 1 }} />
                  <button type="button" onClick={buscarCnpj} disabled={buscandoCnpj}
                    style={{ background: 'rgba(0,239,255,0.15)', border: '0.5px solid rgba(0,239,255,0.3)', borderRadius: '8px', padding: '9px 14px', fontSize: '12px', color: '#0ef', flexShrink: 0 }}>
                    {buscandoCnpj ? '...' : 'Buscar'}
                  </button>
                </div>
              </div>

              <div className="flex flex-col">
                <Lbl>Razão Social *</Lbl>
                <GInput value={razaoSocial} onChange={e => setRazaoSocial(e.target.value)} placeholder="Nome jurídico da empresa" />
              </div>

              <div className="flex flex-col">
                <Lbl>Nome Fantasia</Lbl>
                <GInput value={nomeFantasia} onChange={e => setNomeFantasia(e.target.value)} placeholder="Nome comercial" />
              </div>

              <div className="flex flex-col">
                <Lbl>Email</Lbl>
                <GInput type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="email@fornecedor.com" />
              </div>

              <div className="flex flex-col gap-2">
                <Lbl>Telefones</Lbl>
                {telefones.map((t, i) => (
                  <div key={i} className="flex gap-2">
                    <GInput
                      value={t}
                      onChange={e => {
                        const v = fmtPhone(e.target.value)
                        setTelefones(prev => prev.map((x, xi) => xi === i ? v : x))
                      }}
                      placeholder="(00) 00000-0000"
                      style={{ flex: 1 }}
                    />
                    {telefones.length > 1 && (
                      <button type="button" onClick={() => setTelefones(prev => prev.filter((_, xi) => xi !== i))}
                        style={{ color: 'rgba(255,255,255,0.3)', fontSize: '18px', width: '32px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
                    )}
                  </div>
                ))}
                <button type="button" onClick={() => setTelefones(prev => [...prev, ''])}
                  style={{ fontSize: '11px', color: 'rgba(0,239,255,0.6)', textAlign: 'left', background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}>
                  + Adicionar telefone
                </button>
              </div>
            </div>

            {/* RIGHT: Endereço */}
            <div style={CARD} className="flex flex-col gap-3">
              <p style={{ fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.3)' }}>Endereço</p>

              <div className="flex gap-2">
                <GInput value={cep} onChange={e => setCep(fmtCEP(e.target.value))} onBlur={() => buscarCep()} placeholder="00000-000" style={{ flex: 1 }} />
                <button type="button" onClick={buscarCep} disabled={buscandoCep}
                  style={{ background: 'rgba(0,239,255,0.15)', border: '0.5px solid rgba(0,239,255,0.3)', borderRadius: '8px', padding: '9px 14px', fontSize: '12px', color: '#0ef', flexShrink: 0 }}>
                  {buscandoCep ? '...' : 'Buscar'}
                </button>
              </div>

              <GInput value={logradouro} onChange={e => setLogradouro(e.target.value)} placeholder="Logradouro" />
              <div className="grid grid-cols-2 gap-2">
                <GInput value={numero}      onChange={e => setNumero(e.target.value)}      placeholder="Número" />
                <GInput value={complemento} onChange={e => setComplemento(e.target.value)} placeholder="Complemento" />
              </div>
              <GInput value={bairro} onChange={e => setBairro(e.target.value)} placeholder="Bairro" />
              <div className="grid grid-cols-2 gap-2">
                <GInput value={cidade} onChange={e => setCidade(e.target.value)} placeholder="Cidade" />
                <GInput value={estado} onChange={e => setEstado(e.target.value)} placeholder="Estado (UF)" />
              </div>
            </div>

          </div>
        </div>

        {/* Fixed footer */}
        <div className="shrink-0 flex gap-3 px-4 py-3"
          style={{ background: 'rgba(8,18,30,0.65)', backdropFilter: 'blur(8px)', borderTop: '0.5px solid rgba(255,255,255,0.07)' }}>
          <button
            onClick={() => setModal({ open: true, onConfirm: handleRemover })}
            className="flex-1 min-h-[44px]"
            style={{ background: 'rgba(240,100,100,0.08)', border: '0.5px solid rgba(240,100,100,0.25)', borderRadius: '8px', color: 'rgba(240,100,100,0.7)', fontSize: '13px' }}>
            Remover fornecedor
          </button>
          <button
            onClick={handleSalvar}
            disabled={salvando}
            className="flex-[2] min-h-[44px] disabled:opacity-40 transition-opacity"
            style={{ background: 'rgba(0,239,255,0.85)', borderRadius: '8px', color: '#0a0a1a', fontSize: '13px', fontWeight: 600, border: 'none' }}>
            {salvando ? 'Salvando...' : 'Salvar alterações'}
          </button>
        </div>

      </main>

      <ConfirmModal
        isOpen={modal.open}
        title="Remover fornecedor"
        message="Esta ação não pode ser desfeita."
        confirmLabel="Remover"
        confirmStyle="danger"
        onConfirm={() => { setModal(m => ({ ...m, open: false })); modal.onConfirm() }}
        onCancel={() => setModal(m => ({ ...m, open: false }))}
      />
    </>
  )
}
