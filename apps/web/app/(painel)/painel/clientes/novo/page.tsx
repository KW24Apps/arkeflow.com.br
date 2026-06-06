'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { TopBar } from '@/components/layout/TopBar'
import { clientesApi } from '@/lib/api/clientes'
import { cashbackApi, type RegraCashback } from '@/lib/api/cashback'

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
    <input {...rest} style={{ ...INPUT, ...rest.style, border: borderColor ? `0.5px solid ${borderColor}` : INPUT.border as string }}
      className="outline-none"
      onFocus={e => { e.currentTarget.style.borderColor = 'rgba(0,239,255,0.4)'; rest.onFocus?.(e) }}
      onBlur={e => { e.currentTarget.style.borderColor = borderColor ?? 'rgba(255,255,255,0.12)'; rest.onBlur?.(e) }}
    />
  )
}

function GSelect(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select {...props} style={{ ...INPUT, ...props.style }} className="outline-none"
      onFocus={e => (e.currentTarget.style.borderColor = 'rgba(0,239,255,0.4)')}
      onBlur={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)')}
    />
  )
}

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

export default function NovoClientePage() {
  const router = useRouter()

  const [tipoPessoa,      setTipoPessoa]      = useState<'fisica' | 'juridica'>('fisica')
  const [cpf,             setCpf]             = useState('')
  const [nome,            setNome]            = useState('')
  const [telefones,       setTelefones]       = useState<string[]>([''])
  const [emails,          setEmails]          = useState<string[]>([''])
  const [emailErrors,     setEmailErrors]     = useState<Record<number,boolean>>({})
  const [regraCashbackId, setRegraCashbackId] = useState('')
  const [regras,          setRegras]          = useState<RegraCashback[]>([])

  const [cep,         setCep]         = useState('')
  const [logradouro,  setLogradouro]  = useState('')
  const [numero,      setNumero]      = useState('')
  const [complemento, setComplemento] = useState('')
  const [bairro,      setBairro]      = useState('')
  const [cidade,      setCidade]      = useState('')
  const [estado,      setEstado]      = useState('')

  const [buscandoCnpj, setBuscandoCnpj] = useState(false)
  const [buscandoCep,  setBuscandoCep]  = useState(false)
  const [loading,      setLoading]      = useState(false)
  const [erro,         setErro]         = useState('')

  useEffect(() => {
    cashbackApi.list().then(rs => {
      setRegras(rs)
      const padrao = rs.find(r => r.padrao)
      if (padrao) setRegraCashbackId(padrao.id)
    })
  }, [])

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

  async function handleSalvar() {
    setErro('')
    if (!nome.trim()) { setErro('Nome é obrigatório.'); return }
    setLoading(true)
    try {
      const c = await clientesApi.create({
        nome,
        tipo_pessoa:       tipoPessoa,
        cpf:               cpf.replace(/\D/g, '') || undefined,
        telefone:          telefones[0]?.trim() || undefined,
        telefones:         telefones.filter(t => t.trim()),
        email:             emails[0]?.trim() || undefined,
        emails:            emails.filter(e => e.trim()),
        regra_cashback_id: regraCashbackId || undefined,
        cep:               cep || undefined,
        logradouro:        logradouro || undefined,
        numero:            numero || undefined,
        complemento:       complemento || undefined,
        bairro:            bairro || undefined,
        cidade:            cidade || undefined,
        estado:            estado || undefined,
      } as any)
      router.push(`/painel/clientes/${c.id}`)
    } catch (err: any) {
      setErro(err?.response?.data?.error ?? 'Erro ao salvar.')
    } finally { setLoading(false) }
  }

  return (
    <>
      <TopBar />
      <main className="flex-1 overflow-hidden flex flex-col">

        <div className="flex-1 overflow-y-auto p-3">
          {erro && <p style={{ fontSize: '12px', color: 'rgba(248,113,113,0.85)', textAlign: 'center', marginBottom: '8px' }}>{erro}</p>}
          <div className="grid grid-cols-2 gap-3 items-start">

            {/* LEFT: Dados pessoais */}
            <div style={CARD} className="flex flex-col gap-3">
              <p style={{ fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.3)' }}>Dados Pessoais</p>

              {/* PF / PJ toggle */}
              <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: '8px', padding: '3px' }} className="flex gap-1">
                {(['fisica', 'juridica'] as const).map(tp => (
                  <button key={tp} type="button" onClick={() => { setTipoPessoa(tp); setCpf('') }}
                    style={{ flex: 1, padding: '6px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: 500, border: 'none', transition: 'background 0.15s, color 0.15s',
                      background: tipoPessoa === tp ? 'rgba(0,239,255,0.15)' : 'transparent',
                      color:      tipoPessoa === tp ? '#0ef' : 'rgba(255,255,255,0.4)',
                    }}>
                    {tp === 'fisica' ? 'Pessoa Física' : 'Pessoa Jurídica'}
                  </button>
                ))}
              </div>

              {/* CPF / CNPJ */}
              <div className="flex flex-col">
                <Lbl>{tipoPessoa === 'juridica' ? 'CNPJ' : 'CPF'}</Lbl>
                <div className="flex gap-2">
                  <GInput value={cpf}
                    onChange={e => setCpf(tipoPessoa === 'juridica' ? fmtCNPJ(e.target.value) : fmtCPF(e.target.value))}
                    onBlur={() => { if (tipoPessoa === 'juridica') buscarCnpj() }}
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
              </div>

              <div className="flex flex-col">
                <Lbl>{tipoPessoa === 'juridica' ? 'Razão Social *' : 'Nome *'}</Lbl>
                <GInput value={nome} onChange={e => setNome(e.target.value)}
                  onBlur={() => setNome(n => n.replace(/\b\w/g, c => c.toUpperCase()))}
                  placeholder={tipoPessoa === 'juridica' ? 'Razão social' : 'Nome completo'} />
              </div>

              {/* Telefones */}
              <div className="flex flex-col gap-2">
                <Lbl>Telefones</Lbl>
                {telefones.map((t, i) => (
                  <div key={i} className="flex gap-2">
                    <GInput value={t} onChange={e => { const v = fmtPhone(e.target.value); setTelefones(prev => prev.map((x, xi) => xi === i ? v : x)) }} placeholder="(00) 00000-0000" style={{ flex: 1 }} />
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

              {/* Emails */}
              <div className="flex flex-col gap-2">
                <Lbl>Emails</Lbl>
                {emails.map((e, i) => (
                  <div key={i} className="flex gap-2">
                    <GInput type="email" value={e}
                      onChange={ev => setEmails(prev => prev.map((x, xi) => xi === i ? ev.target.value : x))}
                      onBlur={ev => setEmailErrors(prev => ({ ...prev, [i]: !!ev.target.value && !ev.target.value.includes('@') }))}
                      borderColor={emailErrors[i] ? 'rgba(248,113,113,0.5)' : undefined}
                      placeholder="email@exemplo.com" style={{ flex: 1 }}
                    />
                    {emails.length > 1 && (
                      <button type="button" onClick={() => { setEmails(prev => prev.filter((_, xi) => xi !== i)); setEmailErrors(prev => { const n = { ...prev }; delete n[i]; return n }) }}
                        style={{ color: 'rgba(255,255,255,0.3)', fontSize: '18px', width: '32px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
                    )}
                  </div>
                ))}
                <button type="button" onClick={() => setEmails(prev => [...prev, ''])}
                  style={{ fontSize: '11px', color: 'rgba(0,239,255,0.6)', textAlign: 'left', background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}>
                  + Adicionar email
                </button>
              </div>

              {/* Cashback */}
              {regras.length > 0 && (
                <div className="flex flex-col">
                  <Lbl>Regra de Cashback</Lbl>
                  <GSelect value={regraCashbackId} onChange={e => setRegraCashbackId(e.target.value)}>
                    <option value="">Sem cashback</option>
                    {regras.map(r => <option key={r.id} value={r.id}>{r.nome} — {Number(r.percentual).toFixed(1)}%{r.padrao ? ' (padrão)' : ''}</option>)}
                  </GSelect>
                </div>
              )}
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
          <button type="button" onClick={() => router.back()}
            className="flex-1 min-h-[44px]"
            style={{ background: 'rgba(255,255,255,0.06)', border: '0.5px solid rgba(255,255,255,0.12)', borderRadius: '8px', color: 'rgba(255,255,255,0.5)', fontSize: '13px' }}>
            Cancelar
          </button>
          <button onClick={handleSalvar} disabled={loading}
            className="flex-[2] min-h-[44px] disabled:opacity-40 transition-opacity"
            style={{ background: 'rgba(0,239,255,0.85)', borderRadius: '8px', color: '#0a0a1a', fontSize: '13px', fontWeight: 600, border: 'none' }}>
            {loading ? 'Salvando...' : 'Salvar Cliente'}
          </button>
        </div>

      </main>
    </>
  )
}
