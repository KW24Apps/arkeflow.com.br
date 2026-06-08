'use client'

import { useEffect, useState } from 'react'
import { clientesApi, type Cliente } from '@/lib/api/clientes'

interface Props {
  open:      boolean
  clienteId: string | null
  onClose:   () => void
  onSaved:   (c: Cliente) => void
}

// ── Formatters ────────────────────────────────────────────────────────────────

function fmtCPF(v: string) {
  const d = v.replace(/\D/g, '').slice(0, 11)
  if (d.length <= 3) return d
  if (d.length <= 6) return `${d.slice(0,3)}.${d.slice(3)}`
  if (d.length <= 9) return `${d.slice(0,3)}.${d.slice(3,6)}.${d.slice(6)}`
  return `${d.slice(0,3)}.${d.slice(3,6)}.${d.slice(6,9)}-${d.slice(9)}`
}

function fmtPhone(v: string) {
  const d = v.replace(/\D/g, '').slice(0, 11)
  if (d.length === 0) return ''
  if (d.length <= 2)  return `(${d}`
  if (d.length <= 6)  return `(${d.slice(0,2)}) ${d.slice(2)}`
  if (d.length <= 10) return `(${d.slice(0,2)}) ${d.slice(2,6)}-${d.slice(6)}`
  return `(${d.slice(0,2)}) ${d.slice(2,7)}-${d.slice(7)}`
}

function fmtCEP(v: string) {
  const d = v.replace(/\D/g, '').slice(0, 8)
  return d.length > 5 ? d.replace(/(\d{5})(\d{0,3})/, '$1-$2') : d
}

// ── Shared styles ─────────────────────────────────────────────────────────────

const INPUT: React.CSSProperties = {
  background:   'rgba(8,18,30,0.5)',
  border:       '0.5px solid rgba(255,255,255,0.12)',
  borderRadius: '8px',
  padding:      '9px 12px',
  fontSize:     '13px',
  color:        'rgba(255,255,255,0.75)',
  width:        '100%',
  outline:      'none',
}

const LBL: React.CSSProperties = {
  display:       'block',
  fontSize:      '9px',
  textTransform: 'uppercase',
  letterSpacing: '0.1em',
  color:         'rgba(255,255,255,0.35)',
  marginBottom:  '5px',
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

// ── Component ─────────────────────────────────────────────────────────────────

export function ClienteDadosModal({ open, clienteId, onClose, onSaved }: Props) {
  const [loading,     setLoading]     = useState(false)
  const [salvando,    setSalvando]    = useState(false)
  const [erro,        setErro]        = useState('')

  const [nome,        setNome]        = useState('')
  const [cpf,         setCpf]         = useState('')
  const [telefones,   setTelefones]   = useState<string[]>([''])
  const [emails,      setEmails]      = useState<string[]>([''])
  const [cep,         setCep]         = useState('')
  const [logradouro,  setLogradouro]  = useState('')
  const [numero,      setNumero]      = useState('')
  const [complemento, setComplemento] = useState('')
  const [bairro,      setBairro]      = useState('')
  const [cidade,      setCidade]      = useState('')
  const [estado,      setEstado]      = useState('')
  const [buscandoCep, setBuscandoCep] = useState(false)

  // Load client data every time modal opens for a client
  useEffect(() => {
    if (!open || !clienteId) return
    setLoading(true)
    setErro('')
    clientesApi.get(clienteId).then(c => {
      setNome(c.nome)
      setCpf(c.cpf ?? '')
      const phones = (c as any).telefones ?? (c.telefone ? [c.telefone] : [''])
      setTelefones(phones.length > 0 ? phones : [''])
      const mails  = (c as any).emails  ?? (c.email   ? [c.email]   : [''])
      setEmails(mails.length > 0 ? mails : [''])
      setCep(c.cep ?? '')
      setLogradouro(c.logradouro ?? '')
      setNumero(c.numero ?? '')
      setComplemento(c.complemento ?? '')
      setBairro(c.bairro ?? '')
      setCidade(c.cidade ?? '')
      setEstado(c.estado ?? '')
    }).catch(() => setErro('Erro ao carregar dados do cliente.'))
    .finally(() => setLoading(false))
  }, [open, clienteId])

  // ESC = cancel (no save)
  useEffect(() => {
    if (!open) return
    const fn = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', fn)
    return () => window.removeEventListener('keydown', fn)
  }, [open, onClose])

  if (!open || !clienteId) return null

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
    if (!nome.trim()) { setErro('Nome é obrigatório.'); return }
    setSalvando(true); setErro('')
    try {
      const c = await clientesApi.update(clienteId!, {
        nome:        nome.trim(),
        cpf:         cpf        || null,
        telefone:    telefones[0]?.trim() || null,
        telefones:   telefones.filter(t => t.trim()),
        email:       emails[0]?.trim()    || null,
        emails:      emails.filter(e => e.trim()),
        cep:         cep        || null,
        logradouro:  logradouro || null,
        numero:      numero     || null,
        complemento: complemento || null,
        bairro:      bairro     || null,
        cidade:      cidade     || null,
        estado:      estado     || null,
      } as any)
      onSaved(c)
      onClose()
    } catch (err: any) {
      setErro(err?.response?.data?.error ?? 'Erro ao salvar.')
    } finally { setSalvando(false) }
  }

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(6,14,26,0.92)', zIndex: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}
    >
      <div
        style={{ background: 'rgba(8,18,30,0.98)', backdropFilter: 'blur(20px)', border: '0.5px solid rgba(255,255,255,0.13)', borderRadius: '16px', width: '100%', maxWidth: '500px', maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 24px 80px rgba(0,0,0,0.7)' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ padding: '16px 20px', borderBottom: '0.5px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <p style={{ fontSize: '15px', fontWeight: 600, color: 'rgba(255,255,255,0.88)', margin: 0 }}>Dados do Cliente</p>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.35)', fontSize: '22px', lineHeight: 1, padding: '2px 8px', display: 'flex', alignItems: 'center' }}>×</button>
        </div>

        {/* Scrollable body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '40px 0' }}>
              <div className="w-7 h-7 border-2 border-electric-cyan border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <>
              {/* Nome */}
              <div>
                <label style={LBL}>Nome *</label>
                <GInput value={nome} onChange={e => setNome(e.target.value)} placeholder="Nome do cliente" />
              </div>

              {/* CPF */}
              <div>
                <label style={LBL}>CPF</label>
                <GInput value={cpf} onChange={e => setCpf(fmtCPF(e.target.value))} placeholder="000.000.000-00" />
              </div>

              {/* Telefones */}
              <div>
                <label style={LBL}>Telefones</label>
                {telefones.map((t, i) => (
                  <div key={i} style={{ display: 'flex', gap: '6px', alignItems: 'center', marginBottom: '6px' }}>
                    <GInput
                      value={t}
                      onChange={e => setTelefones(prev => prev.map((x, xi) => xi === i ? fmtPhone(e.target.value) : x))}
                      placeholder="(00) 00000-0000"
                      style={{ flex: 1 }}
                    />
                    {telefones.length > 1 && (
                      <button
                        onClick={() => setTelefones(prev => prev.filter((_, xi) => xi !== i))}
                        style={{ color: 'rgba(255,255,255,0.3)', fontSize: '20px', width: '28px', background: 'none', border: 'none', cursor: 'pointer', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      >×</button>
                    )}
                  </div>
                ))}
                <button onClick={() => setTelefones(prev => [...prev, ''])} style={{ fontSize: '11px', color: 'rgba(0,239,255,0.6)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                  + Adicionar telefone
                </button>
              </div>

              {/* Emails */}
              <div>
                <label style={LBL}>Emails</label>
                {emails.map((e, i) => (
                  <div key={i} style={{ display: 'flex', gap: '6px', alignItems: 'center', marginBottom: '6px' }}>
                    <GInput
                      type="email"
                      value={e}
                      onChange={ev => setEmails(prev => prev.map((x, xi) => xi === i ? ev.target.value : x))}
                      placeholder="email@exemplo.com"
                      style={{ flex: 1 }}
                    />
                    {emails.length > 1 && (
                      <button
                        onClick={() => setEmails(prev => prev.filter((_, xi) => xi !== i))}
                        style={{ color: 'rgba(255,255,255,0.3)', fontSize: '20px', width: '28px', background: 'none', border: 'none', cursor: 'pointer', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      >×</button>
                    )}
                  </div>
                ))}
                <button onClick={() => setEmails(prev => [...prev, ''])} style={{ fontSize: '11px', color: 'rgba(0,239,255,0.6)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                  + Adicionar email
                </button>
              </div>

              {/* Address section */}
              <div style={{ borderTop: '0.5px solid rgba(255,255,255,0.07)', paddingTop: '14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <p style={{ fontSize: '9px', textTransform: 'uppercase' as const, letterSpacing: '0.1em', color: 'rgba(255,255,255,0.3)', margin: 0 }}>Endereço</p>

                {/* CEP + Buscar */}
                <div style={{ display: 'flex', gap: '8px' }}>
                  <GInput
                    value={cep}
                    onChange={e => setCep(fmtCEP(e.target.value))}
                    onBlur={() => buscarCep()}
                    placeholder="00000-000"
                    style={{ flex: 1 }}
                  />
                  <button
                    onClick={buscarCep}
                    disabled={buscandoCep}
                    style={{ background: 'rgba(0,239,255,0.15)', border: '0.5px solid rgba(0,239,255,0.3)', borderRadius: '8px', padding: '9px 14px', fontSize: '12px', color: '#0ef', flexShrink: 0, cursor: 'pointer', opacity: buscandoCep ? 0.5 : 1 }}
                  >
                    {buscandoCep ? '...' : 'Buscar'}
                  </button>
                </div>

                <GInput value={logradouro} onChange={e => setLogradouro(e.target.value)} placeholder="Logradouro" />

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <GInput value={numero}      onChange={e => setNumero(e.target.value)}      placeholder="Número" />
                  <GInput value={complemento} onChange={e => setComplemento(e.target.value)} placeholder="Complemento" />
                </div>

                <GInput value={bairro} onChange={e => setBairro(e.target.value)} placeholder="Bairro" />

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <GInput value={cidade} onChange={e => setCidade(e.target.value)} placeholder="Cidade" />
                  <GInput value={estado} onChange={e => setEstado(e.target.value.slice(0,2).toUpperCase())} placeholder="UF" maxLength={2} />
                </div>
              </div>

              {erro && (
                <p style={{ fontSize: '12px', color: 'rgba(248,113,113,0.85)', textAlign: 'center', margin: 0 }}>{erro}</p>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '12px 20px 16px', borderTop: '0.5px solid rgba(255,255,255,0.07)', display: 'flex', gap: '10px', flexShrink: 0 }}>
          <button
            onClick={onClose}
            disabled={salvando}
            style={{ flex: 1, minHeight: '44px', background: 'none', border: '0.5px solid rgba(255,255,255,0.12)', borderRadius: '10px', color: 'rgba(255,255,255,0.45)', fontSize: '13px', cursor: 'pointer', opacity: salvando ? 0.5 : 1 }}
          >
            Cancelar
          </button>
          <button
            onClick={handleSalvar}
            disabled={salvando || loading}
            style={{ flex: 2, minHeight: '44px', background: 'rgba(0,239,255,0.88)', border: 'none', borderRadius: '10px', color: '#0a0a1a', fontSize: '13px', fontWeight: 700, cursor: salvando || loading ? 'default' : 'pointer', opacity: salvando || loading ? 0.5 : 1 }}
          >
            {salvando ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </div>
    </div>
  )
}
