'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
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

// Parses "3-7891234" → { qty: 3, query: "7891234" }
function parseQtyPrefix(input: string): { qty: number; query: string } {
  const m = input.match(/^(\d+)-(.+)$/)
  return m ? { qty: parseInt(m[1], 10), query: m[2].trim() } : { qty: 1, query: input }
}

// ─────────────────────────────────────────────────────────────────────────────

export default function CaixaPage() {
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
  const totalQtd = itens.reduce((s, i) => s + i.quantidade, 0)

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
    <div className="flex flex-col flex-1 overflow-hidden min-h-0">

      {/* Barra de status mínima */}
      <div className="shrink-0 h-10 bg-deep-ocean border-b border-ocean-depth px-4 flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-mint-green shrink-0" />
        <span className="text-mint-green text-xs font-semibold uppercase tracking-wide">Caixa Aberto</span>
        <span className="text-steel text-xs">— {nomeOp}</span>
      </div>

      {/* Split panel */}
      <div className="flex flex-1 overflow-hidden">

        {/* ── ESQUERDA: Itens ────────────────────────────────────────────── */}
        <div className="flex flex-col flex-1 min-w-0 border-r border-ocean-depth overflow-hidden">

          {/* Header venda */}
          <div className="shrink-0 px-4 py-2 border-b border-ocean-depth flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <span className="text-sea-foam text-sm font-semibold truncate">
                {itens.length === 0 ? 'Nova Venda' : `${totalQtd} item${totalQtd !== 1 ? 'ns' : ''}`}
              </span>
              {cliente_nome && <span className="text-xs text-electric-cyan truncate">· {cliente_nome}</span>}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {cliente_id ? (
                <button onClick={() => setCliente(null, null)} className="text-steel text-xs hover:text-red-400">✕ cliente</button>
              ) : (
                <button className="text-xs text-steel hover:text-sea-foam border border-ocean-depth rounded-lg px-2 py-1">+ Cliente</button>
              )}
              {itens.length > 0 && (
                <button onClick={limpar} className="text-xs text-steel hover:text-red-400">Limpar</button>
              )}
            </div>
          </div>

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
                  className="w-full min-h-[48px] bg-deep-ocean border border-ocean-depth rounded-xl pl-4 pr-4 text-sm text-sea-foam placeholder-steel/50 outline-none focus:border-electric-cyan"
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

        {/* ── DIREITA: Total + Ações ──────────────────────────────────────── */}
        <div className="w-72 xl:w-80 flex flex-col overflow-hidden bg-deep-ocean shrink-0" data-no-refocus>

          {/* Sucesso da venda */}
          {vendaOK && (
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
          )}

          {!vendaOK && (
            <>
              {/* ── Top: total + cashback (scrollable area) ─────────────── */}
              <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-4">
                {/* Total da venda */}
                <div>
                  <p className="text-steel text-xs uppercase tracking-wider mb-1">Total da Venda</p>
                  <p className="text-electric-cyan font-black text-4xl">{fmt(baseTotal)}</p>
                  {(totalDesconto > 0 || cashbackUsar > 0) && (
                    <div className="mt-2 flex flex-col gap-0.5 text-xs">
                      {totalDesconto > 0 && <span className="text-mint-green">−{fmt(totalDesconto)} promoções</span>}
                      {cashbackUsar > 0 && <span className="text-mint-green">−{fmt(cashbackUsar)} cashback</span>}
                      <span className="text-steel">subtotal {fmt(subtotal)}</span>
                    </div>
                  )}
                </div>

                {/* Cashback */}
                {cashbackDisp > 0 && (
                  <div className={`flex items-center justify-between rounded-xl px-4 py-3 border ${
                    usarCB ? 'border-mint-green/50 bg-mint-green/10' : 'border-ocean-depth'
                  }`}>
                    <div>
                      <p className="text-sea-foam text-sm font-medium">Cashback disponível</p>
                      <p className="text-mint-green text-xs">{fmt(cashbackDisp)}</p>
                    </div>
                    <button onClick={() => setUsarCB(v => !v)}
                      className={`w-11 h-6 rounded-full relative transition-colors shrink-0 ${usarCB ? 'bg-mint-green' : 'bg-ocean-depth'}`}>
                      <span className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${usarCB ? 'left-6' : 'left-1'}`} />
                    </button>
                  </div>
                )}
              </div>

              {/* ── Bottom: seções fixas na base ────────────────────────── */}
              <div className="shrink-0 flex flex-col border-t border-ocean-depth">

                {/* ── Seção: Atribuição da Venda ──────────────────────────── */}
                <div className="px-4 pt-4 pb-3 flex flex-col gap-2">
                  <p className="text-steel text-[10px] uppercase tracking-wider mb-1">Atribuição da Venda</p>

                  {/* Cliente */}
                  {cliente_id ? (
                    <div className="flex gap-2">
                      <button
                        onClick={() => { setClienteAutoAberto(false); setModalCliente(true) }}
                        className="flex-1 min-h-[48px] border border-electric-cyan/40 text-electric-cyan rounded-xl text-sm hover:bg-electric-cyan/10 active:bg-electric-cyan/20 transition-colors px-3 text-left"
                      >
                        <span className="flex items-center gap-2 min-w-0">
                          <span className="shrink-0">👤</span>
                          <span className="truncate font-medium">{cliente_nome}</span>
                        </span>
                      </button>
                      <button
                        onClick={() => setCliente(null, null)}
                        title="Remover cliente"
                        className="min-w-[48px] min-h-[48px] border border-ocean-depth text-steel rounded-xl hover:border-red-400/50 hover:text-red-400 active:bg-red-500/10 transition-colors flex items-center justify-center text-xl"
                      >×</button>
                    </div>
                  ) : (
                    <button
                      onClick={() => { setClienteAutoAberto(false); setModalCliente(true) }}
                      className="min-h-[48px] w-full border border-ocean-depth text-steel rounded-xl text-sm hover:border-electric-cyan/40 hover:text-electric-cyan active:bg-electric-cyan/10 transition-colors text-left px-4"
                    >
                      👤 Adicionar Cliente
                    </button>
                  )}

                  {/* Vendedor */}
                  {vendedor ? (
                    <div className="flex gap-2">
                      <button
                        onClick={() => setModalVendedor(true)}
                        className="flex-1 min-h-[48px] border border-teal-current/40 text-teal-current rounded-xl text-sm hover:bg-teal-current/10 active:bg-teal-current/20 transition-colors px-3 text-left"
                      >
                        <span className="flex items-center gap-2 min-w-0">
                          <span className="shrink-0">🏷</span>
                          <span className="truncate font-medium">{vendedor.nome}</span>
                        </span>
                      </button>
                      <button
                        onClick={() => setVendedor(null)}
                        title="Remover vendedor"
                        className="min-w-[48px] min-h-[48px] border border-ocean-depth text-steel rounded-xl hover:border-red-400/50 hover:text-red-400 active:bg-red-500/10 transition-colors flex items-center justify-center text-xl"
                      >×</button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setModalVendedor(true)}
                      className="min-h-[48px] w-full border border-ocean-depth text-steel rounded-xl text-sm hover:border-teal-current/40 hover:text-teal-current active:bg-teal-current/10 transition-colors text-left px-4"
                    >
                      🏷 Adicionar Vendedor
                    </button>
                  )}
                </div>

                {/* ── Divisor visual ───────────────────────────────────────── */}
                <div className="mx-4 border-t border-ocean-depth" />

                {/* ── Seção: Gestão do Caixa ───────────────────────────────── */}
                <div className="px-4 pt-3 pb-3 flex flex-col gap-2">
                  <p className="text-steel text-[10px] uppercase tracking-wider mb-1">Gestão do Caixa</p>
                  <button
                    onClick={() => setModalSacolas(true)}
                    className="min-h-[48px] w-full border border-ocean-depth text-steel rounded-xl text-sm hover:border-electric-cyan/40 hover:text-electric-cyan active:bg-electric-cyan/10 transition-colors text-left px-4"
                  >
                    🛍 Sacolas Pendentes
                  </button>
                  <button
                    onClick={() => setModalMov('sangria')}
                    className="min-h-[48px] w-full border border-ocean-depth text-steel rounded-xl text-sm hover:border-red-400/50 hover:text-red-400 active:bg-red-500/10 transition-colors text-left px-4"
                  >
                    Sangria — retirada de dinheiro
                  </button>
                  <button
                    onClick={() => setModalMov('suprimento')}
                    className="min-h-[48px] w-full border border-ocean-depth text-steel rounded-xl text-sm hover:border-electric-cyan/40 hover:text-electric-cyan active:bg-electric-cyan/10 transition-colors text-left px-4"
                  >
                    Suprimento — reforço de caixa
                  </button>
                  <button
                    onClick={() => setModalFechar(true)}
                    className="min-h-[48px] w-full border border-red-500/30 text-red-400/70 rounded-xl text-sm hover:border-red-500/60 hover:text-red-400 active:bg-red-500/10 transition-colors text-left px-4"
                  >
                    Fechar Caixa
                  </button>
                </div>

                {/* Separador visual com espaçamento para evitar clique acidental */}
                <div className="mx-4 border-t border-ocean-depth" />

                {/* Botão Finalizar — sempre visível, sempre na base */}
                <div className="px-4 pt-3 pb-4">
                  <button
                    onClick={() => setModalCheckout(true)}
                    disabled={itens.length === 0}
                    className="w-full min-h-[60px] bg-electric-cyan text-midnight rounded-2xl text-base font-bold disabled:opacity-30 active:scale-[0.98] transition-transform"
                  >
                    {itens.length === 0 ? 'Sacola vazia' : `Finalizar Compra — ${fmt(baseTotal)}`}
                  </button>
                </div>
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
        <div className="fixed inset-0 bg-midnight/80 z-50 flex items-center justify-center p-4">
          <div className="bg-deep-ocean border border-ocean-depth rounded-2xl w-full max-w-sm p-6 flex flex-col gap-4">
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
        <div className="fixed inset-0 bg-midnight/80 z-50 flex items-center justify-center p-4">
          <div className="bg-deep-ocean border border-ocean-depth rounded-2xl w-full max-w-sm p-6 flex flex-col gap-4">
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
  )
}
