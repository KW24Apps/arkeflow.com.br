'use client'

import { forwardRef, useEffect, useRef, useState } from 'react'
import { clientesApi, type Cliente } from '@/lib/api/clientes'

interface Props {
  open:        boolean
  onClose:     () => void
  onSelect:    (cliente: Cliente) => void
  autoAberto?: boolean
}

type View = 'search' | 'novo'

const INPUT_STYLE: React.CSSProperties = {
  background: 'rgba(8,18,30,0.5)',
  border: '0.5px solid rgba(255,255,255,0.12)',
  borderRadius: '8px',
  padding: '9px 12px',
  fontSize: '13px',
  color: 'rgba(255,255,255,0.75)',
  outline: 'none',
  width: '100%',
}

const LBL: React.CSSProperties = {
  display: 'block',
  fontSize: '9px',
  textTransform: 'uppercase',
  letterSpacing: '0.1em',
  color: 'rgba(255,255,255,0.35)',
  marginBottom: '5px',
}

const GInput = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  (props, ref) => (
    <input
      {...props}
      ref={ref}
      style={{ ...INPUT_STYLE, ...props.style }}
      onFocus={e => { e.currentTarget.style.borderColor = 'rgba(0,239,255,0.4)'; props.onFocus?.(e) }}
      onBlur={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'; props.onBlur?.(e) }}
    />
  )
)

export function CustomerSearchModal({ open, onClose, onSelect, autoAberto }: Props) {
  const searchRef = useRef<HTMLInputElement>(null)
  const nomeRef   = useRef<HTMLInputElement>(null)

  const [view,      setView]      = useState<View>('search')
  const [q,         setQ]         = useState('')
  const [clientes,  setClientes]  = useState<Cliente[]>([])
  const [buscando,  setBuscando]  = useState(false)

  const [novoNome,   setNovoNome]   = useState('')
  const [novoTels,   setNovoTels]   = useState<string[]>([''])
  const [novoCPF,    setNovoCPF]    = useState('')
  const [novoEmails, setNovoEmails] = useState<string[]>([''])
  const [salvando,   setSalvando]   = useState(false)
  const [erroNovo,   setErroNovo]   = useState('')

  // ── Reset on open ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!open) return
    setView('search'); setQ(''); setClientes([])
    setNovoNome(''); setNovoTels(['']); setNovoCPF(''); setNovoEmails(['']); setErroNovo('')
    // rAF fires before paint (catches auto-open race); 160ms retry wins any late focus steal
    const raf = requestAnimationFrame(() => searchRef.current?.focus())
    const tid = setTimeout(() => searchRef.current?.focus(), 160)
    return () => { cancelAnimationFrame(raf); clearTimeout(tid) }
  }, [open])

  // ── Focus nome when switching to form ─────────────────────────────────────
  useEffect(() => {
    if (view === 'novo') setTimeout(() => nomeRef.current?.focus(), 60)
  }, [view])

  // ── Debounced search ──────────────────────────────────────────────────────
  useEffect(() => {
    if (view !== 'search') return
    if (!q.trim()) { setClientes([]); return }
    const t = setTimeout(async () => {
      setBuscando(true)
      try { setClientes(await clientesApi.list(q)) }
      finally { setBuscando(false) }
    }, 280)
    return () => clearTimeout(t)
  }, [q, view])

  // ── ESC to close ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (view === 'novo') { setView('search'); return }
        onClose()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, view, onClose])

  if (!open) return null

  // ── Save new customer ─────────────────────────────────────────────────────
  async function handleSalvar() {
    if (!novoNome.trim()) { setErroNovo('Nome é obrigatório.'); return }
    setSalvando(true); setErroNovo('')
    try {
      const c = await clientesApi.create({
        nome:     novoNome.trim(),
        telefone: novoTels.find(t => t.trim())   || null,
        cpf:      novoCPF.trim()                 || null,
        email:    novoEmails.find(e => e.trim()) || null,
      })
      onSelect(c)
    } catch (e: any) {
      setErroNovo(e?.response?.data?.error ?? 'Erro ao cadastrar. Verifique os dados e tente novamente.')
      setSalvando(false)
    }
  }

  function voltar() {
    setView('search')
    setErroNovo('')
    setTimeout(() => searchRef.current?.focus(), 60)
  }

  // ── Shared header ─────────────────────────────────────────────────────────
  const header = (
    <div className="shrink-0 px-5 py-4 border-b border-ocean-depth flex items-center justify-between">
      <div>
        <h3 className="text-sea-foam font-semibold text-base">
          {view === 'search' ? 'Vincular Cliente' : 'Cadastrar Novo Cliente'}
        </h3>
        {autoAberto && view === 'search' && (
          <p className="text-steel text-xs mt-0.5">
            Vincule um cliente para registrar cashback e histórico
          </p>
        )}
      </div>
      <button
        onClick={onClose}
        className="w-11 h-11 flex items-center justify-center text-steel hover:text-sea-foam text-2xl rounded-xl hover:bg-ocean-depth transition-colors"
      >×</button>
    </div>
  )

  // ─────────────────────────────────────────────────────────────────────────
  // SEARCH VIEW
  // ─────────────────────────────────────────────────────────────────────────
  if (view === 'search') return (
    <div className="fixed inset-0 bg-midnight/85 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-deep-ocean border border-ocean-depth rounded-2xl w-full max-w-lg flex flex-col shadow-2xl"
        style={{ maxHeight: '88vh' }}
        onClick={e => e.stopPropagation()}
      >
        {header}

        {/* Search input */}
        <div className="shrink-0 p-4 border-b border-ocean-depth">
          <GInput
            ref={searchRef}
            type="text"
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="Nome, CPF ou telefone..."
          />
        </div>

        {/* Results list */}
        <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-2">
          {buscando && (
            <div className="flex justify-center py-10">
              <div className="w-6 h-6 border-2 border-electric-cyan border-t-transparent rounded-full animate-spin" />
            </div>
          )}

          {!buscando && !q && (
            <div className="flex flex-col items-center py-8 gap-2 opacity-40">
              <span className="text-4xl">🔍</span>
              <p className="text-steel text-sm">Digite para buscar</p>
            </div>
          )}

          {!buscando && q && clientes.length === 0 && (
            <div className="flex flex-col items-center py-8 gap-3">
              <p className="text-steel text-sm">Nenhum resultado para <strong className="text-sea-foam">"{q}"</strong></p>
            </div>
          )}

          {clientes.map(c => (
            <button
              key={c.id}
              onClick={() => onSelect(c)}
              className="flex items-center gap-3 px-4 py-3 bg-midnight border border-ocean-depth rounded-2xl text-left hover:border-electric-cyan active:bg-ocean-depth transition-colors"
            >
              <div className="w-11 h-11 rounded-full bg-ocean-depth flex items-center justify-center shrink-0">
                <span className="text-sea-foam font-semibold">{c.nome.charAt(0).toUpperCase()}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sea-foam font-medium text-sm truncate">{c.nome}</p>
                <p className="text-steel text-xs truncate">
                  {[c.cpf, c.telefone, c.email].filter(Boolean).join(' · ') || 'Sem contato'}
                </p>
              </div>
              {Number(c.saldo_cashback) > 0 && (
                <div className="shrink-0 text-right">
                  <p className="text-mint-green text-xs font-semibold">R$ {Number(c.saldo_cashback).toFixed(2)}</p>
                  <p className="text-steel text-[10px]">cashback</p>
                </div>
              )}
            </button>
          ))}
        </div>

        {/* Footer — always visible */}
        <div className="shrink-0 px-4 pt-2 pb-4 border-t border-ocean-depth flex flex-col gap-2">
          <button
            onClick={() => setView('novo')}
            className="w-full min-h-[52px] bg-electric-cyan text-midnight rounded-2xl text-sm font-bold active:scale-[0.98] transition-transform"
          >
            + Cadastrar Novo Cliente
          </button>
          {autoAberto && (
            <button
              onClick={onClose}
              className="w-full min-h-[48px] border border-ocean-depth text-steel rounded-xl text-sm hover:text-sea-foam transition-colors"
            >
              Continuar sem vincular
            </button>
          )}
        </div>
      </div>
    </div>
  )

  // ─────────────────────────────────────────────────────────────────────────
  // REGISTRATION FORM VIEW
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 bg-midnight/85 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-deep-ocean border border-ocean-depth rounded-2xl w-full max-w-lg flex flex-col shadow-2xl"
        style={{ maxHeight: '88vh' }}
        onClick={e => e.stopPropagation()}
      >
        {header}

        <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-4">

          {/* Name — required */}
          <div>
            <label style={LBL}>Nome <span style={{ color: 'rgba(248,113,113,0.9)' }}>*</span></label>
            <GInput
              ref={nomeRef}
              type="text"
              value={novoNome}
              onChange={e => setNovoNome(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSalvar()}
              placeholder="Nome completo do cliente"
            />
          </div>

          {/* CPF */}
          <div>
            <label style={LBL}>CPF</label>
            <GInput
              type="text"
              value={novoCPF}
              onChange={e => setNovoCPF(e.target.value)}
              placeholder="000.000.000-00"
            />
          </div>

          {/* Phones — dynamic list */}
          <div>
            <label style={LBL}>Telefone / WhatsApp</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {novoTels.map((tel, i) => (
                <div key={i} style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                  <GInput
                    type="tel"
                    value={tel}
                    onChange={e => setNovoTels(prev => prev.map((x, xi) => xi === i ? e.target.value : x))}
                    placeholder="(00) 00000-0000"
                    style={{ flex: 1 }}
                  />
                  {novoTels.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setNovoTels(prev => prev.filter((_, xi) => xi !== i))}
                      style={{ color: 'rgba(255,255,255,0.3)', fontSize: '18px', width: '28px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'none', border: 'none', cursor: 'pointer' }}
                    >×</button>
                  )}
                </div>
              ))}
              {novoTels.length < 3 && (
                <button
                  type="button"
                  onClick={() => setNovoTels(prev => [...prev, ''])}
                  style={{ fontSize: '12px', color: 'rgba(0,239,255,0.7)', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                >
                  + Adicionar telefone
                </button>
              )}
            </div>
          </div>

          {/* Emails — dynamic list */}
          <div>
            <label style={LBL}>E-mail</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {novoEmails.map((email, i) => (
                <div key={i} style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                  <GInput
                    type="email"
                    value={email}
                    onChange={e => setNovoEmails(prev => prev.map((x, xi) => xi === i ? e.target.value : x))}
                    placeholder="cliente@email.com"
                    style={{ flex: 1 }}
                  />
                  {novoEmails.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setNovoEmails(prev => prev.filter((_, xi) => xi !== i))}
                      style={{ color: 'rgba(255,255,255,0.3)', fontSize: '18px', width: '28px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'none', border: 'none', cursor: 'pointer' }}
                    >×</button>
                  )}
                </div>
              ))}
              {novoEmails.length < 3 && (
                <button
                  type="button"
                  onClick={() => setNovoEmails(prev => [...prev, ''])}
                  style={{ fontSize: '12px', color: 'rgba(0,239,255,0.7)', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                >
                  + Adicionar e-mail
                </button>
              )}
            </div>
          </div>

          {erroNovo && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3">
              <p className="text-red-400 text-sm">{erroNovo}</p>
            </div>
          )}
        </div>

        {/* Form footer — always visible */}
        <div className="shrink-0 px-5 pb-5 pt-3 border-t border-ocean-depth flex flex-col gap-3">
          <button
            onClick={handleSalvar}
            disabled={salvando || !novoNome.trim()}
            className="w-full min-h-[56px] bg-electric-cyan text-midnight rounded-2xl font-bold text-sm disabled:opacity-40 active:scale-[0.98] transition-transform"
          >
            {salvando ? 'Salvando...' : 'Salvar e Associar'}
          </button>
          <button
            onClick={voltar}
            disabled={salvando}
            className="w-full min-h-[52px] border border-ocean-depth text-steel rounded-2xl text-sm hover:border-teal-current hover:text-sea-foam active:bg-ocean-depth transition-colors disabled:opacity-40"
          >
            ← Voltar à Busca
          </button>
        </div>
      </div>
    </div>
  )
}
