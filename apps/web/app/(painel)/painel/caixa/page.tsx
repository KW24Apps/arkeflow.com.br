'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { TopBar } from '@/components/layout/TopBar'
import { useCaixaStore } from '@/store/caixa.store'
import { usePDVStore } from '@/store/pdv.store'
import { useAuthStore } from '@/store/auth.store'
import { api } from '@/lib/api/client'
import { financeiroApi, type FormaPagamento } from '@/lib/api/financeiro'
import { clientesApi } from '@/lib/api/clientes'
import { vendasApi } from '@/lib/api/vendas'
import { promocoesApi } from '@/lib/api/promocoes'
import { calcularDescontos } from '@/lib/calcularDesconto'
import { AdvancedSearchModal } from '@/components/pdv/AdvancedSearchModal'

interface Pagamento {
  forma:       FormaPagamento
  valor:       string
  parcelas:    number
  desconto_pct:number  // 0 → max_pct do método
}

interface ProdutoSearch { id: string; nome: string; preco_base: string; total_versoes: number }

// ─────────────────────────────────────────────────────────────────────────────

export default function CaixaPage() {
  const { status, carregando: cxLoad, erro: cxErro, carregar, abrir, fechar, registrarMovimento, limparErro } = useCaixaStore()
  const { itens, cliente_id, cliente_nome, addItem, removeItem, setQtd, setCliente, limpar } = usePDVStore()
  const usuario = useAuthStore(s => s.usuario)

  // ── Abertura ──────────────────────────────────────────────────────────────
  const [saldoInicial, setSaldoInicial] = useState('')
  const [obsAbertura,  setObsAbertura]  = useState('')
  const [abrindo,      setAbrindo]      = useState(false)

  // ── Scanner / busca ───────────────────────────────────────────────────────
  const scanRef     = useRef<HTMLInputElement>(null)
  const [scan,      setScan]       = useState('')
  const [resultados,setResultados] = useState<ProdutoSearch[]>([])
  const [scanErro,  setScanErro]   = useState('')
  const [modalBusca,setModalBusca] = useState(false)

  // ── Pagamento ─────────────────────────────────────────────────────────────
  const [formas,     setFormas]      = useState<FormaPagamento[]>([])
  const [pagamentos, setPagamentos]  = useState<Pagamento[]>([])
  const [promocoes,  setPromocoes]   = useState<any[]>([])
  const [clienteInfo,setClienteInfo] = useState<any>(null)
  const [usarCB,     setUsarCB]      = useState(false)

  // ── Venda ─────────────────────────────────────────────────────────────────
  const [processando,  setProcessando]  = useState(false)
  const [vendaErro,    setVendaErro]    = useState('')
  const [vendaOK,      setVendaOK]      = useState<{ total: number; cashback_gerado: number } | null>(null)

  // ── Modais gestão ─────────────────────────────────────────────────────────
  const [modalMov,   setModalMov]   = useState<'sangria' | 'suprimento' | null>(null)
  const [valorMov,   setValorMov]   = useState('')
  const [motivoMov,  setMotivoMov]  = useState('')
  const [modalFechar,setModalFechar]= useState(false)
  const [saldoFinal, setSaldoFinal] = useState('')
  const [obsFech,    setObsFech]    = useState('')
  const [salvMov,    setSalvMov]    = useState(false)

  // ── Init ──────────────────────────────────────────────────────────────────
  useEffect(() => { carregar() }, [])

  useEffect(() => {
    if (status !== 'aberto') return
    Promise.all([financeiroApi.formasPagamento(), promocoesApi.list(false)])
      .then(([fs, ps]) => {
        setFormas(fs)
        setPromocoes(ps)
        const first = fs.find(f => f.ativo)
        if (first) setPagamentos([{ forma: first, valor: '', parcelas: 1, desconto_pct: 0 }])
      })
    setTimeout(() => scanRef.current?.focus(), 150)
  }, [status])

  useEffect(() => {
    if (cliente_id) clientesApi.get(cliente_id).then(setClienteInfo).catch(() => {})
    else { setClienteInfo(null); setUsarCB(false) }
  }, [cliente_id])

  // ── Cálculos ──────────────────────────────────────────────────────────────
  const { itensComDesconto, totalDesconto } = calcularDescontos(itens, promocoes, !clienteInfo?.total_compras, {})
  const subtotal    = itens.reduce((s, i) => s + i.preco_unitario * i.quantidade, 0)
  const cashbackDisp = clienteInfo ? Number(clienteInfo.saldo_cashback) : 0
  const cashbackUsar = usarCB ? Math.min(cashbackDisp, subtotal - totalDesconto) : 0
  const baseTotal   = Math.max(0, subtotal - totalDesconto - cashbackUsar)

  const totalDescontoPag = pagamentos.reduce((s, p) => {
    const rate = parseFloat(p.forma.desconto_percentual) || 0
    const cap  = parseFloat(p.forma.desconto_maximo) || 0
    const val  = parseFloat(p.valor) || 0
    if (!rate || !val || !p.desconto_pct) return s
    const bruto = val * (p.desconto_pct / 100)
    return s + (cap > 0 ? Math.min(bruto, cap) : bruto)
  }, 0)

  const totalFinal    = Math.max(0, baseTotal - totalDescontoPag)
  const totalPago     = pagamentos.reduce((s, p) => s + (parseFloat(p.valor) || 0), 0)
  const troco         = Math.max(0, totalPago - totalFinal)
  const falta         = Math.max(0, totalFinal - totalPago)

  // ── Scanner ───────────────────────────────────────────────────────────────
  async function buscarBarcode(codigo: string) {
    try {
      const { data } = await api.get<any>(`/produtos/barcode/${encodeURIComponent(codigo)}`)
      const preco = data.preco_especifico ? parseFloat(data.preco_especifico) : parseFloat(data.preco_base)
      addItem({ versao_id: data.versao_id ?? codigo, produto_id: data.produto_id, nome: data.produto_nome, atributos: data.atributos_json ?? {}, preco_unitario: preco, codigo_barras: data.codigo_barras })
      setScanErro(''); return true
    } catch { return false }
  }

  async function buscarTexto(q: string) {
    if (!q.trim()) { setResultados([]); return }
    try {
      const { data } = await api.get<ProdutoSearch[]>(`/produtos?q=${encodeURIComponent(q)}&todos=false`)
      setResultados(data)
    } catch {}
  }

  async function onScanEnter(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key !== 'Enter') return
    e.preventDefault()
    const cod = scan.trim(); if (!cod) return
    setResultados([])
    const found = await buscarBarcode(cod)
    if (!found) setScanErro(`"${cod}" não encontrado.`)
    setScan(''); scanRef.current?.focus()
  }

  async function selecionarProduto(p: ProdutoSearch) {
    try {
      const { data } = await api.get<any>(`/produtos/${p.id}`)
      if (data.versoes?.length === 1) {
        const v = data.versoes[0]
        addItem({ versao_id: v.id, produto_id: p.id, nome: p.nome, atributos: v.atributos_json, preco_unitario: v.preco_especifico ? parseFloat(v.preco_especifico) : parseFloat(data.preco_base), codigo_barras: v.codigo_barras })
        setResultados([]); setScan('')
      }
    } catch {}
    scanRef.current?.focus()
  }

  // ── Pagamento ─────────────────────────────────────────────────────────────
  function addPagamento() {
    const usadas = pagamentos.map(p => p.forma.id)
    const livre  = formas.find(f => f.ativo && !usadas.includes(f.id))
    if (livre) setPagamentos(prev => [...prev, { forma: livre, valor: '', parcelas: 1, desconto_pct: 0 }])
  }

  function updPag(i: number, campo: keyof Pagamento, val: any) {
    setPagamentos(prev => prev.map((p, idx) => idx === i ? { ...p, [campo]: val } : p))
  }

  function autoFill(i: number) {
    const outros = pagamentos.filter((_, idx) => idx !== i).reduce((s, p) => s + (parseFloat(p.valor) || 0), 0)
    updPag(i, 'valor', Math.max(0, totalFinal - outros).toFixed(2))
  }

  // ── Abrir ─────────────────────────────────────────────────────────────────
  async function handleAbrir() {
    setAbrindo(true)
    try { await abrir(parseFloat(saldoInicial) || 0, obsAbertura || undefined) }
    finally { setAbrindo(false) }
  }

  // ── Finalizar venda ───────────────────────────────────────────────────────
  async function handleFinalizar() {
    setVendaErro('')
    if (itens.length === 0) return
    if (falta > 0.01) { setVendaErro(`Faltam R$ ${falta.toFixed(2)}`); return }
    setProcessando(true)
    try {
      const r = await vendasApi.registrar({
        cliente_id:         cliente_id ?? null,
        itens: itensComDesconto.map(i => ({ versao_id: i.versao_id, quantidade: i.quantidade, preco_unitario: i.preco_unitario, desconto_item: i.desconto_item })),
        pagamentos: pagamentos.filter(p => parseFloat(p.valor) > 0).map(p => ({ forma_pagamento_id: p.forma.id, valor: parseFloat(p.valor), parcelas: p.parcelas })),
        cashback_usado:     cashbackUsar,
        desconto_promocao:  totalDesconto,
        desconto_pagamento: totalDescontoPag,
      })
      setVendaOK(r)
      limpar()
      const first = formas.find(f => f.ativo)
      if (first) setPagamentos([{ forma: first, valor: '', parcelas: 1, desconto_pct: 0 }])
    } catch (e: any) {
      setVendaErro(e?.response?.data?.error ?? 'Erro ao registrar venda.')
    } finally { setProcessando(false) }
  }

  function novaVenda() {
    setVendaOK(null)
    setVendaErro('')
    setTimeout(() => scanRef.current?.focus(), 100)
  }

  // ── Gestão do caixa ───────────────────────────────────────────────────────
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

  const fmt    = (v?: number | string | null) => `R$ ${Number(v ?? 0).toFixed(2)}`
  const nomeOp = (usuario as any)?.nome || (usuario as any)?.username || 'Operador'

  // ── LOADING ───────────────────────────────────────────────────────────────
  if (cxLoad && status === 'desconhecido') return (
    <>
      <TopBar title="Caixa" />
      <main className="flex-1 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-electric-cyan border-t-transparent rounded-full animate-spin" />
      </main>
    </>
  )

  // ── CAIXA FECHADO ─────────────────────────────────────────────────────────
  if (status !== 'aberto') return (
    <>
      <TopBar title="Caixa" />
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

          <Link href="/painel/caixa/vendas" className="text-center text-steel text-xs hover:text-sea-foam">
            Ver histórico de vendas →
          </Link>
        </div>
      </main>
    </>
  )

  // ── PDV ATIVO ─────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col flex-1 overflow-hidden min-h-0">

      {/* Barra de status do caixa */}
      <div className="shrink-0 h-11 bg-deep-ocean border-b border-ocean-depth px-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <span className="w-2 h-2 rounded-full bg-mint-green shrink-0" />
          <span className="text-mint-green text-xs font-semibold uppercase tracking-wide">Caixa Aberto</span>
          <span className="text-steel text-xs hidden sm:block">— {nomeOp}</span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button onClick={() => { setModalMov('sangria') }}
            className="min-h-[30px] px-3 text-xs border border-red-500/40 text-red-400 rounded-lg hover:bg-red-500/10 transition-colors">
            Sangria (−)
          </button>
          <button onClick={() => { setModalMov('suprimento') }}
            className="min-h-[30px] px-3 text-xs border border-electric-cyan/30 text-electric-cyan rounded-lg hover:bg-electric-cyan/10 transition-colors">
            Suprimento (+)
          </button>
          <button onClick={() => setModalFechar(true)}
            className="min-h-[30px] px-3 text-xs border border-ocean-depth text-steel rounded-lg hover:border-red-500/40 hover:text-red-400 transition-colors">
            Fechar Caixa
          </button>
          <Link href="/painel/caixa/vendas"
            className="min-h-[30px] px-3 text-xs text-steel hover:text-sea-foam transition-colors hidden md:flex items-center">
            Histórico
          </Link>
        </div>
      </div>

      {/* Split: esquerda (itens) + direita (pagamento) */}
      <div className="flex flex-1 overflow-hidden">

        {/* ── PAINEL ESQUERDO — Itens ──────────────────────────────────────── */}
        <div className="flex flex-col flex-1 min-w-0 border-r border-ocean-depth overflow-hidden">

          {/* Cabeçalho da venda */}
          <div className="shrink-0 px-4 py-2 border-b border-ocean-depth flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <span className="text-sea-foam text-sm font-semibold truncate">
                {itens.length === 0 ? 'Nova Venda' : `${itens.reduce((s, i) => s + i.quantidade, 0)} item(ns)`}
              </span>
              {cliente_nome && (
                <span className="text-xs text-electric-cyan truncate">· {cliente_nome}</span>
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {cliente_id ? (
                <button onClick={() => setCliente(null, null)} className="text-steel text-xs hover:text-red-400">✕ cliente</button>
              ) : (
                <button onClick={() => {}} className="text-xs text-steel hover:text-sea-foam border border-ocean-depth rounded-lg px-2 py-1">
                  + Cliente
                </button>
              )}
              {itens.length > 0 && (
                <button onClick={limpar} className="text-xs text-steel hover:text-red-400">Limpar</button>
              )}
            </div>
          </div>

          {/* Lista de itens */}
          <div className="flex-1 overflow-y-auto">
            {itens.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full gap-3 opacity-40">
                <span className="text-5xl">🛒</span>
                <p className="text-steel text-sm">Escaneie ou busque um produto</p>
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
                            <p className="text-mint-green text-xs">-{fmt(item.desconto_item)} desconto</p>
                          )}
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex items-center justify-center gap-1">
                            <button onClick={() => setQtd(item.versao_id, item.quantidade - 1)}
                              className="w-7 h-7 bg-ocean-depth rounded-lg text-sea-foam font-bold text-sm flex items-center justify-center">−</button>
                            <span className="text-sea-foam font-semibold w-6 text-center">{item.quantidade}</span>
                            <button onClick={() => setQtd(item.versao_id, item.quantidade + 1)}
                              className="w-7 h-7 bg-ocean-depth rounded-lg text-sea-foam font-bold text-sm flex items-center justify-center">+</button>
                          </div>
                        </td>
                        <td className="px-3 py-3 text-right text-steel hidden md:table-cell">
                          {fmt(item.preco_unitario)}
                        </td>
                        <td className="px-4 py-3 text-right text-sea-foam font-semibold">
                          {fmt(item.preco_unitario * item.quantidade - item.desconto_item)}
                        </td>
                        <td className="pr-2">
                          <button onClick={() => removeItem(item.versao_id)}
                            className="w-8 h-8 text-steel hover:text-red-400 rounded-lg flex items-center justify-center text-base">
                            ×
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* Input scanner — sempre visível, sempre focado */}
          <div className="shrink-0 p-3 border-t border-ocean-depth bg-midnight relative">
            {scanErro && <p className="text-red-400 text-xs mb-2 text-center">{scanErro}</p>}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  ref={scanRef}
                  value={scan}
                  onChange={e => { setScan(e.target.value); buscarTexto(e.target.value); setScanErro('') }}
                  onKeyDown={onScanEnter}
                  onBlur={e => {
                    // Não rouba foco se o usuario esta interagindo com selects ou botoes
                    const next = e.relatedTarget as HTMLElement | null
                    if (next && (next.tagName === 'SELECT' || next.tagName === 'BUTTON' || next.tagName === 'INPUT' || next.closest('[data-no-refocus]'))) return
                    if (!modalBusca) setTimeout(() => scanRef.current?.focus(), 250)
                  }}
                  placeholder="Bipe o código de barras ou digite a referência..."
                  autoComplete="off"
                  className="w-full min-h-[48px] bg-deep-ocean border border-ocean-depth rounded-xl pl-4 pr-4 text-sm text-sea-foam placeholder-steel/50 outline-none focus:border-electric-cyan"
                />
              </div>
              {/* Botão busca avançada */}
              <button
                onClick={() => { setModalBusca(true); setScan(''); setResultados([]) }}
                title="Busca avançada com filtros"
                className="min-w-[48px] min-h-[48px] bg-deep-ocean border border-ocean-depth rounded-xl text-steel hover:border-electric-cyan hover:text-electric-cyan transition-colors flex items-center justify-center text-lg"
              >
                🔍
              </button>
            </div>

            {/* Dropdown resultados autocomplete */}
            {resultados.length > 0 && (
              <div className="absolute bottom-full mb-1 left-3 right-3 z-20 bg-deep-ocean border border-ocean-depth rounded-xl overflow-hidden shadow-xl">
                {resultados.slice(0, 6).map(p => (
                  <button key={p.id} onClick={() => selecionarProduto(p)}
                    className="w-full flex items-center justify-between px-4 py-3 hover:bg-ocean-depth border-b border-ocean-depth last:border-0 text-left">
                    <div>
                      <p className="text-sea-foam text-sm">{p.nome}</p>
                      <p className="text-steel text-xs">{p.total_versoes} var.</p>
                    </div>
                    <p className="text-electric-cyan text-sm font-semibold">{fmt(parseFloat(p.preco_base))}</p>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── PAINEL DIREITO — Resumo + Pagamento ─────────────────────────── */}
        <div className="w-80 xl:w-96 flex flex-col overflow-hidden bg-deep-ocean shrink-0" data-no-refocus>

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
              {/* Total */}
              <div className="shrink-0 p-5 border-b border-ocean-depth">
                <p className="text-steel text-xs uppercase tracking-wider">Total da Venda</p>
                <p className="text-electric-cyan font-black text-4xl mt-1">{fmt(totalFinal)}</p>
                {(totalDesconto > 0 || totalDescontoPag > 0 || cashbackUsar > 0) && (
                  <div className="mt-2 flex flex-col gap-0.5 text-xs">
                    {totalDesconto > 0 && <span className="text-mint-green">−{fmt(totalDesconto)} promoções</span>}
                    {cashbackUsar > 0 && <span className="text-mint-green">−{fmt(cashbackUsar)} cashback</span>}
                    {totalDescontoPag > 0 && <span className="text-mint-green">−{fmt(totalDescontoPag)} desconto pagamento</span>}
                    <span className="text-steel">subtotal {fmt(subtotal)}</span>
                  </div>
                )}
              </div>

              {/* Cashback */}
              {cashbackDisp > 0 && (
                <div className={`shrink-0 mx-4 mt-3 flex items-center justify-between rounded-xl px-3 py-2 border ${
                  usarCB ? 'border-mint-green/50 bg-mint-green/10' : 'border-ocean-depth'
                }`}>
                  <div>
                    <p className="text-sea-foam text-xs font-medium">Cashback do cliente</p>
                    <p className="text-mint-green text-xs">{fmt(cashbackDisp)} disponível</p>
                  </div>
                  <button onClick={() => setUsarCB(v => !v)}
                    className={`w-9 h-5 rounded-full relative shrink-0 transition-colors ${usarCB ? 'bg-mint-green' : 'bg-ocean-depth'}`}>
                    <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all ${usarCB ? 'left-4' : 'left-0.5'}`} />
                  </button>
                </div>
              )}

              {/* Formas de pagamento */}
              <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
                {pagamentos.map((pag, i) => {
                  const maxPct = parseFloat(pag.forma.desconto_percentual) || 0
                  const capR$  = parseFloat(pag.forma.desconto_maximo) || 0
                  const val    = parseFloat(pag.valor) || 0
                  const descontoAplicado = maxPct > 0 && pag.desconto_pct > 0
                    ? Math.min(val * (pag.desconto_pct / 100), capR$ > 0 ? capR$ : Infinity)
                    : 0

                  return (
                    <div key={i} className="bg-midnight rounded-2xl p-3 flex flex-col gap-2">
                      {/* Forma + valor */}
                      <div className="flex gap-2 items-center">
                        <select value={pag.forma.id}
                          onChange={e => {
                            const f = formas.find(f => f.id === e.target.value)
                            if (f) updPag(i, 'forma', f)
                          }}
                          className="flex-1 min-h-[40px] bg-deep-ocean border border-ocean-depth rounded-xl px-3 text-sm text-sea-foam outline-none">
                          {formas.filter(f => f.ativo).map(f => (
                            <option key={f.id} value={f.id}>{f.nome}</option>
                          ))}
                        </select>
                        <div className="w-28 relative">
                          <input type="number" min="0" step="0.01"
                            value={pag.valor}
                            onChange={e => updPag(i, 'valor', e.target.value)}
                            onFocus={() => !pag.valor && autoFill(i)}
                            placeholder="R$"
                            className="w-full min-h-[40px] bg-deep-ocean border border-ocean-depth rounded-xl px-3 text-sm text-sea-foam text-center outline-none focus:border-electric-cyan" />
                        </div>
                        {pagamentos.length > 1 && (
                          <button onClick={() => setPagamentos(prev => prev.filter((_, idx) => idx !== i))}
                            className="w-8 h-8 text-steel hover:text-red-400 flex items-center justify-center shrink-0">×</button>
                        )}
                      </div>

                      {/* Parcelas (crediário) */}
                      {pag.forma.tipo === 'crediario' && (
                        <select value={pag.parcelas} onChange={e => updPag(i, 'parcelas', parseInt(e.target.value))}
                          className="min-h-[36px] bg-deep-ocean border border-ocean-depth rounded-xl px-3 text-xs text-sea-foam outline-none">
                          {[1,2,3,4,5,6,8,10,12].map(n => (
                            <option key={n} value={n}>{n}× {fmt(val / n)} /parcela</option>
                          ))}
                        </select>
                      )}

                      {/* Slider de desconto */}
                      {maxPct > 0 && val > 0 && (
                        <div className="flex flex-col gap-1">
                          <div className="flex justify-between text-xs">
                            <span className="text-steel">
                              Desconto {pag.forma.nome}
                              {capR$ > 0 ? ` (máx ${fmt(capR$)})` : ` (máx ${maxPct}%)`}
                            </span>
                            <span className="text-mint-green font-medium">
                              {descontoAplicado > 0 ? `−${fmt(descontoAplicado)}` : '0%'}
                            </span>
                          </div>
                          <input type="range" min="0" max={maxPct} step="0.5"
                            value={pag.desconto_pct}
                            onChange={e => updPag(i, 'desconto_pct', parseFloat(e.target.value))}
                            className="w-full accent-electric-cyan h-1.5 rounded-full cursor-pointer" />
                          <div className="flex justify-between text-[10px] text-steel">
                            <span>0%</span><span>{maxPct}%</span>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}

                {pagamentos.length < formas.filter(f => f.ativo).length && (
                  <button onClick={addPagamento}
                    className="text-xs text-electric-cyan/70 hover:text-electric-cyan min-h-[32px] self-start">
                    + Outra forma de pagamento
                  </button>
                )}
              </div>

              {/* Rodapé: troco / falta + botão */}
              <div className="shrink-0 p-4 border-t border-ocean-depth flex flex-col gap-3">
                <div className="flex flex-col gap-1 text-xs">
                  <div className="flex justify-between text-steel">
                    <span>Total informado</span><span>{fmt(totalPago)}</span>
                  </div>
                  {troco > 0.01 && (
                    <div className="flex justify-between text-mint-green font-semibold">
                      <span>Troco</span><span>{fmt(troco)}</span>
                    </div>
                  )}
                  {falta > 0.01 && (
                    <div className="flex justify-between text-red-400 font-semibold">
                      <span>Falta</span><span>{fmt(falta)}</span>
                    </div>
                  )}
                </div>

                {vendaErro && <p className="text-red-400 text-xs text-center">{vendaErro}</p>}

                <button onClick={handleFinalizar}
                  disabled={processando || itens.length === 0 || falta > 0.01}
                  className="min-h-[52px] bg-electric-cyan text-midnight rounded-2xl font-bold text-base disabled:opacity-30 active:scale-[0.98] transition-transform">
                  {processando ? 'Registrando...' : itens.length === 0 ? 'Sacola vazia' : `Finalizar — ${fmt(totalFinal)}`}
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Modal Sangria / Suprimento ───────────────────────────────────────── */}
      {modalMov && (
        <div className="fixed inset-0 bg-midnight/80 z-50 flex items-center justify-center p-4">
          <div className="bg-deep-ocean border border-ocean-depth rounded-2xl w-full max-w-sm p-6 flex flex-col gap-4">
            <h3 className="text-sea-foam font-semibold capitalize">{modalMov}</h3>
            <p className="text-steel text-xs -mt-2">
              {modalMov === 'sangria' ? 'Retirada de dinheiro do caixa.' : 'Reforço de dinheiro no caixa.'}
            </p>
            <div>
              <label className="text-steel text-xs block mb-1">Valor (R$)</label>
              <input type="number" min="0.01" step="0.01" value={valorMov}
                onChange={e => setValorMov(e.target.value)} autoFocus
                className="w-full min-h-[48px] bg-midnight border border-ocean-depth rounded-xl px-4 text-sea-foam text-sm outline-none focus:border-electric-cyan" />
            </div>
            <div>
              <label className="text-steel text-xs block mb-1">Motivo (opcional)</label>
              <input type="text" value={motivoMov} onChange={e => setMotivoMov(e.target.value)}
                placeholder="Ex: troco"
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

      {/* ── Modal Busca Avançada ────────────────────────────────────────────── */}
      <AdvancedSearchModal
        open={modalBusca}
        onClose={() => { setModalBusca(false); setTimeout(() => scanRef.current?.focus(), 100) }}
        onAddItem={item => { addItem(item); setTimeout(() => scanRef.current?.focus(), 100) }}
      />

      {/* ── Modal Fechar Caixa ───────────────────────────────────────────────── */}
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
