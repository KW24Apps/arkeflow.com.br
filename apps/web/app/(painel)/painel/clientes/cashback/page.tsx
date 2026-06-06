'use client'

import { useEffect, useState } from 'react'
import { TopBar } from '@/components/layout/TopBar'
import { cashbackApi, type RegraCashback } from '@/lib/api/cashback'

const CARD = {
  background: 'rgba(8,18,30,0.48)',
  backdropFilter: 'blur(8px)',
  border: '0.5px solid rgba(255,255,255,0.09)',
  borderRadius: '10px',
}

const INPUT = {
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
      onFocus={e => (e.currentTarget.style.borderColor = 'rgba(0,239,255,0.4)')}
      onBlur={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)')}
    />
  )
}

export default function CashbackRegrasPage() {
  const [regras,   setRegras]   = useState<RegraCashback[]>([])
  const [loading,  setLoading]  = useState(true)
  const [formOpen, setFormOpen] = useState(false)
  const [saving,   setSaving]   = useState(false)

  const [nome,          setNome]          = useState('')
  const [percentual,    setPercentual]    = useState('')
  const [validadeMeses, setValidadeMeses] = useState('')
  const [padrao,        setPadrao]        = useState(false)
  const [editandoId,    setEditandoId]    = useState<string | null>(null)

  async function load() {
    setLoading(true)
    try { setRegras(await cashbackApi.list()) }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  function abrirNova() {
    setNome(''); setPercentual(''); setValidadeMeses(''); setPadrao(false)
    setEditandoId(null); setFormOpen(true)
  }

  function abrirEdicao(r: RegraCashback) {
    setNome(r.nome); setPercentual(String(Number(r.percentual)))
    setValidadeMeses(r.validade_meses ? String(r.validade_meses) : '')
    setPadrao(r.padrao); setEditandoId(r.id); setFormOpen(true)
  }

  async function handleSalvar() {
    if (!nome || !percentual) return
    setSaving(true)
    try {
      const data = {
        nome, percentual: parseFloat(percentual),
        validade_meses: validadeMeses ? parseInt(validadeMeses) : null,
        padrao,
      }
      if (editandoId) await cashbackApi.update(editandoId, data)
      else await cashbackApi.create(data)
      await load(); setFormOpen(false)
    } finally { setSaving(false) }
  }

  async function handleRemover(id: string) {
    if (!confirm('Remover esta regra?')) return
    await cashbackApi.remove(id)
    setRegras(r => r.filter(x => x.id !== id))
    setFormOpen(false)
  }

  return (
    <>
      <TopBar />
      <main className="flex-1 overflow-y-auto p-4 md:p-5 pb-20 flex flex-col gap-4">

        <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)' }}>
          Defina as regras de cashback. A regra padrão é aplicada automaticamente a todos os novos clientes.
        </p>

        {/* ── Edit panel — above grid ─────────────────────────────────── */}
        {formOpen && (
          <div style={CARD} className="p-5 flex flex-col gap-4">
            <p style={{ fontSize: '13px', fontWeight: 600, color: 'rgba(255,255,255,0.7)' }}>
              {editandoId ? 'Editar regra' : 'Nova regra'}
            </p>

            <div className="flex flex-col">
              <Lbl>Nome</Lbl>
              <GInput value={nome} onChange={e => setNome(e.target.value)} placeholder="Ex: VIP, Padrão, Premium" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col">
                <Lbl>% Cashback</Lbl>
                <GInput type="number" min="0" max="100" value={percentual} onChange={e => setPercentual(e.target.value)} placeholder="Ex: 5" />
              </div>
              <div className="flex flex-col">
                <Lbl>Validade (meses)</Lbl>
                <GInput type="number" min="1" value={validadeMeses} onChange={e => setValidadeMeses(e.target.value)} placeholder="Vazio = ilimitado" />
              </div>
            </div>

            {/* Regra padrão toggle */}
            <div style={{ background: 'rgba(8,18,30,0.35)', border: '0.5px solid rgba(255,255,255,0.07)', borderRadius: '8px', padding: '10px 12px' }} className="flex items-center justify-between">
              <div>
                <p style={{ fontSize: '12px', fontWeight: 500, color: 'rgba(255,255,255,0.7)' }}>Regra padrão</p>
                <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', marginTop: '1px' }}>Aplicada automaticamente a novos clientes</p>
              </div>
              <button type="button" onClick={() => setPadrao(v => !v)}
                className="shrink-0 relative transition-colors"
                style={{ width: '40px', height: '22px', borderRadius: '9999px', border: 'none', background: padrao ? 'rgba(0,212,212,0.7)' : 'rgba(255,255,255,0.1)' }}>
                <span className="absolute top-[3px] w-[16px] h-[16px] bg-white rounded-full transition-all"
                  style={{ left: padrao ? '21px' : '3px' }} />
              </button>
            </div>

            <div className="flex items-center justify-between gap-3">
              {editandoId ? (
                <button onClick={() => handleRemover(editandoId)}
                  className="min-h-[40px] px-2 transition-colors"
                  style={{ fontSize: '12px', color: 'rgba(248,113,113,0.5)', background: 'none', border: 'none', cursor: 'pointer' }}
                  onMouseEnter={e => (e.currentTarget.style.color = 'rgba(248,113,113,0.85)')}
                  onMouseLeave={e => (e.currentTarget.style.color = 'rgba(248,113,113,0.5)')}
                >
                  Remover
                </button>
              ) : <span />}
              <div className="flex gap-3">
                <button onClick={() => setFormOpen(false)}
                  className="min-h-[40px] px-5 rounded-lg text-sm transition-colors"
                  style={{ border: '0.5px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.4)', borderRadius: '8px', background: 'none', cursor: 'pointer' }}
                  onMouseEnter={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.7)')}
                  onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.4)')}
                >
                  Cancelar
                </button>
                <button onClick={handleSalvar} disabled={saving || !nome || !percentual}
                  className="min-h-[40px] px-5 text-sm font-semibold rounded-lg disabled:opacity-40"
                  style={{ background: 'rgba(0,239,255,0.85)', color: '#0a0a1a', borderRadius: '8px', border: 'none', cursor: 'pointer' }}>
                  {saving ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Card grid ───────────────────────────────────────────────── */}
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="w-6 h-6 border-2 border-electric-cyan border-t-transparent rounded-full animate-spin" />
          </div>
        ) : regras.length === 0 ? (
          <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.25)', textAlign: 'center', padding: '32px 0' }}>Nenhuma regra cadastrada</p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '10px' }}>
            {regras.map(r => (
              <div
                key={r.id}
                onClick={() => abrirEdicao(r)}
                className="p-4 flex flex-col gap-2 cursor-pointer active:scale-[0.98] transition-all"
                style={CARD}
                onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.18)')}
                onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.09)')}
              >
                <div className="flex items-start justify-between gap-2">
                  <p style={{ fontSize: '14px', fontWeight: 500, color: 'rgba(255,255,255,0.85)' }}>{r.nome}</p>
                  {r.padrao && (
                    <span style={{ fontSize: '9px', textTransform: 'uppercase', background: 'rgba(0,239,255,0.12)', color: '#0ef', borderRadius: '9999px', padding: '2px 7px', flexShrink: 0 }}>
                      Padrão
                    </span>
                  )}
                </div>
                <p style={{ fontSize: '13px', fontWeight: 500, color: 'rgba(100,220,160,0.8)' }}>
                  {Number(r.percentual).toFixed(1)}% cashback
                </p>
                <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)' }}>
                  {r.validade_meses ? `Vence em ${r.validade_meses} meses` : 'Sem vencimento'}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* FAB */}
        <button onClick={abrirNova}
          className="fixed bottom-6 right-6 z-50 flex items-center justify-center shadow-lg active:scale-95 transition-transform"
          style={{ width: '48px', height: '48px', background: 'rgba(0,239,255,0.9)', borderRadius: '50%', color: '#0a0a1a', fontSize: '24px', fontWeight: 700, border: 'none', cursor: 'pointer' }}>
          +
        </button>
      </main>
    </>
  )
}
