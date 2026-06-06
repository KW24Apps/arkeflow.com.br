'use client'

import { useEffect, useRef, useState } from 'react'
import { clientesApi, type Cliente } from '@/lib/api/clientes'

interface Props {
  open:           boolean
  onClose:        () => void
  onSelect:       (cliente: Cliente) => void
  // When true (auto-triggered by first item), shows "Continuar sem cliente"
  autoAberto?:    boolean
}

type View = 'search' | 'novo'

export function CustomerSearchModal({ open, onClose, onSelect, autoAberto }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)

  const [view,       setView]       = useState<View>('search')
  const [q,          setQ]          = useState('')
  const [clientes,   setClientes]   = useState<Cliente[]>([])
  const [buscando,   setBuscando]   = useState(false)

  // Quick-add form
  const [novoNome,   setNovoNome]   = useState('')
  const [novoTel,    setNovoTel]    = useState('')
  const [novoCPF,    setNovoCPF]    = useState('')
  const [novoEmail,  setNovoEmail]  = useState('')
  const [salvando,   setSalvando]   = useState(false)
  const [erroNovo,   setErroNovo]   = useState('')

  // ── Reset on open ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!open) return
    setView('search'); setQ(''); setClientes([])
    setNovoNome(''); setNovoTel(''); setNovoCPF(''); setNovoEmail(''); setErroNovo('')
    setTimeout(() => inputRef.current?.focus(), 80)
  }, [open])

  // ── Debounced search ─────────────────────────────────────────────────────
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

  // ── ESC to close ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  // ── Quick-add submit ──────────────────────────────────────────────────────
  async function handleNovoCliente() {
    if (!novoNome.trim()) { setErroNovo('Nome é obrigatório.'); return }
    setSalvando(true); setErroNovo('')
    try {
      const c = await clientesApi.create({
        nome:     novoNome.trim(),
        telefone: novoTel.trim()  || null,
        cpf:      novoCPF.trim()  || null,
        email:    novoEmail.trim() || null,
      })
      onSelect(c)
    } catch (e: any) {
      setErroNovo(e?.response?.data?.error ?? 'Erro ao cadastrar cliente.')
      setSalvando(false)
    }
  }

  return (
    <div
      className="fixed inset-0 bg-midnight/85 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-deep-ocean border border-ocean-depth rounded-2xl w-full max-w-md flex flex-col shadow-2xl"
        style={{ maxHeight: '80vh' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="shrink-0 px-5 py-4 border-b border-ocean-depth flex items-center justify-between">
          <div>
            <h3 className="text-sea-foam font-semibold">
              {view === 'search' ? 'Vincular Cliente' : 'Cadastrar Novo Cliente'}
            </h3>
            {autoAberto && view === 'search' && (
              <p className="text-steel text-xs mt-0.5">Primeiro item adicionado — vincule um cliente para cashback</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 flex items-center justify-center text-steel hover:text-sea-foam text-xl rounded-xl hover:bg-ocean-depth transition-colors"
          >×</button>
        </div>

        {/* ── SEARCH VIEW ─────────────────────────────────────────────────── */}
        {view === 'search' && (
          <>
            <div className="shrink-0 p-4 border-b border-ocean-depth">
              <input
                ref={inputRef}
                type="text"
                value={q}
                onChange={e => setQ(e.target.value)}
                placeholder="Buscar por nome, CPF ou e-mail..."
                className="w-full min-h-[48px] bg-midnight border border-ocean-depth rounded-xl px-4 text-sm text-sea-foam placeholder-steel/60 outline-none focus:border-electric-cyan"
              />
            </div>

            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2">
              {buscando && (
                <div className="flex justify-center py-8">
                  <div className="w-6 h-6 border-2 border-electric-cyan border-t-transparent rounded-full animate-spin" />
                </div>
              )}

              {!buscando && q && clientes.length === 0 && (
                <div className="flex flex-col items-center py-8 gap-3">
                  <p className="text-steel text-sm">Nenhum cliente encontrado para "{q}"</p>
                  <button
                    onClick={() => setView('novo')}
                    className="min-h-[48px] px-6 bg-electric-cyan text-midnight rounded-xl text-sm font-semibold"
                  >
                    + Cadastrar novo cliente
                  </button>
                </div>
              )}

              {!buscando && !q && (
                <div className="flex flex-col items-center py-6 gap-2 opacity-50">
                  <span className="text-3xl">🔍</span>
                  <p className="text-steel text-sm">Digite para buscar</p>
                </div>
              )}

              {clientes.map(c => (
                <button
                  key={c.id}
                  onClick={() => onSelect(c)}
                  className="flex items-center gap-3 p-4 bg-midnight border border-ocean-depth rounded-2xl text-left hover:border-electric-cyan active:bg-ocean-depth transition-colors"
                >
                  <div className="w-10 h-10 rounded-full bg-ocean-depth flex items-center justify-center shrink-0">
                    <span className="text-sea-foam font-semibold text-sm">{c.nome.charAt(0).toUpperCase()}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sea-foam font-medium text-sm truncate">{c.nome}</p>
                    <p className="text-steel text-xs">
                      {[c.telefone, c.cpf, c.email].filter(Boolean).join(' · ') || 'Sem contato cadastrado'}
                    </p>
                  </div>
                  {Number(c.saldo_cashback) > 0 && (
                    <div className="shrink-0 text-right">
                      <p className="text-mint-green text-xs font-medium">R$ {Number(c.saldo_cashback).toFixed(2)}</p>
                      <p className="text-steel text-[10px]">cashback</p>
                    </div>
                  )}
                </button>
              ))}

              {clientes.length > 0 && (
                <button
                  onClick={() => setView('novo')}
                  className="min-h-[44px] border border-ocean-depth text-steel text-sm rounded-xl hover:border-electric-cyan hover:text-electric-cyan transition-colors mt-1"
                >
                  + Cadastrar novo cliente
                </button>
              )}
            </div>

            {/* Footer: continuar sem cliente (only if auto-opened) */}
            {autoAberto && (
              <div className="shrink-0 px-4 pb-4 pt-2 border-t border-ocean-depth">
                <button
                  onClick={onClose}
                  className="w-full min-h-[48px] border border-ocean-depth text-steel rounded-xl text-sm hover:text-sea-foam transition-colors"
                >
                  Continuar sem vincular cliente
                </button>
              </div>
            )}
          </>
        )}

        {/* ── QUICK-ADD VIEW ───────────────────────────────────────────────── */}
        {view === 'novo' && (
          <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-3">
            <button
              onClick={() => setView('search')}
              className="text-electric-cyan text-xs self-start hover:underline"
            >
              ← Voltar à busca
            </button>

            <div>
              <label className="text-steel text-xs block mb-1">Nome *</label>
              <input
                type="text" value={novoNome} onChange={e => setNovoNome(e.target.value)}
                autoFocus
                placeholder="Nome completo"
                className="w-full min-h-[48px] bg-midnight border border-ocean-depth rounded-xl px-4 text-sea-foam text-sm outline-none focus:border-electric-cyan"
              />
            </div>

            <div>
              <label className="text-steel text-xs block mb-1">Telefone</label>
              <input
                type="tel" value={novoTel} onChange={e => setNovoTel(e.target.value)}
                placeholder="(00) 00000-0000"
                className="w-full min-h-[48px] bg-midnight border border-ocean-depth rounded-xl px-4 text-sea-foam text-sm outline-none focus:border-electric-cyan"
              />
            </div>

            <div className="flex gap-3">
              <div className="flex-1">
                <label className="text-steel text-xs block mb-1">CPF</label>
                <input
                  type="text" value={novoCPF} onChange={e => setNovoCPF(e.target.value)}
                  placeholder="000.000.000-00"
                  className="w-full min-h-[48px] bg-midnight border border-ocean-depth rounded-xl px-4 text-sea-foam text-sm outline-none focus:border-electric-cyan"
                />
              </div>
              <div className="flex-1">
                <label className="text-steel text-xs block mb-1">E-mail</label>
                <input
                  type="email" value={novoEmail} onChange={e => setNovoEmail(e.target.value)}
                  placeholder="email@exemplo.com"
                  className="w-full min-h-[48px] bg-midnight border border-ocean-depth rounded-xl px-4 text-sea-foam text-sm outline-none focus:border-electric-cyan"
                />
              </div>
            </div>

            {erroNovo && <p className="text-red-400 text-sm">{erroNovo}</p>}

            <button
              onClick={handleNovoCliente}
              disabled={salvando || !novoNome.trim()}
              className="min-h-[52px] bg-electric-cyan text-midnight rounded-2xl font-bold text-sm disabled:opacity-40 mt-1"
            >
              {salvando ? 'Cadastrando...' : 'Cadastrar e Vincular'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
