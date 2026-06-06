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

export default function NovoClientePage() {
  const router = useRouter()

  const [tipoPessoa,      setTipoPessoa]      = useState<'fisica' | 'juridica'>('fisica')
  const [nome,            setNome]            = useState('')
  const [cpf,             setCpf]             = useState('')
  const [telefone,        setTelefone]        = useState('')
  const [email,           setEmail]           = useState('')
  const [regraCashbackId, setRegraCashbackId] = useState('')
  const [regras,          setRegras]          = useState<RegraCashback[]>([])
  const [loading,         setLoading]         = useState(false)
  const [buscandoCnpj,    setBuscandoCnpj]    = useState(false)
  const [erro,            setErro]            = useState('')

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
      if (!res.ok) { setErro('CNPJ não encontrado.'); return }
      const data = await res.json()
      if (data.razao_social) setNome(data.razao_social)
      if (data.email) setEmail(data.email)
      const tel = data.ddd_telefone_1?.replace(/\D/g, '')
      if (tel) setTelefone(fmtPhone(tel))
      setErro('')
    } catch { setErro('Erro ao buscar CNPJ.') }
    finally { setBuscandoCnpj(false) }
  }

  async function handleSalvar(e: React.FormEvent) {
    e.preventDefault()
    setErro('')
    if (!nome.trim()) { setErro('Nome é obrigatório.'); return }
    setLoading(true)
    try {
      const c = await clientesApi.create({
        nome,
        tipo_pessoa:       tipoPessoa,
        telefone:          telefone || undefined,
        cpf:               cpf.replace(/\D/g, '') || undefined,
        email:             email || undefined,
        regra_cashback_id: regraCashbackId || undefined,
      } as any)
      router.push(`/painel/clientes/${c.id}`)
    } catch (err: any) {
      setErro(err?.response?.data?.error ?? 'Erro ao salvar.')
    } finally { setLoading(false) }
  }

  return (
    <>
      <TopBar />
      <main className="flex-1 overflow-y-auto p-4 md:p-5 pb-10">
        <form onSubmit={handleSalvar} className="flex flex-col gap-3 max-w-lg">

          <div style={CARD} className="flex flex-col gap-3">
            <p style={{ fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.3)' }}>Novo cliente</p>

            {/* PF / PJ toggle */}
            <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: '8px', padding: '3px' }} className="flex gap-1">
              {(['fisica', 'juridica'] as const).map(tp => (
                <button key={tp} type="button" onClick={() => { setTipoPessoa(tp); setCpf('') }}
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

            {/* CPF / CNPJ */}
            <div className="flex flex-col">
              <Lbl>{tipoPessoa === 'juridica' ? 'CNPJ' : 'CPF'}</Lbl>
              <div className="flex gap-2">
                <GInput
                  value={cpf}
                  onChange={e => setCpf(tipoPessoa === 'juridica' ? fmtCNPJ(e.target.value) : fmtCPF(e.target.value))}
                  onBlur={() => { if (tipoPessoa === 'juridica') buscarCnpj() }}
                  placeholder={tipoPessoa === 'juridica' ? '00.000.000/0000-00' : '000.000.000-00'}
                  style={{ flex: 1 }}
                />
                {tipoPessoa === 'juridica' && (
                  <button type="button" onClick={buscarCnpj} disabled={buscandoCnpj}
                    style={{ background: 'rgba(0,239,255,0.15)', border: '0.5px solid rgba(0,239,255,0.3)', borderRadius: '8px', padding: '9px 14px', fontSize: '12px', color: '#0ef', flexShrink: 0 }}>
                    {buscandoCnpj ? '...' : 'Buscar'}
                  </button>
                )}
              </div>
            </div>

            <div className="flex flex-col">
              <Lbl>{tipoPessoa === 'juridica' ? 'Razão Social *' : 'Nome *'}</Lbl>
              <GInput value={nome} onChange={e => setNome(e.target.value)} placeholder={tipoPessoa === 'juridica' ? 'Razão social' : 'Nome completo'} />
            </div>

            <div className="flex flex-col">
              <Lbl>Telefone</Lbl>
              <GInput type="tel" value={telefone} onChange={e => setTelefone(fmtPhone(e.target.value))} placeholder="(00) 00000-0000" />
            </div>

            <div className="flex flex-col">
              <Lbl>Email</Lbl>
              <GInput type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="email@exemplo.com" />
            </div>

            {regras.length > 0 && (
              <div className="flex flex-col">
                <Lbl>Regra de Cashback</Lbl>
                <GSelect value={regraCashbackId} onChange={e => setRegraCashbackId(e.target.value)}>
                  <option value="">Sem cashback</option>
                  {regras.map(r => (
                    <option key={r.id} value={r.id}>{r.nome} — {Number(r.percentual).toFixed(1)}%{r.padrao ? ' (padrão)' : ''}</option>
                  ))}
                </GSelect>
              </div>
            )}
          </div>

          {erro && <p style={{ fontSize: '12px', color: 'rgba(248,113,113,0.85)', textAlign: 'center' }}>{erro}</p>}

          <div className="flex gap-3">
            <button type="button" onClick={() => router.back()}
              className="flex-1 min-h-[44px]"
              style={{ background: 'rgba(255,255,255,0.06)', border: '0.5px solid rgba(255,255,255,0.12)', borderRadius: '8px', color: 'rgba(255,255,255,0.5)', fontSize: '13px' }}>
              Cancelar
            </button>
            <button type="submit" disabled={loading}
              className="flex-[2] min-h-[44px] disabled:opacity-40 transition-opacity"
              style={{ background: 'rgba(0,239,255,0.85)', borderRadius: '8px', color: '#0a0a1a', fontSize: '13px', fontWeight: 600, border: 'none' }}>
              {loading ? 'Salvando...' : 'Salvar Cliente'}
            </button>
          </div>

        </form>
      </main>
    </>
  )
}
