'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { TopBar } from '@/components/layout/TopBar'
import { ConfirmModal } from '@/components/ui/ConfirmModal'
import { clientesApi, type Cliente, type VendaHistorico } from '@/lib/api/clientes'
import { cashbackApi, type RegraCashback } from '@/lib/api/cashback'
import { catalogosApi, type ItemCatalogo } from '@/lib/api/catalogos'
import { api } from '@/lib/api/client'

type Aba = 'main' | 'compras'

// ── Formatters ────────────────────────────────────────────────────────────────

function fmtCPF(v: string) {
  const d = v.replace(/\D/g, '').slice(0, 11)
  if (d.length <= 3) return d
  if (d.length <= 6) return `${d.slice(0,3)}.${d.slice(3)}`
  if (d.length <= 9) return `${d.slice(0,3)}.${d.slice(3,6)}.${d.slice(6)}`
  return `${d.slice(0,3)}.${d.slice(3,6)}.${d.slice(6,9)}-${d.slice(9)}`
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
  if (d.length === 0) return ''
  if (d.length <= 2)  return `(${d}`
  if (d.length <= 6)  return `(${d.slice(0,2)}) ${d.slice(2)}`
  if (d.length <= 10) return `(${d.slice(0,2)}) ${d.slice(2,6)}-${d.slice(6)}`
  return `(${d.slice(0,2)}) ${d.slice(2,7)}-${d.slice(7)}`
}

function validateCPF(cpf: string): boolean {
  const d = cpf.replace(/\D/g, '')
  if (d.length !== 11 || /^(\d)\1+$/.test(d)) return false
  let s = 0
  for (let i = 0; i < 9; i++) s += +d[i] * (10 - i)
  let r = (s * 10) % 11; if (r >= 10) r = 0
  if (r !== +d[9]) return false
  s = 0
  for (let i = 0; i < 10; i++) s += +d[i] * (11 - i)
  r = (s * 10) % 11; if (r >= 10) r = 0
  return r === +d[10]
}

function fmtCEP(v: string) {
  const d = v.replace(/\D/g, '').slice(0, 8)
  return d.length > 5 ? d.replace(/(\d{5})(\d{0,3})/, '$1-$2') : d
}

// ── Glass constants ───────────────────────────────────────────────────────────

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

function GInput(props: React.InputHTMLAttributes<HTMLInputElement> & { borderColor?: string }) {
  const { borderColor, ...rest } = props
  return (
    <input
      {...rest}
      style={{ ...INPUT, ...rest.style, border: borderColor ? `0.5px solid ${borderColor}` : INPUT.border as string }}
      className="outline-none"
      onFocus={e => { e.currentTarget.style.borderColor = 'rgba(0,239,255,0.4)'; rest.onFocus?.(e) }}
      onBlur={e => { e.currentTarget.style.borderColor = borderColor ?? 'rgba(255,255,255,0.12)'; rest.onBlur?.(e) }}
    />
  )
}

function GSelect(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      style={{ ...INPUT, ...props.style }}
      className="outline-none"
      onFocus={e => (e.currentTarget.style.borderColor = 'rgba(0,239,255,0.4)')}
      onBlur={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)')}
    />
  )
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function ClienteDetalhe() {
  const { id }  = useParams<{ id: string }>()
  const router  = useRouter()
  const [aba, setAba] = useState<Aba>('main')

  const [cliente,   setCliente]   = useState<Cliente | null>(null)
  const [historico, setHistorico] = useState<VendaHistorico[]>([])
  const [regras,    setRegras]    = useState<RegraCashback[]>([])
  const [loading,   setLoading]   = useState(true)
  const [salvando,     setSalvando]     = useState(false)
  const [salvoFeedback, setSalvoFeedback] = useState(false)
  const [modal, setModal] = useState<{ open: boolean; title: string; message: string; onConfirm: () => void }>({ open: false, title: '', message: '', onConfirm: () => {} })

  // Core fields
  const [tipoPessoa,      setTipoPessoa]      = useState<'fisica' | 'juridica'>('fisica')
  const [nome,            setNome]            = useState('')
  const [cpf,             setCpf]             = useState('')
  const [cpfValidity,     setCpfValidity]     = useState<null | 'valid' | 'invalid'>(null)
  const [telefones,       setTelefones]       = useState<string[]>([''])
  const [emails,          setEmails]          = useState<string[]>([''])
  const [emailErrors,     setEmailErrors]     = useState<Record<number,boolean>>({})
  const [regraCashbackId, setRegraCashbackId] = useState('')

  // Address
  const [cep,         setCep]         = useState('')
  const [logradouro,  setLogradouro]  = useState('')
  const [numero,      setNumero]      = useState('')
  const [complemento, setComplemento] = useState('')
  const [bairro,      setBairro]      = useState('')
  const [cidade,      setCidade]      = useState('')
  const [estado,      setEstado]      = useState('')
  const [buscandoCep,  setBuscandoCep]  = useState(false)
  const [buscandoCnpj, setBuscandoCnpj] = useState(false)

  // Credit
  const [creditoLiberado, setCreditoLiberado] = useState(false)
  const [limiteCredito,   setLimiteCredito]   = useState('')
  const [creditoSaldo,    setCreditoSaldo]    = useState({ ocupado: 0, disponivel: 0 })

  // Medidas
  const [medidasDisponiveis, setMedidasDisponiveis] = useState<ItemCatalogo[]>([])
  const [medidasCliente,     setMedidasCliente]     = useState<Record<string,string>>({})
  const [addingMedida,       setAddingMedida]       = useState(false)
  const [novaMedNome,        setNovaMedNome]        = useState('')
  const [novaMedValor,       setNovaMedValor]       = useState('')
  const [salvandoMed,        setSalvandoMed]        = useState(false)

  useEffect(() => {
    Promise.all([
      clientesApi.get(id),
      clientesApi.historico(id),
      cashbackApi.list(),
      catalogosApi.list('medidas'),
      api.get(`/clientes/${id}/contatos`).then(r => r.data).catch(() => []),
      clientesApi.getCredito(id).catch(() => ({ ocupado: 0, disponivel: 0 })),
    ]).then(([c, h, rs, meds, , saldo]) => {
      setCliente(c); setHistorico(h); setRegras(rs)
      setMedidasDisponiveis(meds)
      setMedidasCliente((c as any).medidas_json ?? {})

      setNome(c.nome)
      setTipoPessoa((c as any).tipo_pessoa ?? 'fisica')
      setCpf(c.cpf ?? '')
      setRegraCashbackId(c.regra_cashback_id ?? '')

      // Phones — back-compat: single telefone → array
      const storedPhones = (c as any).telefones ?? (c.telefone ? [c.telefone] : [''])
      setTelefones(storedPhones.length > 0 ? storedPhones : [''])

      // Emails — back-compat: single email → array
      const storedEmails = (c as any).emails ?? (c.email ? [c.email] : [''])
      setEmails(storedEmails.length > 0 ? storedEmails : [''])

      // Address
      setCep((c as any).cep ?? '')
      setLogradouro((c as any).logradouro ?? '')
      setNumero((c as any).numero ?? '')
      setComplemento((c as any).complemento ?? '')
      setBairro((c as any).bairro ?? '')
      setCidade((c as any).cidade ?? '')
      setEstado((c as any).estado ?? '')
      setCreditoLiberado((c as any).credito_liberado ?? false)
      setLimiteCredito(((c as any).limite_credito ?? 0) > 0 ? String((c as any).limite_credito) : '')
      setCreditoSaldo({ ocupado: Number((saldo as any).ocupado ?? 0), disponivel: Number((saldo as any).disponivel ?? 0) })
    })
    .catch(() => setCliente(null))
    .finally(() => setLoading(false))
  }, [id])

  async function buscarCnpj() {
    const raw = cpf.replace(/\D/g, '')
    if (raw.length !== 14) return
    setBuscandoCnpj(true)
    try {
      const res  = await fetch(`https://minhareceita.org/${raw}`)
      if (!res.ok) return
      const data = await res.json()
      if (data.razao_social) setNome(data.razao_social)
      if (data.email) setEmails([data.email])
      const tel = data.ddd_telefone_1?.replace(/\D/g, '')
      if (tel) setTelefones([fmtPhone(tel)])
      if (data.cep) setCep(fmtCEP(data.cep.replace(/\D/g, '')))
      if (data.logradouro) setLogradouro(data.logradouro)
      if (data.numero)     setNumero(data.numero)
      if (data.complemento) setComplemento(data.complemento)
      if (data.bairro)     setBairro(data.bairro)
      if (data.municipio)  setCidade(data.municipio)
      if (data.uf)         setEstado(data.uf)
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

  async function handleSalvar(goToList = false) {
    if (creditoLiberado && (!cpf || !logradouro || !numero || !bairro || !cidade || !estado)) {
      alert('Para liberar crédito, preencha CPF e endereço completo (logradouro, número, bairro, cidade, estado).')
      return
    }
    setSalvando(true)
    try {
      const c = await clientesApi.update(id, {
        nome,
        tipo_pessoa:       tipoPessoa,
        cpf:               cpf || undefined,
        telefone:          telefones[0]?.trim() || undefined,
        telefones:         telefones.filter(t => t.trim()),
        email:             emails[0]?.trim() || undefined,
        emails:            emails.filter(e => e.trim()),
        regra_cashback_id: regraCashbackId || null,
        cep:               cep || undefined,
        logradouro:        logradouro || undefined,
        numero:            numero || undefined,
        complemento:       complemento || undefined,
        bairro:            bairro || undefined,
        cidade:            cidade || undefined,
        estado:            estado || undefined,
        credito_liberado:  creditoLiberado,
        limite_credito:    creditoLiberado ? (parseFloat(limiteCredito) || 0) : 0,
      } as any)
      setCliente(c)
      if (goToList) {
        router.push('/painel/clientes')
      } else {
        setSalvoFeedback(true)
        setTimeout(() => setSalvoFeedback(false), 2000)
      }
    } finally { setSalvando(false) }
  }

  async function handleDelete() {
    await clientesApi.remove(id)
    router.push('/painel/clientes')
  }

  async function handleSalvarMedida() {
    if (!novaMedNome || !novaMedValor) return
    setSalvandoMed(true)
    try {
      const novas = { ...medidasCliente, [novaMedNome]: novaMedValor }
      await clientesApi.update(id, { medidas_json: novas } as any)
      setMedidasCliente(novas)
      setAddingMedida(false); setNovaMedNome(''); setNovaMedValor('')
    } finally { setSalvandoMed(false) }
  }

  async function handleRemoverMedida(chave: string) {
    const novas = { ...medidasCliente }
    delete novas[chave]
    await clientesApi.update(id, { medidas_json: novas } as any)
    setMedidasCliente(novas)
  }

  // ── Loading / null ─────────────────────────────────────────────────────────
  if (loading) return (
    <><TopBar /><div className="flex justify-center py-16"><div className="w-8 h-8 border-2 border-electric-cyan border-t-transparent rounded-full animate-spin" /></div></>
  )
  if (!cliente) return (
    <><TopBar /><p className="text-center py-16" style={{ color: 'rgba(255,255,255,0.4)' }}>Não encontrado.</p></>
  )

  const totalGasto = historico.reduce((s, v) => s + Number(v.total), 0)

  return (
    <>
      <TopBar />
      <main className="flex-1 overflow-hidden flex flex-col">

        {/* ── Compact header ─────────────────────────────────────────────── */}
        <div
          className="shrink-0 flex items-center gap-3 px-4 py-2.5"
          style={{ background: 'rgba(8,18,30,0.5)', backdropFilter: 'blur(8px)', borderBottom: '0.5px solid rgba(255,255,255,0.08)' }}
        >
          {/* Avatar */}
          <div className="flex items-center justify-center shrink-0"
            style={{ width: '38px', height: '38px', background: 'rgba(0,239,255,0.15)', border: '1px solid rgba(0,239,255,0.25)', borderRadius: '50%' }}>
            <span style={{ color: '#0ef', fontWeight: 700, fontSize: '15px' }}>{cliente.nome.charAt(0).toUpperCase()}</span>
          </div>

          {/* Name + badge + contacts */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p style={{ fontSize: '14px', fontWeight: 500, color: 'rgba(255,255,255,0.85)', lineHeight: 1.2 }}>{cliente.nome}</p>
              {Number(cliente.saldo_cashback) > 0 && (
                <span style={{ fontSize: '10px', color: 'rgba(100,220,160,0.8)', background: 'rgba(100,220,160,0.08)', borderRadius: '9999px', padding: '1px 7px' }}>
                  R$ {Number(cliente.saldo_cashback).toFixed(2)} cashback
                </span>
              )}
            </div>
            <div className="flex gap-2 mt-0.5">
              {cliente.telefone && <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.35)' }}>{cliente.telefone}</span>}
              {cliente.email    && <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.35)' }}>{cliente.email}</span>}
            </div>
          </div>

          {/* KPIs + tab bar — always visible */}
          <div className="shrink-0 flex items-center gap-2">
            <div style={{ background: 'rgba(255,255,255,0.04)', border: '0.5px solid rgba(255,255,255,0.08)', borderRadius: '8px', padding: '3px 10px', textAlign: 'right' }}>
              <p style={{ fontSize: '8px', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(255,255,255,0.3)' }}>Total gasto</p>
              <p style={{ fontSize: '12px', fontWeight: 600, color: 'rgba(255,255,255,0.75)', marginTop: '1px' }}>R$ {totalGasto.toFixed(0)}</p>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.04)', border: '0.5px solid rgba(255,255,255,0.08)', borderRadius: '8px', padding: '3px 10px', textAlign: 'right' }}>
              <p style={{ fontSize: '8px', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(255,255,255,0.3)' }}>Cashback</p>
              <p style={{ fontSize: '12px', fontWeight: 600, color: 'rgba(255,255,255,0.75)', marginTop: '1px' }}>R$ {Number(cliente.saldo_cashback).toFixed(2)}</p>
            </div>
            <div style={{ background: 'rgba(8,18,30,0.4)', borderRadius: '8px', padding: '3px' }} className="flex">
              <button onClick={() => setAba('main')}
                style={{ padding: '6px 12px', borderRadius: '6px', fontSize: '11px', fontWeight: 500, border: 'none', cursor: aba === 'main' ? 'default' : 'pointer', transition: 'background 0.15s, color 0.15s',
                  background: aba === 'main' ? 'rgba(0,239,255,0.15)' : 'transparent',
                  color:      aba === 'main' ? '#0ef' : 'rgba(255,255,255,0.4)',
                }}>
                Dados
              </button>
              <button onClick={() => setAba('compras')}
                style={{ padding: '6px 12px', borderRadius: '6px', fontSize: '11px', fontWeight: 500, border: 'none', cursor: aba === 'compras' ? 'default' : 'pointer', transition: 'background 0.15s, color 0.15s', whiteSpace: 'nowrap',
                  background: aba === 'compras' ? 'rgba(0,239,255,0.15)' : 'transparent',
                  color:      aba === 'compras' ? '#0ef' : 'rgba(255,255,255,0.4)',
                }}>
                Compras ({historico.length})
              </button>
            </div>
          </div>
        </div>

        {/* ── Scrollable content ─────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto p-3">

          {/* ══════════════════════════════════════════════════════════════ */}
          {/* MAIN VIEW                                                     */}
          {/* ══════════════════════════════════════════════════════════════ */}
          {aba === 'main' && (
            <div className="grid grid-cols-2 gap-3 items-start">

              {/* ── LEFT column ──────────────────────────────────────── */}
              <div className="flex flex-col gap-2">

                {/* Dados pessoais card */}
                <div style={CARD} className="flex flex-col gap-3">
                  <p style={{ fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.3)' }}>Dados Pessoais</p>

                  {/* PF/PJ toggle */}
                  <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: '8px', padding: '3px' }} className="flex gap-1">
                    {(['fisica', 'juridica'] as const).map(tp => (
                      <button key={tp} onClick={() => { setTipoPessoa(tp); setCpfValidity(null) }}
                        style={{
                          flex: 1, padding: '6px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: 500, border: 'none',
                          background: tipoPessoa === tp ? 'rgba(0,239,255,0.15)' : 'transparent',
                          color:      tipoPessoa === tp ? '#0ef' : 'rgba(255,255,255,0.4)',
                          transition: 'background 0.15s, color 0.15s',
                        }}
                      >
                        {tp === 'fisica' ? 'Pessoa Física' : 'Pessoa Jurídica'}
                      </button>
                    ))}
                  </div>

                  {/* Nome */}
                  <div className="flex flex-col">
                    <Lbl>{tipoPessoa === 'juridica' ? 'Razão Social' : 'Nome'}</Lbl>
                    <GInput value={nome} onChange={e => setNome(e.target.value)}
                      onBlur={() => setNome(n => n.replace(/\b\w/g, c => c.toUpperCase()))}
                      placeholder={tipoPessoa === 'juridica' ? 'Razão social da empresa' : 'Nome completo'} />
                  </div>

                  {/* CPF/CNPJ + Cashback */}
                  <div className={regras.length > 0 ? 'grid grid-cols-2 gap-2' : ''}>
                    <div className="flex flex-col">
                      <Lbl>{tipoPessoa === 'juridica' ? 'CNPJ' : 'CPF'}</Lbl>
                      <div className="flex gap-2">
                        <GInput
                          value={cpf}
                          onChange={e => {
                            setCpfValidity(null)
                            setCpf(tipoPessoa === 'juridica' ? fmtCNPJ(e.target.value) : fmtCPF(e.target.value))
                          }}
                          onBlur={() => {
                            if (tipoPessoa === 'fisica' && cpf.replace(/\D/g, '').length === 11) {
                              setCpfValidity(validateCPF(cpf) ? 'valid' : 'invalid')
                            }
                            if (tipoPessoa === 'juridica') buscarCnpj()
                          }}
                          borderColor={
                            cpfValidity === 'invalid' ? 'rgba(240,100,100,0.5)' :
                            cpfValidity === 'valid'   ? 'rgba(100,220,160,0.4)' :
                            undefined
                          }
                          placeholder={tipoPessoa === 'juridica' ? '00.000.000/0000-00' : '000.000.000-00'}
                          style={{ flex: 1 }}
                        />
                        {tipoPessoa === 'juridica' && (
                          <button type="button" onClick={buscarCnpj} disabled={buscandoCnpj}
                            style={{ background: 'rgba(0,239,255,0.15)', border: '0.5px solid rgba(0,239,255,0.3)', borderRadius: '8px', padding: '9px 10px', fontSize: '11px', color: '#0ef', flexShrink: 0 }}>
                            {buscandoCnpj ? '...' : 'Buscar'}
                          </button>
                        )}
                      </div>
                      {cpfValidity === 'invalid' && tipoPessoa === 'fisica' && (
                        <p style={{ fontSize: '10px', color: 'rgba(240,100,100,0.7)', marginTop: '3px' }}>CPF inválido</p>
                      )}
                    </div>
                    {regras.length > 0 && (
                      <div className="flex flex-col">
                        <Lbl>Cashback</Lbl>
                        <GSelect value={regraCashbackId} onChange={e => setRegraCashbackId(e.target.value)}>
                          <option value="">Sem cashback</option>
                          {regras.map(r => (
                            <option key={r.id} value={r.id}>{r.nome} — {Number(r.percentual).toFixed(1)}%</option>
                          ))}
                        </GSelect>
                      </div>
                    )}
                  </div>

                  {/* Telefones */}
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
                          <button onClick={() => setTelefones(prev => prev.filter((_, xi) => xi !== i))}
                            style={{ color: 'rgba(255,255,255,0.3)', fontSize: '18px', width: '32px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
                        )}
                      </div>
                    ))}
                    <button onClick={() => setTelefones(prev => [...prev, ''])}
                      style={{ fontSize: '11px', color: 'rgba(0,239,255,0.6)', textAlign: 'left', background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}>
                      + Adicionar telefone
                    </button>
                  </div>

                  {/* Emails */}
                  <div className="flex flex-col gap-2">
                    <Lbl>Emails</Lbl>
                    {emails.map((e, i) => (
                      <div key={i} className="flex gap-2">
                        <GInput
                          type="email"
                          value={e}
                          onChange={ev => setEmails(prev => prev.map((x, xi) => xi === i ? ev.target.value : x))}
                          onBlur={ev => setEmailErrors(prev => ({ ...prev, [i]: !!ev.target.value && !ev.target.value.includes('@') }))}
                          borderColor={emailErrors[i] ? 'rgba(248,113,113,0.5)' : undefined}
                          placeholder="email@exemplo.com"
                          style={{ flex: 1 }}
                        />
                        {emails.length > 1 && (
                          <button onClick={() => { setEmails(prev => prev.filter((_, xi) => xi !== i)); setEmailErrors(prev => { const n = { ...prev }; delete n[i]; return n }) }}
                            style={{ color: 'rgba(255,255,255,0.3)', fontSize: '18px', width: '32px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
                        )}
                      </div>
                    ))}
                    <button onClick={() => setEmails(prev => [...prev, ''])}
                      style={{ fontSize: '11px', color: 'rgba(0,239,255,0.6)', textAlign: 'left', background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}>
                      + Adicionar email
                    </button>
                  </div>
                </div>

                {/* Medidas card */}
                <div style={CARD} className="flex flex-col gap-3">
                  <div>
                    <p style={{ fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.3)' }}>Medidas Corporais</p>
                    <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.25)', marginTop: '3px' }}>Usado para filtrar produtos que se encaixam no cliente</p>
                  </div>

                  {Object.entries(medidasCliente).map(([chave, valor]) => (
                    <div key={chave} className="flex items-center justify-between" style={{ background: 'rgba(255,255,255,0.03)', border: '0.5px solid rgba(255,255,255,0.07)', borderRadius: '8px', padding: '10px 12px' }}>
                      <div>
                        <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase' }}>{chave}</p>
                        <p style={{ fontSize: '14px', fontWeight: 500, color: 'rgba(255,255,255,0.8)', marginTop: '2px' }}>{valor}</p>
                      </div>
                      <button onClick={() => handleRemoverMedida(chave)}
                        style={{ color: 'rgba(255,255,255,0.3)', fontSize: '18px', padding: '4px 8px', background: 'none', border: 'none', cursor: 'pointer' }}
                        onMouseEnter={e => (e.currentTarget.style.color = 'rgba(248,113,113,0.8)')}
                        onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.3)')}>×</button>
                    </div>
                  ))}

                  {addingMedida ? (
                    <div style={{ background: 'rgba(255,255,255,0.03)', border: '0.5px solid rgba(255,255,255,0.07)', borderRadius: '8px', padding: '12px' }} className="flex flex-col gap-3">
                      <GSelect value={novaMedNome} onChange={e => setNovaMedNome(e.target.value)}>
                        <option value="">Selecione a medida...</option>
                        {medidasDisponiveis.filter(m => !(m.nome in medidasCliente)).map(m => (
                          <option key={m.id} value={m.nome}>{m.nome}</option>
                        ))}
                      </GSelect>
                      <div className="flex gap-2">
                        <GInput value={novaMedValor} onChange={e => setNovaMedValor(e.target.value)} placeholder="Ex: 96cm" style={{ flex: 1 }} />
                        <button onClick={handleSalvarMedida} disabled={salvandoMed || !novaMedNome || !novaMedValor}
                          style={{ background: 'rgba(0,239,255,0.85)', border: 'none', borderRadius: '8px', padding: '9px 16px', fontSize: '13px', fontWeight: 600, color: '#0a0a1a', cursor: 'pointer', opacity: salvandoMed || !novaMedNome || !novaMedValor ? 0.4 : 1 }}>
                          {salvandoMed ? '...' : 'OK'}
                        </button>
                        <button onClick={() => { setAddingMedida(false); setNovaMedNome(''); setNovaMedValor('') }}
                          style={{ color: 'rgba(255,255,255,0.3)', fontSize: '18px', padding: '4px 8px', background: 'none', border: 'none', cursor: 'pointer' }}>×</button>
                      </div>
                    </div>
                  ) : (
                    medidasDisponiveis.some(m => !(m.nome in medidasCliente)) && (
                      <button onClick={() => setAddingMedida(true)}
                        style={{ fontSize: '11px', color: 'rgba(0,239,255,0.6)', textAlign: 'left', background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}>
                        + Adicionar medida
                      </button>
                    )
                  )}

                  {Object.keys(medidasCliente).length === 0 && !addingMedida && (
                    <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.25)', textAlign: 'center', padding: '16px 0' }}>Nenhuma medida cadastrada</p>
                  )}
                </div>

              </div>

              {/* ── RIGHT column ──────────────────────────────────────── */}
              <div className="flex flex-col gap-2">

                {/* Endereço card */}
                <div style={CARD} className="flex flex-col gap-3">
                  <p style={{ fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.3)' }}>Endereço</p>

                  {/* CEP + Buscar */}
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

                  {/* Logradouro */}
                  <GInput value={logradouro} onChange={e => setLogradouro(e.target.value)} placeholder="Logradouro" />

                  {/* Número + Complemento */}
                  <div className="grid grid-cols-2 gap-2">
                    <GInput value={numero}      onChange={e => setNumero(e.target.value)}      placeholder="Número" />
                    <GInput value={complemento} onChange={e => setComplemento(e.target.value)} placeholder="Complemento" />
                  </div>

                  {/* Bairro */}
                  <GInput value={bairro} onChange={e => setBairro(e.target.value)} placeholder="Bairro" />

                  {/* Cidade + Estado */}
                  <div className="grid grid-cols-2 gap-2">
                    <GInput value={cidade} onChange={e => setCidade(e.target.value)} placeholder="Cidade" />
                    <GInput value={estado} onChange={e => setEstado(e.target.value)} placeholder="Estado (UF)" />
                  </div>
                </div>

                {/* Crédito card */}
                <div style={CARD} className="flex flex-col gap-3">
                  <p style={{ fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.3)' }}>Crédito</p>

                  {/* Toggle */}
                  <div className="flex items-center justify-between">
                    <div>
                      <p style={{ fontSize: '13px', fontWeight: 500, color: 'rgba(255,255,255,0.75)' }}>Crédito liberado</p>
                      <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', marginTop: '2px' }}>Exige CPF e endereço completos para liberar.</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setCreditoLiberado(v => !v)}
                      style={{ width: '40px', height: '22px', borderRadius: '9999px', border: 'none', flexShrink: 0, position: 'relative', cursor: 'pointer', transition: 'background 0.15s',
                        background: creditoLiberado ? 'rgba(0,212,212,0.7)' : 'rgba(255,255,255,0.1)' }}
                    >
                      <span style={{ position: 'absolute', top: '3px', width: '16px', height: '16px', background: '#fff', borderRadius: '50%', transition: 'left 0.15s',
                        left: creditoLiberado ? '21px' : '3px' }} />
                    </button>
                  </div>

                  {/* Limite field — only when liberado */}
                  {creditoLiberado && (
                    <div className="flex flex-col">
                      <Lbl>Limite de crédito (R$)</Lbl>
                      <GInput
                        type="number"
                        min="0"
                        step="0.01"
                        value={limiteCredito}
                        onChange={e => setLimiteCredito(e.target.value)}
                        placeholder="0.00"
                      />
                    </div>
                  )}

                  {/* Saldo do crédito */}
                  <div style={{ borderTop: '0.5px solid rgba(255,255,255,0.07)', paddingTop: '12px' }}>
                    <p style={{ fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.3)', marginBottom: '8px' }}>Saldo do crédito</p>
                    <div className="grid grid-cols-2 gap-2">
                      <div style={{ background: 'rgba(255,255,255,0.03)', border: '0.5px solid rgba(255,255,255,0.07)', borderRadius: '8px', padding: '10px 12px' }}>
                        <p style={{ fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(255,255,255,0.3)' }}>Ocupado</p>
                        <p style={{ fontSize: '14px', fontWeight: 500, color: 'rgba(255,255,255,0.5)', marginTop: '3px' }}>
                          R$ {creditoSaldo.ocupado.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </p>
                      </div>
                      <div style={{ background: 'rgba(255,255,255,0.03)', border: '0.5px solid rgba(255,255,255,0.07)', borderRadius: '8px', padding: '10px 12px' }}>
                        <p style={{ fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(255,255,255,0.3)' }}>Disponível</p>
                        <p style={{ fontSize: '14px', fontWeight: 500, color: 'rgba(255,255,255,0.5)', marginTop: '3px' }}>
                          R$ {creditoSaldo.disponivel.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

              </div>

            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════ */}
          {/* COMPRAS VIEW                                                  */}
          {/* ══════════════════════════════════════════════════════════════ */}
          {aba === 'compras' && (
            <div className="flex flex-col gap-2">
              <button
                onClick={() => setAba('main')}
                style={{ fontSize: '12px', color: 'rgba(0,239,255,0.7)', background: 'none', border: 'none', cursor: 'pointer', padding: '4px 0', textAlign: 'left', marginBottom: '4px' }}
              >
                ← Voltar aos dados
              </button>

              <div style={CARD} className="flex flex-col gap-2">
                <p style={{ fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.3)', marginBottom: '4px' }}>Histórico de compras</p>

                {historico.length === 0 ? (
                  <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.25)', textAlign: 'center', padding: '24px 0' }}>Nenhuma compra registrada</p>
                ) : (
                  historico.map(v => (
                    <div key={v.id} className="flex items-center justify-between"
                      style={{ background: 'rgba(255,255,255,0.03)', border: '0.5px solid rgba(255,255,255,0.07)', borderRadius: '8px', padding: '10px 12px' }}>
                      <div>
                        <p style={{ fontSize: '13px', fontWeight: 500, color: 'rgba(255,255,255,0.8)' }}>R$ {Number(v.total).toFixed(2)}</p>
                        <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', marginTop: '2px' }}>
                          {new Date(v.criado_em).toLocaleDateString('pt-BR')} · {v.total_itens} item(ns)
                        </p>
                      </div>
                      {Number(v.cashback_gerado) > 0 && (
                        <span style={{ fontSize: '11px', color: 'rgba(100,220,160,0.8)' }}>+R$ {Number(v.cashback_gerado).toFixed(2)}</span>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

        </div>

        {/* ── Fixed footer ───────────────────────────────────────────────── */}
        {aba === 'main' && (
          <div
            className="shrink-0 flex gap-3 px-4 py-3"
            style={{ background: 'rgba(8,18,30,0.65)', backdropFilter: 'blur(8px)', borderTop: '0.5px solid rgba(255,255,255,0.07)' }}
          >
            <button
              onClick={() => setModal({ open: true, title: 'Remover cliente', message: 'Esta ação não pode ser desfeita.', onConfirm: handleDelete })}
              className="flex-1 min-h-[44px]"
              style={{ background: 'rgba(240,100,100,0.08)', border: '0.5px solid rgba(240,100,100,0.25)', borderRadius: '8px', color: 'rgba(240,100,100,0.7)', fontSize: '13px' }}
            >
              Remover cliente
            </button>
            <button
              onClick={() => handleSalvar(false)}
              disabled={salvando}
              className="flex-[2] min-h-[44px] disabled:opacity-40 transition-opacity"
              style={{ background: 'rgba(0,239,255,0.12)', border: '0.5px solid rgba(0,239,255,0.35)', borderRadius: '8px', color: 'rgba(0,239,255,0.85)', fontSize: '13px', fontWeight: 600 }}
            >
              {salvando ? 'Salvando...' : salvoFeedback ? 'Salvo ✓' : 'Aplicar'}
            </button>
            <button
              onClick={() => handleSalvar(true)}
              disabled={salvando}
              className="flex-[2] min-h-[44px] disabled:opacity-40 transition-opacity"
              style={{ background: 'rgba(0,239,255,0.85)', borderRadius: '8px', color: '#0a0a1a', fontSize: '13px', fontWeight: 600, border: 'none' }}
            >
              {salvando ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        )}

      </main>
      <ConfirmModal
        isOpen={modal.open}
        title={modal.title}
        message={modal.message}
        confirmLabel="Remover"
        confirmStyle="danger"
        onConfirm={() => { setModal(m => ({ ...m, open: false })); modal.onConfirm() }}
        onCancel={() => setModal(m => ({ ...m, open: false }))}
      />
    </>
  )
}
