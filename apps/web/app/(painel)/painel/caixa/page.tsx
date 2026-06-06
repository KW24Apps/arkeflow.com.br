'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { User, Briefcase, ShoppingBag, Home, ArrowUp, ArrowDown, Lock, X, Search } from 'lucide-react'
import { TopBar } from '@/components/layout/TopBar'
import { useCaixaStore } from '@/store/caixa.store'
import { usePDVStore } from '@/store/pdv.store'
import { useAuthStore } from '@/store/auth.store'
import { api } from '@/lib/api/client'
import { clientesApi } from '@/lib/api/clientes'
import { promocoesApi } from '@/lib/api/promocoes'
import { calcularDescontos } from '@/lib/calcularDesconto'
import { AdvancedSearchModal } from '@/components/pdv/AdvancedSearchModal'
import { CheckoutModal, type CheckoutResult } from '@/components/pdv/CheckoutModal'
import { CustomerSearchModal } from '@/components/pdv/CustomerSearchModal'
import { SalespersonSearchModal } from '@/components/pdv/SalespersonSearchModal'
import { SacolasModal }           from '@/components/pdv/SacolasModal'
import type { Cliente } from '@/lib/api/clientes'
import type { Colaborador } from '@/lib/api/colaboradores'

interface ProdutoSearch { id: string; nome: string; preco_base: string; total_versoes: number }

function CaixaRow({ icon, label, onClick, danger }: { icon: React.ReactNode; label: string; onClick: () => void; danger?: boolean }) {
  const [hov, setHov] = useState(false)
  const color = danger
    ? (hov ? 'rgba(240,100,100,0.9)' : 'rgba(240,100,100,0.6)')
    : (hov ? 'rgba(255,255,255,0.75)' : 'rgba(255,255,255,0.45)')
  return (
    <button onClick={onClick} onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{ display: 'flex', alignItems: 'center', gap: '7px', padding: '8px 0', fontSize: '12px', color, background: 'none', border: 'none', cursor: 'pointer', width: '100%', textAlign: 'left', transition: 'color 0.12s' }}>
      <span style={{ display: 'flex', alignItems: 'center', color: 'inherit', flexShrink: 0 }}>{icon}</span>
      {label}
    </button>
  )
}

// Parses "3-7891234" → { qty: 3, query: "7891234" }
function parseQtyPrefix(input: string): { qty: number; query: string } {
  const m = input.match(/^(\d+)-(.+)$/)
  return m ? { qty: parseInt(m[1], 10), query: m[2].trim() } : { qty: 1, query: input }
}

// ─────────────────────────────────────────────────────────────────────────────

export default function CaixaPage() {
  const router = useRouter()
  const { status, carregando: cxLoad, erro: cxErro, carregar, abrir, fechar, registrarMovimento, limparErro } = useCaixaStore()
  const { itens, cliente_id, cliente_nome, addItem, addItemQtd, removeItem, setQtd, setCliente, limpar } = usePDVStore()
  const usuario = useAuthStore(s => s.usuario)

  // ── Abertura ──────────────────────────────────────────────────────────────
  const [saldoInicial, setSaldoInicial] = useState('')
  const [obsAbertura,  setObsAbertura]  = useState('')
  const [abrindo,      setAbrindo]      = useState(false)

  // ── Scanner / busca ───────────────────────────────────────────────────────
  const scanRef      = useRef<HTMLInputElement>(null)
  const [scan,            setScan]           = useState('')
  const [resultados,      setResultados]     = useState<ProdutoSearch[]>([])
  const [highlightedIndex,setHighlightedIndex] = useState(-1)
  const [scanErro,        setScanErro]       = useState('')
  const [modalBusca,      setModalBusca]     = useState(false)

  // ── Promoções + cliente ───────────────────────────────────────────────────
  const [promocoes,   setPromocoes]   = useState<any[]>([])
  const [clienteInfo, setClienteInfo] = useState<any>(null)
  const [usarCB,      setUsarCB]      = useState(false)

  // ── Modais ────────────────────────────────────────────────────────────────
  const [modalCheckout, setModalCheckout] = useState(false)
  const [vendaOK,       setVendaOK]       = useState<CheckoutResult | null>(null)
  const [modalCliente,     setModalCliente]     = useState(false)
  const [clienteAutoAberto,setClienteAutoAberto] = useState(false)
  const autoOpenedRef = useRef(false)

  const [modalVendedor,    setModalVendedor]    = useState(false)
  const [vendedor,         setVendedor]         = useState<Colaborador | null>(null)
  const [modalSacolas,     setModalSacolas]     = useState(false)

  const [modalMov,   setModalMov]    = useState<'sangria' | 'suprimento' | null>(null)
  const [valorMov,   setValorMov]    = useState('')
  const [motivoMov,  setMotivoMov]   = useState('')
  const [modalFechar,setModalFechar] = useState(false)
  const [saldoFinal, setSaldoFinal]  = useState('')
  const [obsFech,    setObsFech]     = useState('')
  const [salvMov,    setSalvMov]     = useState(false)

  // ── Init ──────────────────────────────────────────────────────────────────
  useEffect(() => { carregar() }, [])

  useEffect(() => {
    if (status !== 'aberto') return
    promocoesApi.list(false).then(setPromocoes).catch(() => {})
    setTimeout(() => scanRef.current?.focus(), 150)
  }, [status])

  useEffect(() => {
    if (cliente_id) clientesApi.get(cliente_id).then(setClienteInfo).catch(() => {})
    else { setClienteInfo(null); setUsarCB(false) }
  }, [cliente_id])

  // Auto-open customer modal on first item (once per transaction)
  useEffect(() => {
    if (status !== 'aberto') return
    if (itens.length === 0) { autoOpenedRef.current = false; return }
    if (itens.length > 0 && !cliente_id && !autoOpenedRef.current) {
      autoOpenedRef.current = true
      setClienteAutoAberto(true)
      setModalCliente(true)
    }
  }, [itens.length, cliente_id, status])

  function handleClienteSelecionado(c: Cliente) {
    setCliente(c.id, c.nome)
    setModalCliente(false)
    setTimeout(() => scanRef.current?.focus(), 100)
  }

  // ── Cálculos ──────────────────────────────────────────────────────────────
  const { itensComDesconto, totalDesconto } = calcularDescontos(itens, promocoes, !clienteInfo?.total_compras, {})
  const subtotal     = itens.reduce((s, i) => s + i.preco_unitario * i.quantidade, 0)
  const cashbackDisp = clienteInfo ? Number(clienteInfo.saldo_cashback) : 0
  const cashbackUsar = usarCB ? Math.min(cashbackDisp, subtotal - totalDesconto) : 0
  const baseTotal    = Math.max(0, subtotal - totalDesconto - cashbackUsar)

  // ── Scanner ───────────────────────────────────────────────────────────────
  async function buscarBarcode(codigo: string, qty: number) {
    try {
      const { data } = await api.get<any>(`/produtos/barcode/${encodeURIComponent(codigo)}`)
      const preco = data.preco_especifico ? parseFloat(data.preco_especifico) : parseFloat(data.preco_base)
      const item  = { versao_id: data.versao_id ?? codigo, produto_id: data.produto_id, nome: data.produto_nome, atributos: data.atributos_json ?? {}, preco_unitario: preco, codigo_barras: data.codigo_barras }
      qty > 1 ? addItemQtd(item, qty) : addItem(item)
      setScanErro(''); return true
    } catch { return false }
  }

  async function buscarTexto(rawInput: string) {
    const { query } = parseQtyPrefix(rawInput)
    if (!query.trim()) { setResultados([]); setHighlightedIndex(-1); return }
    try {
      const { data } = await api.get<ProdutoSearch[]>(`/produtos?q=${encodeURIComponent(query)}&todos=false`)
      setResultados(data)
      setHighlightedIndex(-1)
    } catch {}
  }

  async function onScanKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    const dropdownOpen = resultados.length > 0

    // ── Arrow navigation ────────────────────────────────────────────────────
    if (e.key === 'ArrowDown') {
      if (!dropdownOpen) return
      e.preventDefault()
      setHighlightedIndex(i => Math.min(i + 1, resultados.length - 1))
      return
    }
    if (e.key === 'ArrowUp') {
      if (!dropdownOpen) return
      e.preventDefault()
      setHighlightedIndex(i => Math.max(i - 1, 0))
      return
    }
    if (e.key === 'Escape') {
      setResultados([]); setHighlightedIndex(-1); return
    }

    // ── Enter ───────────────────────────────────────────────────────────────
    if (e.key !== 'Enter') return
    e.preventDefault()

    // If a dropdown item is highlighted, select it
    if (dropdownOpen && highlightedIndex >= 0) {
      const produto = resultados[highlightedIndex]
      setResultados([]); setHighlightedIndex(-1)
      await selecionarProduto(produto)
      return
    }

    // Otherwise treat as barcode / text search confirm
    const raw = scan.trim(); if (!raw) return
    const { qty, query } = parseQtyPrefix(raw)
    setResultados([]); setHighlightedIndex(-1)
    const found = await buscarBarcode(query, qty)
    if (!found) setScanErro(`"${query}" não encontrado.${qty > 1 ? ` (qty: ${qty})` : ''}`)
    setScan(''); scanRef.current?.focus()
  }

  async function selecionarProduto(p: ProdutoSearch) {
    const { qty } = parseQtyPrefix(scan)
    try {
      const { data } = await api.get<any>(`/produtos/${p.id}`)
      if (data.versoes?.length === 1) {
        const v = data.versoes[0]
        const preco = v.preco_especifico ? parseFloat(v.preco_especifico) : parseFloat(data.preco_base)
        const item  = { versao_id: v.id, produto_id: p.id, nome: p.nome, atributos: v.atributos_json, preco_unitario: preco, codigo_barras: v.codigo_barras }
        qty > 1 ? addItemQtd(item, qty) : addItem(item)
        setResultados([]); setScan('')
      }
    } catch {}
    scanRef.current?.focus()
  }

  // ── Abertura ──────────────────────────────────────────────────────────────
  async function handleAbrir() {
    setAbrindo(true)
    try { await abrir(parseFloat(saldoInicial) || 0, obsAbertura || undefined) }
    finally { setAbrindo(false) }
  }

  // ── Gestão caixa ──────────────────────────────────────────────────────────
  async function handleMovimento() {
    const val = parseFloat(valorMov)
    if (!val || val <= 0 || !modalMov) return
    setSalvMov(true)
    try { await registrarMovimento(modalMov, val, motivoMov || undefined); setModalMov(null); setValorMov(''); setMotivoMov('') }
    finally { setSalvMov(false) }
  }

  async function handleFechar() {
    setSalvMov(true)
    try { await fechar(parseFloat(saldoFinal) || 0, obsFech || undefined); setModalFechar(false) }
    finally { setSalvMov(false) }
  }

  function handleVendaOK(r: CheckoutResult) {
    setModalCheckout(false)
    setVendaOK(r)
    limpar()
    setVendedor(null)
    autoOpenedRef.current = false
  }

  function novaVenda() {
    setVendaOK(null)
    setTimeout(() => scanRef.current?.focus(), 100)
  }

  const fmt    = (v?: number | string | null) => `R$ ${Number(v ?? 0).toFixed(2)}`
  const nomeOp = (usuario as any)?.nome || (usuario as any)?.username || 'Operador'
  const primeiroNome = nomeOp.split(' ')[0]
  const totalQtd = itens.reduce((s, i) => s + i.quantidade, 0)

  const MOD: React.CSSProperties = { background: 'rgba(8,18,30,0.52)', border: '0.5px solid rgba(255,255,255,0.09)', borderRadius: '10px', padding: '12px', flexShrink: 0 }
  const MOD_LABEL: React.CSSProperties = { fontSize: '9px', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.1em', display: 'block', marginBottom: '10px' }

  // ── LOADING ───────────────────────────────────────────────────────────────
  if (cxLoad && status === 'desconhecido') return (
    <>
      <TopBar />
      <main className="flex-1 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-electric-cyan border-t-transparent rounded-full animate-spin" />
      </main>
    </>
  )

  // ── CAIXA FECHADO ─────────────────────────────────────────────────────────
  if (status !== 'aberto') return (
    <>
      <TopBar />
      <main className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-sm bg-deep-ocean border border-ocean-depth rounded-2xl p-8 flex flex-col gap-5">
          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-ocean-depth flex items-center justify-center mx-auto mb-3">
              <span className="text-3xl">🔒</span>
            </div>
            <h2 className="text-sea-foam font-bold text-lg">Caixa fechado</h2>
            <p className="text-steel text-sm mt-1">Informe o saldo inicial para abrir o turno.</p>
          </div>
          {cxErro && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 flex items-center justify-between">
              <p className="text-red-400 text-sm">{cxErro}</p>
              <button onClick={limparErro} className="text-red-400 ml-2">×</button>
            </div>
          )}
          <div className="flex flex-col gap-3">
            <div>
              <label className="text-steel text-xs block mb-1">Saldo inicial em dinheiro</label>
              <input type="number" min="0" step="0.01" value={saldoInicial}
                onChange={e => setSaldoInicial(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAbrir()}
                placeholder="R$ 0,00" autoFocus
                className="w-full min-h-[48px] bg-midnight border border-ocean-depth rounded-xl px-4 text-sea-foam text-sm outline-none focus:border-electric-cyan" />
            </div>
            <div>
              <label className="text-steel text-xs block mb-1">Observação (opcional)</label>
              <input type="text" value={obsAbertura} onChange={e => setObsAbertura(e.target.value)}
                placeholder="Ex: abertura do dia"
                className="w-full min-h-[44px] bg-midnight border border-ocean-depth rounded-xl px-4 text-sea-foam text-sm outline-none focus:border-electric-cyan" />
            </div>
            <button onClick={handleAbrir} disabled={abrindo}
              className="min-h-[52px] bg-electric-cyan text-midnight rounded-2xl font-bold text-sm disabled:opacity-40">
              {abrindo ? 'Abrindo...' : 'Abrir Caixa'}
            </button>
          </div>
        </div>
      </main>
    </>
  )

  // ── PDV ATIVO ─────────────────────────────────────────────────────────────
  return (
    <>
      <TopBar />
      <div className="flex flex-col flex-1 overflow-hidden min-h-0">

      {/* Split panel */}
      <div className="relative flex flex-1 overflow-hidden">
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(8,20,35,0.45)', backdropFilter: 'blur(2px)', pointerEvents: 'none', zIndex: 0 }} />

        {/* ── ESQUERDA: Itens ────────────────────────────────────────────── */}
        <div className="relative z-[1] flex flex-col flex-1 min-w-0 border-r border-ocean-depth overflow-hidden">

          {/* Lista */}
          <div className="flex-1 overflow-y-auto">
            {itens.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full gap-3 opacity-40">
                <span className="text-5xl">🛒</span>
                <p className="text-steel text-sm">Escaneie ou busque um produto</p>
                <p className="text-steel text-xs">Dica: use "3-código" para adicionar 3 unidades</p>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-midnight">
                  <tr className="border-b border-ocean-depth">
                    <th className="text-left px-4 py-2 text-steel text-xs font-medium">Item</th>
                    <th className="text-center px-3 py-2 text-steel text-xs font-medium w-28">Qtd</th>
                    <th className="text-right px-3 py-2 text-steel text-xs font-medium w-24 hidden md:table-cell">Unit.</th>
                    <th className="text-right px-4 py-2 text-steel text-xs font-medium w-28">Total</th>
                    <th className="w-10" />
                  </tr>
                </thead>
                <tbody>
                  {itensComDesconto.map(item => {
                    const label = Object.values(item.atributos).join(' / ') || 'Versão única'
                    return (
                      <tr key={item.versao_id} className="border-b border-ocean-depth/50 hover:bg-deep-ocean/50">
                        <td className="px-4 py-3">
                          <p className="text-sea-foam font-medium truncate max-w-[200px]">{item.nome}</p>
                          <p className="text-steel text-xs">{label}</p>
                          {item.desconto_item > 0 && (
                            <p className="text-mint-green text-xs">−{fmt(item.desconto_item)} promo</p>
                          )}
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex items-center justify-center gap-1">
                            <button onClick={() => setQtd(item.versao_id, item.quantidade - 1)}
                              className="w-7 h-7 bg-ocean-depth rounded-lg text-sea-foam font-bold flex items-center justify-center">−</button>
                            <span className="text-sea-foam font-semibold w-7 text-center">{item.quantidade}</span>
                            <button onClick={() => setQtd(item.versao_id, item.quantidade + 1)}
                              className="w-7 h-7 bg-ocean-depth rounded-lg text-sea-foam font-bold flex items-center justify-center">+</button>
                          </div>
                        </td>
                        <td className="px-3 py-3 text-right text-steel hidden md:table-cell">{fmt(item.preco_unitario)}</td>
                        <td className="px-4 py-3 text-right text-sea-foam font-semibold">
                          {fmt(item.preco_unitario * item.quantidade - item.desconto_item)}
                        </td>
                        <td className="pr-2">
                          <button onClick={() => removeItem(item.versao_id)}
                            className="w-8 h-8 text-steel hover:text-red-400 rounded-lg flex items-center justify-center">×</button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* Input scanner */}
          <div className="shrink-0 p-3 border-t border-ocean-depth bg-midnight relative">
            {scanErro && <p className="text-red-400 text-xs mb-2 text-center">{scanErro}</p>}
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.25)', pointerEvents: 'none' }} />
                <input
                  ref={scanRef}
                  value={scan}
                  onChange={e => { setScan(e.target.value); buscarTexto(e.target.value); setScanErro('') }}
                  onKeyDown={onScanKeyDown}
                  onBlur={e => {
                    const next = e.relatedTarget as HTMLElement | null
                    if (next && (next.tagName === 'SELECT' || next.tagName === 'BUTTON' || next.tagName === 'INPUT' || next.closest('[data-no-refocus]'))) return
                    if (!modalBusca && !modalCheckout) setTimeout(() => scanRef.current?.focus(), 250)
                  }}
                  placeholder='Código de barras, nome... ou "3-código" para qty 3'
                  autoComplete="off"
                  className="w-full min-h-[48px] bg-deep-ocean border border-ocean-depth rounded-xl pl-[34px] pr-4 text-sm text-sea-foam placeholder-steel/50 outline-none focus:border-electric-cyan"
                />
              </div>
              <button
                onClick={() => { setModalBusca(true); setScan(''); setResultados([]) }}
                title="Busca avançada"
                className="min-w-[48px] min-h-[48px] bg-deep-ocean border border-ocean-depth rounded-xl text-steel hover:border-electric-cyan hover:text-electric-cyan transition-colors flex items-center justify-center text-lg"
              >🔍</button>
            </div>

            {/* Autocomplete dropdown */}
            {resultados.length > 0 && (
              <div className="absolute bottom-full mb-1 left-3 right-3 z-20 bg-deep-ocean border border-ocean-depth rounded-xl overflow-hidden shadow-xl">
                {resultados.slice(0, 6).map((p, idx) => (
                  <button key={p.id} onClick={() => selecionarProduto(p)}
                    className={`w-full flex items-center justify-between px-4 py-3 border-b border-ocean-depth last:border-0 text-left transition-colors ${
                      idx === highlightedIndex
                        ? 'bg-electric-cyan/15 border-l-2 border-l-electric-cyan'
                        : 'hover:bg-ocean-depth'
                    }`}>
                    <div>
                      <p className={`text-sm font-medium ${idx === highlightedIndex ? 'text-electric-cyan' : 'text-sea-foam'}`}>{p.nome}</p>
                      <p className="text-steel text-xs">{p.total_versoes} var.</p>
                    </div>
                    <p className="text-electric-cyan text-sm font-semibold">{fmt(parseFloat(p.preco_base))}</p>
                  </button>
                ))}
                <p className="text-steel text-[10px] text-center py-1.5">↑↓ navegar · Enter selecionar · Esc fechar</p>
              </div>
            )}
          </div>
        </div>

        {/* ── DIREITA: Glass Sidebar ──────────────────────────────────────── */}
        <div
          className="relative z-[1] hidden md:flex flex-col shrink-0 overflow-y-auto"
          style={{ width: '240px', gap: '8px', padding: '10px', borderLeft: '0.5px solid rgba(255,255,255,0.06)' }}
          data-no-refocus
        >
          {vendaOK ? (
            <div className="flex-1 flex flex-col items-center justify-center p-6 gap-4 text-center">
              <div className="w-16 h-16 rounded-full bg-mint-green/20 flex items-center justify-center">
                <span className="text-3xl text-mint-green">✓</span>
              </div>
              <div>
                <p className="text-sea-foam font-bold text-xl">{fmt(vendaOK.total)}</p>
                <p className="text-steel text-sm mt-1">Venda registrada</p>
                {vendaOK.cashback_gerado > 0 && (
                  <p className="text-mint-green text-xs mt-1">+{fmt(vendaOK.cashback_gerado)} cashback</p>
                )}
              </div>
              <button onClick={novaVenda}
                className="min-h-[52px] w-full bg-electric-cyan text-midnight rounded-2xl font-bold text-sm">
                Nova Venda
              </button>
            </div>
          ) : (
            <>
              {/* Module 1 — Total da venda */}
              <div style={MOD}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '6px' }}>
                  <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'rgba(100,220,160,0.9)', flexShrink: 0 }} />
                  <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    Caixa aberto — {primeiroNome}
                  </span>
                </div>
                <div style={{ borderTop: '0.5px solid rgba(255,255,255,0.06)', margin: '10px 0' }} />
                <span style={{ ...MOD_LABEL, marginBottom: '4px' }}>Total da venda</span>
                <p style={{ fontSize: '26px', fontWeight: 700, color: '#0ef', marginTop: '4px', lineHeight: 1.1, marginBottom: 0 }}>
                  R$ {subtotal.toFixed(2)}
                </p>
                <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.2)', margin: 0 }}>
                  {totalQtd} {totalQtd === 1 ? 'item' : 'itens'} · sem desconto
                </p>
              </div>

              {/* Module 2 — Atribuição da venda */}
              <div style={MOD}>
                <span style={MOD_LABEL}>Atribuição da venda</span>
                {/* Cliente */}
                <div
                  role="button"
                  onClick={() => { setClienteAutoAberto(false); setModalCliente(true) }}
                  style={{ background: 'rgba(255,255,255,0.04)', border: '0.5px solid rgba(255,255,255,0.07)', borderRadius: '7px', padding: '8px 10px', marginBottom: '5px', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}
                >
                  <User size={14} style={{ color: 'rgba(255,255,255,0.3)', flexShrink: 0 }} />
                  <span style={{ flex: 1, fontSize: '12px', color: cliente_nome ? 'rgba(255,255,255,0.75)' : 'rgba(255,255,255,0.5)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {cliente_nome ?? 'Adicionar cliente'}
                  </span>
                  {cliente_nome && (
                    <button onClick={e => { e.stopPropagation(); setCliente(null, null) }}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0, flexShrink: 0 }}>
                      <X size={12} />
                    </button>
                  )}
                </div>
                {/* Vendedor */}
                <div
                  role="button"
                  onClick={() => setModalVendedor(true)}
                  style={{ background: 'rgba(255,255,255,0.04)', border: '0.5px solid rgba(255,255,255,0.07)', borderRadius: '7px', padding: '8px 10px', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}
                >
                  <Briefcase size={14} style={{ color: 'rgba(255,255,255,0.3)', flexShrink: 0 }} />
                  <span style={{ flex: 1, fontSize: '12px', color: vendedor ? 'rgba(255,255,255,0.75)' : 'rgba(255,255,255,0.5)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {vendedor ? vendedor.nome : 'Adicionar vendedor'}
                  </span>
                  {vendedor && (
                    <button onClick={e => { e.stopPropagation(); setVendedor(null) }}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0, flexShrink: 0 }}>
                      <X size={12} />
                    </button>
                  )}
                </div>
              </div>

              {/* Module 3 — Gestão do caixa */}
              <div style={MOD}>
                <span style={MOD_LABEL}>Gestão do caixa</span>
                <CaixaRow icon={<ShoppingBag size={13} />} label="Sacolas pendentes"   onClick={() => setModalSacolas(true)} />
                <div style={{ borderBottom: '0.5px solid rgba(255,255,255,0.05)' }} />
                <CaixaRow icon={<Home        size={13} />} label="Provas em Casa"       onClick={() => router.push('/painel/prova-em-casa')} />
                <div style={{ borderBottom: '0.5px solid rgba(255,255,255,0.05)' }} />
                <CaixaRow icon={<ArrowUp     size={13} />} label="Sangria — retirada"   onClick={() => setModalMov('sangria')} />
                <div style={{ borderBottom: '0.5px solid rgba(255,255,255,0.05)' }} />
                <CaixaRow icon={<ArrowDown   size={13} />} label="Suprimento — reforço" onClick={() => setModalMov('suprimento')} />
                <div style={{ borderBottom: '0.5px solid rgba(255,255,255,0.05)' }} />
                <CaixaRow icon={<Lock        size={13} />} label="Fechar caixa"         onClick={() => setModalFechar(true)} danger />
              </div>

              {/* Spacer */}
              <div style={{ flex: 1, minHeight: '8px' }} />

              {/* Module 4 — Finalizar venda */}
              <div style={MOD}>
                <span style={MOD_LABEL}>Finalizar venda</span>
                {itens.length === 0 ? (
                  <button disabled style={{ width: '100%', padding: '12px', background: 'rgba(255,255,255,0.04)', border: '0.5px solid rgba(255,255,255,0.08)', borderRadius: '8px', fontSize: '13px', color: 'rgba(255,255,255,0.25)', cursor: 'default' }}>
                    Sacola vazia
                  </button>
                ) : (
                  <button onClick={() => setModalCheckout(true)} style={{ width: '100%', padding: '12px', background: 'rgba(0,239,255,0.88)', color: '#0a0a1a', fontWeight: 700, borderRadius: '8px', fontSize: '13px', border: 'none', cursor: 'pointer' }}>
                    Fechar venda →
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Modais ────────────────────────────────────────────────────────── */}

      <AdvancedSearchModal
        open={modalBusca}
        onClose={() => { setModalBusca(false); setTimeout(() => scanRef.current?.focus(), 100) }}
        onAddItem={item => { addItem(item); setTimeout(() => scanRef.current?.focus(), 100) }}
      />

      <CustomerSearchModal
        open={modalCliente}
        autoAberto={clienteAutoAberto}
        onClose={() => { setModalCliente(false); setClienteAutoAberto(false); setTimeout(() => scanRef.current?.focus(), 100) }}
        onSelect={handleClienteSelecionado}
      />

      <SalespersonSearchModal
        open={modalVendedor}
        onClose={() => { setModalVendedor(false); setTimeout(() => scanRef.current?.focus(), 100) }}
        onSelect={c => { setVendedor(c); setModalVendedor(false); setTimeout(() => scanRef.current?.focus(), 100) }}
      />

      <SacolasModal
        open={modalSacolas}
        onClose={() => { setModalSacolas(false); setTimeout(() => scanRef.current?.focus(), 100) }}
        onCarregada={() => setTimeout(() => scanRef.current?.focus(), 100)}
      />

      <CheckoutModal
        open={modalCheckout}
        onClose={() => { setModalCheckout(false); setTimeout(() => scanRef.current?.focus(), 100) }}
        onSuccess={handleVendaOK}
        itensComDesconto={itensComDesconto}
        baseTotal={baseTotal}
        totalDesconto={totalDesconto}
        cashbackUsar={cashbackUsar}
        clienteId={cliente_id}
      />

      {/* Modal Sangria / Suprimento */}
      {modalMov && (
        <div className="fixed inset-0 bg-midnight/80 z-50 flex items-center justify-center p-4" onClick={() => setModalMov(null)}>
          <div className="bg-deep-ocean border border-ocean-depth rounded-2xl w-full max-w-lg p-6 flex flex-col gap-4" style={{ maxHeight: '88vh' }} onClick={e => e.stopPropagation()}>
            <h3 className="text-sea-foam font-semibold capitalize">{modalMov}</h3>
            <p className="text-steel text-xs -mt-2">{modalMov === 'sangria' ? 'Retirada de dinheiro do caixa.' : 'Reforço de dinheiro no caixa.'}</p>
            <div>
              <label className="text-steel text-xs block mb-1">Valor (R$)</label>
              <input type="number" min="0.01" step="0.01" value={valorMov}
                onChange={e => setValorMov(e.target.value)} autoFocus
                onKeyDown={e => e.key === 'Enter' && handleMovimento()}
                className="w-full min-h-[48px] bg-midnight border border-ocean-depth rounded-xl px-4 text-sea-foam text-sm outline-none focus:border-electric-cyan" />
            </div>
            <div>
              <label className="text-steel text-xs block mb-1">Motivo (opcional)</label>
              <input type="text" value={motivoMov} onChange={e => setMotivoMov(e.target.value)}
                className="w-full min-h-[44px] bg-midnight border border-ocean-depth rounded-xl px-4 text-sea-foam text-sm outline-none focus:border-electric-cyan" />
            </div>
            <div className="flex gap-3">
              <button onClick={() => setModalMov(null)} className="flex-1 min-h-[44px] border border-ocean-depth text-steel rounded-xl text-sm">Cancelar</button>
              <button onClick={handleMovimento} disabled={salvMov || !valorMov}
                className="flex-1 min-h-[44px] bg-electric-cyan text-midnight rounded-xl text-sm font-semibold disabled:opacity-40">
                {salvMov ? '...' : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Fechar Caixa */}
      {modalFechar && (
        <div className="fixed inset-0 bg-midnight/80 z-50 flex items-center justify-center p-4" onClick={() => setModalFechar(false)}>
          <div className="bg-deep-ocean border border-ocean-depth rounded-2xl w-full max-w-lg p-6 flex flex-col gap-4" style={{ maxHeight: '88vh' }} onClick={e => e.stopPropagation()}>
            <h3 className="text-sea-foam font-semibold">Fechar Caixa</h3>
            <p className="text-steel text-xs -mt-2">Confirme o valor em dinheiro no caixa.</p>
            <div>
              <label className="text-steel text-xs block mb-1">Saldo final contado</label>
              <input type="number" min="0" step="0.01" value={saldoFinal}
                onChange={e => setSaldoFinal(e.target.value)} autoFocus
                className="w-full min-h-[48px] bg-midnight border border-ocean-depth rounded-xl px-4 text-sea-foam text-sm outline-none focus:border-electric-cyan" />
            </div>
            <div>
              <label className="text-steel text-xs block mb-1">Observação (opcional)</label>
              <input type="text" value={obsFech} onChange={e => setObsFech(e.target.value)}
                className="w-full min-h-[44px] bg-midnight border border-ocean-depth rounded-xl px-4 text-sea-foam text-sm outline-none focus:border-electric-cyan" />
            </div>
            <div className="flex gap-3">
              <button onClick={() => setModalFechar(false)} className="flex-1 min-h-[44px] border border-ocean-depth text-steel rounded-xl text-sm">Cancelar</button>
              <button onClick={handleFechar} disabled={salvMov}
                className="flex-1 min-h-[44px] bg-red-500/20 border border-red-500/40 text-red-400 rounded-xl text-sm font-semibold disabled:opacity-40">
                {salvMov ? '...' : 'Fechar Caixa'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
    </>
  )
}
