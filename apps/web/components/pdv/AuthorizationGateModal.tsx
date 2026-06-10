'use client'

import { useEffect, useState } from 'react'
import { Shield, ShieldCheck } from 'lucide-react'
import { GlassSelect } from '@/components/ui/GlassSelect'
import { autorizacoesApi, type Supervisor, type ValidarResp } from '@/lib/api/autorizacoes'

interface Props {
  open:                  boolean
  acao:                  string
  acaoLabel:             string
  acaoTom?:              'danger' | 'info'
  exigeJustificativa?:   boolean
  somenteJustificativa?: boolean
  turnoId?:              string | null
  detalhe?:              Record<string, any>
  onClose:               () => void
  onAuthorized:          (r: GateResult) => void
}

export interface GateResult {
  autorizacao_id: string | null
  autorizado_por: string | null
  autorizado_nome: string | null
  criado_em?: string
  justificativa: string | null
}

const LBL: React.CSSProperties = {
  display:       'block',
  fontSize:      '9px',
  textTransform: 'uppercase',
  letterSpacing: '0.1em',
  color:         'rgba(255,255,255,0.35)',
  marginBottom:  '6px',
}

const INPUT: React.CSSProperties = {
  width:       '100%',
  background:  'rgba(8,18,30,0.5)',
  border:      '0.5px solid rgba(255,255,255,0.12)',
  borderRadius: '8px',
  padding:     '0 12px',
  minHeight:   '42px',
  fontSize:    '13px',
  color:       'rgba(255,255,255,0.8)',
  outline:     'none',
  boxSizing:   'border-box' as const,
}

export function AuthorizationGateModal({
  open, acao, acaoLabel, acaoTom = 'info',
  exigeJustificativa = false,
  somenteJustificativa = false,
  turnoId, detalhe,
  onClose, onAuthorized,
}: Props) {
  const [step,             setStep]             = useState<'justificativa' | 'auth'>(exigeJustificativa ? 'justificativa' : 'auth')
  const [supervisores,     setSupervisores]     = useState<Supervisor[]>([])
  const [senhaMestraDisp,  setSenhaMestraDisp]  = useState(false)
  const [justificativa,    setJustificativa]    = useState('')
  const [metodo,           setMetodo]           = useState<'senha_mestra' | 'supervisor'>('supervisor')
  const [selectedId,       setSelectedId]       = useState('')
  const [senha,            setSenha]            = useState('')
  const [erro,             setErro]             = useState('')
  const [loading,          setLoading]          = useState(false)
  const [submitting,       setSubmitting]       = useState(false)
  const [pwReadOnly,       setPwReadOnly]       = useState(true)

  // Reset + fetch supervisors on open
  useEffect(() => {
    if (!open) return
    setStep(exigeJustificativa ? 'justificativa' : 'auth')
    setJustificativa('')
    setSenha('')
    setErro('')
    setSelectedId('')
    setSupervisores([])
    setSenhaMestraDisp(false)
    setPwReadOnly(true)
    setLoading(true)
    autorizacoesApi.supervisores()
      .then(r => {
        setSupervisores(r.supervisores)
        setSenhaMestraDisp(r.senha_mestra_disponivel)
        if (r.supervisores.length > 0) {
          setMetodo('supervisor')
          setSelectedId(r.supervisores[0].id)
        } else if (r.senha_mestra_disponivel) {
          setMetodo('senha_mestra')
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [open])

  // ESC closes
  useEffect(() => {
    if (!open) return
    const fn = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', fn)
    return () => window.removeEventListener('keydown', fn)
  }, [open, onClose])

  if (!open) return null

  const neitherAvailable = !loading && !senhaMestraDisp && supervisores.length === 0
  const bothAvailable    = senhaMestraDisp && supervisores.length > 0

  async function handleAuthorizar() {
    if (!senha.trim() || submitting) return
    setSubmitting(true)
    setErro('')
    try {
      const resp = await autorizacoesApi.validar({
        acao,
        metodo,
        supervisor_id: metodo === 'supervisor' ? selectedId : null,
        senha,
        justificativa: exigeJustificativa ? justificativa : null,
        turno_id:      turnoId ?? null,
        detalhe,
      })
      onAuthorized({ ...resp, justificativa })
      onClose()
    } catch (e: any) {
      setErro(e?.response?.data?.error ?? 'Falha na autorização.')
    } finally {
      setSubmitting(false)
    }
  }

  const chipStyle: React.CSSProperties = acaoTom === 'danger'
    ? { background: 'rgba(240,100,100,0.1)', border: '0.5px solid rgba(240,100,100,0.25)', color: 'rgba(240,130,130,0.85)' }
    : { background: 'rgba(0,239,255,0.08)',  border: '0.5px solid rgba(0,239,255,0.25)',  color: 'rgba(0,239,255,0.85)'  }

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(6,14,26,0.88)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}
      onClick={onClose}
    >
      <div
        style={{ background: 'rgba(8,18,30,0.96)', backdropFilter: 'blur(20px)', border: '0.5px solid rgba(255,255,255,0.12)', borderRadius: '14px', width: '100%', maxWidth: '380px', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 24px 80px rgba(0,0,0,0.7)' }}
        onClick={e => e.stopPropagation()}
      >

        {/* ── JUSTIFICATIVA SCREEN ─────────────────────────────────────────── */}
        {step === 'justificativa' && (
          <>
            <div style={{ padding: '24px 20px 16px', borderBottom: '0.5px solid rgba(255,255,255,0.07)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: 'rgba(0,239,255,0.08)', border: '0.5px solid rgba(0,239,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Shield size={20} style={{ color: 'rgba(0,239,255,0.7)' }} />
              </div>
              <p style={{ fontSize: '15px', fontWeight: 600, color: 'rgba(255,255,255,0.88)', margin: 0 }}>Autorização necessária</p>
              <span style={{ fontSize: '11px', padding: '3px 10px', borderRadius: '20px', ...chipStyle }}>{acaoLabel}</span>
            </div>

            <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={LBL}>Justificativa *</label>
                <textarea
                  value={justificativa}
                  onChange={e => setJustificativa(e.target.value)}
                  placeholder="Descreva o motivo..."
                  rows={3}
                  style={{ ...INPUT, padding: '10px 12px', resize: 'none', minHeight: '80px', fontFamily: 'inherit' }}
                  onFocus={e => { e.currentTarget.style.borderColor = 'rgba(0,239,255,0.4)' }}
                  onBlur={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)' }}
                />
              </div>
            </div>

            <div style={{ padding: '0 20px 20px', display: 'flex', gap: '10px' }}>
              <button
                onClick={onClose}
                style={{ flex: 1, minHeight: '42px', background: 'none', border: '0.5px solid rgba(255,255,255,0.12)', borderRadius: '10px', color: 'rgba(255,255,255,0.4)', fontSize: '13px', cursor: 'pointer' }}
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  if (somenteJustificativa) {
                    onAuthorized({ autorizacao_id: null, autorizado_por: null, autorizado_nome: null, justificativa })
                    onClose()
                  } else {
                    setStep('auth')
                  }
                }}
                disabled={!justificativa.trim()}
                style={{ flex: 2, minHeight: '42px', background: '#0ef', border: 'none', borderRadius: '10px', color: '#0a0a1a', fontSize: '13px', fontWeight: 700, cursor: justificativa.trim() ? 'pointer' : 'default', opacity: justificativa.trim() ? 1 : 0.4, transition: 'opacity 0.15s' }}
              >
                {somenteJustificativa ? 'Confirmar' : 'Continuar →'}
              </button>
            </div>
          </>
        )}

        {/* ── AUTH SCREEN ──────────────────────────────────────────────────── */}
        {step === 'auth' && (
          <>
            <div style={{ padding: '24px 20px 16px', borderBottom: '0.5px solid rgba(255,255,255,0.07)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: 'rgba(0,239,255,0.08)', border: '0.5px solid rgba(0,239,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ShieldCheck size={20} style={{ color: 'rgba(0,239,255,0.7)' }} />
              </div>
              <p style={{ fontSize: '15px', fontWeight: 600, color: 'rgba(255,255,255,0.88)', margin: 0 }}>Autorização do supervisor</p>
            </div>

            <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* Justificativa read-only block */}
              {exigeJustificativa && justificativa && (
                <div style={{ borderLeft: '2px solid rgba(0,239,255,0.4)', paddingLeft: '12px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <span style={{ ...LBL, marginBottom: '3px' }}>Justificativa do operador</span>
                  <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)', margin: 0, lineHeight: 1.5, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{justificativa}</p>
                </div>
              )}

              {loading ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '20px 0' }}>
                  <div className="animate-spin" style={{ width: '24px', height: '24px', border: '2px solid rgba(0,239,255,0.4)', borderTopColor: 'transparent', borderRadius: '50%' }} />
                </div>
              ) : neitherAvailable ? (
                <div style={{ padding: '12px 14px', borderRadius: '10px', background: 'rgba(234,179,8,0.08)', border: '0.5px solid rgba(234,179,8,0.3)' }}>
                  <p style={{ fontSize: '12px', color: 'rgba(234,179,8,0.8)', margin: 0, textAlign: 'center' }}>
                    Nenhuma forma de autorização configurada
                  </p>
                </div>
              ) : (
                <>
                  {/* Method selector — only when both methods are available */}
                  {bothAvailable && (
                    <div style={{ display: 'flex', gap: '4px', background: 'rgba(255,255,255,0.04)', border: '0.5px solid rgba(255,255,255,0.08)', borderRadius: '10px', padding: '4px' }}>
                      <button
                        type="button"
                        onClick={() => { setMetodo('supervisor'); setSelectedId(supervisores[0]?.id ?? ''); setSenha(''); setErro('') }}
                        style={{ flex: 1, minHeight: '34px', borderRadius: '7px', fontSize: '12px', fontWeight: metodo === 'supervisor' ? 600 : 400, border: 'none', cursor: 'pointer', background: metodo === 'supervisor' ? 'rgba(0,239,255,0.12)' : 'transparent', color: metodo === 'supervisor' ? '#0ef' : 'rgba(255,255,255,0.45)', transition: 'background 0.15s, color 0.15s' }}
                      >
                        Supervisor
                      </button>
                      <button
                        type="button"
                        onClick={() => { setMetodo('senha_mestra'); setSenha(''); setErro('') }}
                        style={{ flex: 1, minHeight: '34px', borderRadius: '7px', fontSize: '12px', fontWeight: metodo === 'senha_mestra' ? 600 : 400, border: 'none', cursor: 'pointer', background: metodo === 'senha_mestra' ? 'rgba(0,239,255,0.12)' : 'transparent', color: metodo === 'senha_mestra' ? '#0ef' : 'rgba(255,255,255,0.45)', transition: 'background 0.15s, color 0.15s' }}
                      >
                        Senha mestra
                      </button>
                    </div>
                  )}

                  {/* Supervisor dropdown */}
                  {metodo === 'supervisor' && supervisores.length > 0 && (
                    <div>
                      <label style={LBL}>Supervisor</label>
                      <GlassSelect
                        value={selectedId}
                        onChange={v => { setSelectedId(v); setErro('') }}
                        options={supervisores.map(s => ({ value: s.id, label: s.nome }))}
                      />
                    </div>
                  )}

                  {/* Password */}
                  <div>
                    <label style={LBL}>Senha</label>
                    <input
                      type="password"
                      autoFocus
                      readOnly={pwReadOnly}
                      autoComplete="new-password"
                      name="auth-otp"
                      autoCorrect="off"
                      spellCheck={false}
                      data-1p-ignore="true"
                      data-lpignore="true"
                      value={senha}
                      onChange={e => { setSenha(e.target.value); setErro('') }}
                      onKeyDown={e => { if (e.key === 'Enter') handleAuthorizar() }}
                      placeholder="••••••••"
                      style={{ ...INPUT, borderColor: erro ? 'rgba(240,100,100,0.5)' : 'rgba(255,255,255,0.12)' }}
                      onFocus={e => { setPwReadOnly(false); e.currentTarget.style.borderColor = 'rgba(0,239,255,0.4)' }}
                      onBlur={e => { e.currentTarget.style.borderColor = erro ? 'rgba(240,100,100,0.5)' : 'rgba(255,255,255,0.12)' }}
                    />
                  </div>

                  {/* Inline error */}
                  {erro && (
                    <p style={{ fontSize: '12px', color: 'rgba(240,100,100,0.85)', margin: 0, textAlign: 'center' }}>{erro}</p>
                  )}
                </>
              )}
            </div>

            <div style={{ padding: '0 20px 20px', display: 'flex', gap: '10px' }}>
              {exigeJustificativa ? (
                <button
                  onClick={() => { setStep('justificativa'); setErro('') }}
                  disabled={submitting}
                  style={{ flex: 1, minHeight: '42px', background: 'none', border: '0.5px solid rgba(255,255,255,0.12)', borderRadius: '10px', color: 'rgba(255,255,255,0.4)', fontSize: '13px', cursor: submitting ? 'default' : 'pointer', opacity: submitting ? 0.5 : 1 }}
                >
                  ← Voltar
                </button>
              ) : (
                <button
                  onClick={onClose}
                  disabled={submitting}
                  style={{ flex: 1, minHeight: '42px', background: 'none', border: '0.5px solid rgba(255,255,255,0.12)', borderRadius: '10px', color: 'rgba(255,255,255,0.4)', fontSize: '13px', cursor: submitting ? 'default' : 'pointer', opacity: submitting ? 0.5 : 1 }}
                >
                  Cancelar
                </button>
              )}
              <button
                onClick={handleAuthorizar}
                disabled={submitting || !senha.trim() || neitherAvailable}
                style={{ flex: 2, minHeight: '42px', background: '#0ef', border: 'none', borderRadius: '10px', color: '#0a0a1a', fontSize: '13px', fontWeight: 700, cursor: (submitting || !senha.trim() || neitherAvailable) ? 'default' : 'pointer', opacity: (submitting || !senha.trim() || neitherAvailable) ? 0.4 : 1, transition: 'opacity 0.15s' }}
              >
                {submitting ? 'Verificando...' : 'Autorizar'}
              </button>
            </div>
          </>
        )}

      </div>
    </div>
  )
}
