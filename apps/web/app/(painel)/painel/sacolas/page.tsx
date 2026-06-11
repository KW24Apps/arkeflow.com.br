'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { ArrowLeft, RefreshCw, ShoppingBag } from 'lucide-react'
import { TopBar } from '@/components/layout/TopBar'
import { CustomerSearchModal } from '@/components/pdv/CustomerSearchModal'
import { sacolasApi, type SacolaRemota, type SacolaItemRemoto } from '@/lib/api/sacolas'
import { api } from '@/lib/api/client'
import { useAuthStore } from '@/store/auth.store'

// ── Local item type (no `id`, fully typed) ────────────────────────────────────
interface SacolaItem {
  versao_id:      string
  produto_id:     string
  nome:           string
  atributos:      Record<string, string>
  preco_unitario: number
  quantidade:     number
  codigo_barras?: string | null
}

interface ProdutoSearch {
  id:            string
  nome:          string
  preco_base:    string
  total_versoes: number
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmtR(v: number) {
  return `R$ ${v.toFixed(2).replace('.', ',')}`
}

function agoMin(iso: string) {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
  if (diff < 1) return 'agora'
  if (diff < 60) return `há ${diff} min`
  const h = Math.floor(diff / 60)
  if (h < 24) return `há ${h}h`
  return `há ${Math.floor(h / 24)}d`
}

function parseQtyPrefix(raw: string): { qty: number; query: string } {
  const m = raw.match(/^(\d+)-(.+)$/)
  return m ? { qty: parseInt(m[1], 10), query: m[2].trim() } : { qty: 1, query: raw }
}

// ── Shared styles ─────────────────────────────────────────────────────────────
const CARD: React.CSSProperties = {
  background:    'rgba(8,18,30,0.48)',
  backdropFilter:'blur(8px)',
  border:        '0.5px solid rgba(255,255,255,0.09)',
  borderRadius:  '10px',
}

const PANEL: React.CSSProperties = {
  background:    'rgba(8,18,30,0.55)',
  backdropFilter:'blur(12px)',
  border:        '0.5px solid rgba(255,255,255,0.09)',
  borderRadius:  '12px',
}

// ─────────────────────────────────────────────────────────────────────────────
export default function SacolasPage() {
  const usuario = useAuthStore(s => s.usuario)

  // view
  const [view,      setView]      = useState<'grid' | 'builder'>('grid')
  const [editingId, setEditingId] = useState<string | null>(null)

  // grid
  const [sacolas,    setSacolas]    = useState<SacolaRemota[]>([])
  const [loading,    setLoading]    = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  // builder
  const [itens,       setItens]       = useState<SacolaItem[]>([])
  const [clienteId,   setClienteId]   = useState<string | null>(null)
  const [clienteNome, setClienteNome] = useState<string | null>(null)
  const [salvando,    setSalvando]    = useState(false)
  const [builderErro, setBuilderErro] = useState('')

  // modals
  const [modalCliente,  setModalCliente]  = useState(false)
  const [modalVariacao, setModalVariacao] = useState<{ produto: any; qty: number } | null>(null)

  // search
  const scanRef        = useRef<HTMLInputElement>(null)
  const [scan,          setScan]          = useState('')
  const [resultados,    setResultados]    = useState<ProdutoSearch[]>([])
  const [highlightIdx,  setHighlightIdx]  = useState(-1)
  const [scanErro,      setScanErro]      = useState('')

  // ── Load grid ───────────────────────────────────────────────────────────────
  async function loadGrid(soft = false) {
    soft ? setRefreshing(true) : setLoading(true)
    try { setSacolas(await sacolasApi.list('aguardando')) }
    finally { setLoading(false); setRefreshing(false) }
  }

  useEffect(() => { loadGrid() }, [])

  // ── Open builder ────────────────────────────────────────────────────────────
  function openCreate() {
    setItens([]); setClienteId(null); setClienteNome(null)
    setEditingId(null); setScan(''); setResultados([])
    setScanErro(''); setBuilderErro('')
    setView('builder')
  }

  function openEdit(s: SacolaRemota) {
    setItens(s.itens.map(i => ({
      versao_id:      i.versao_id,
      produto_id:     i.produto_id,
      nome:           i.nome,
      atributos:      i.atributos ?? {},
      preco_unitario: Number(i.preco_unitario),
      quantidade:     i.quantidade,
      codigo_barras:  i.codigo_barras ?? null,
    })))
    setClienteId(s.cliente_id)
    setClienteNome(s.cliente_nome)
    setEditingId(s.id)
    setScan(''); setResultados([])
    setScanErro(''); setBuilderErro('')
    setView('builder')
  }

  function backToGrid() { setView('grid'); loadGrid(true) }

  // ── Item helpers ─────────────────────────────────────────────────────────────
  function addItem(item: Omit<SacolaItem, 'quantidade'>, qty = 1) {
    setItens(prev => {
      const idx = prev.findIndex(i => i.versao_id === item.versao_id)
      if (idx >= 0) return prev.map((i, n) => n === idx ? { ...i, quantidade: i.quantidade + qty } : i)
      return [...prev, { ...item, quantidade: qty }]
    })
  }

  function removeItem(versao_id: string) {
    setItens(prev => prev.filter(i => i.versao_id !== versao_id))
  }

  function setQtd(versao_id: string, qtd: number) {
    if (qtd <= 0) { removeItem(versao_id); return }
    setItens(prev => prev.map(i => i.versao_id === versao_id ? { ...i, quantidade: qtd } : i))
  }

  // ── Product search ───────────────────────────────────────────────────────────
  async function buscarBarcode(codigo: string, qty: number): Promise<boolean> {
    try {
      const { data } = await api.get<any>(`/produtos/barcode/${encodeURIComponent(codigo)}`)
      if (data.match === 'produto') {
        const p = data.produto; const versoes: any[] = data.versoes ?? []
        if (versoes.length === 1) {
          const v = versoes[0]
          addItem({ versao_id: v.id, produto_id: p.id, nome: p.nome,
                    atributos: v.atributos_json ?? {}, codigo_barras: v.codigo_barras ?? null,
                    preco_unitario: v.preco_especifico ? +v.preco_especifico : +p.preco_base }, qty)
        } else {
          setModalVariacao({ produto: { ...p, versoes }, qty })
        }
      } else {
        addItem({ versao_id: data.id, produto_id: data.produto_id, nome: data.produto_nome,
                  atributos: data.atributos_json ?? {}, codigo_barras: data.codigo_barras ?? null,
                  preco_unitario: data.preco_especifico ? +data.preco_especifico : +data.preco_base }, qty)
      }
      setScanErro(''); return true
    } catch { return false }
  }

  async function buscarTexto(rawInput: string) {
    const { query } = parseQtyPrefix(rawInput)
    if (!query.trim()) { setResultados([]); setHighlightIdx(-1); return }
    try {
      const { data } = await api.get<ProdutoSearch[]>(`/produtos?q=${encodeURIComponent(query)}&todos=false`)
      setResultados(data); setHighlightIdx(-1)
    } catch {}
  }

  async function selecionarProduto(p: ProdutoSearch) {
    const { qty } = parseQtyPrefix(scan)
    try {
      const { data } = await api.get<any>(`/produtos/${p.id}`)
      const versoes: any[] = data.versoes ?? []
      if (versoes.length === 1) {
        const v = versoes[0]
        addItem({ versao_id: v.id, produto_id: p.id, nome: p.nome,
                  atributos: v.atributos_json ?? {}, codigo_barras: v.codigo_barras ?? null,
                  preco_unitario: v.preco_especifico ? +v.preco_especifico : +data.preco_base }, qty)
        setResultados([]); setScan(''); scanRef.current?.focus()
      } else if (versoes.length > 1) {
        setResultados([]); setModalVariacao({ produto: data, qty })
      } else {
        setScanErro(`${p.nome} sem variações.`); setResultados([])
      }
    } catch (e: any) {
      setScanErro(e?.response?.data?.error ?? 'Erro ao carregar produto.'); setResultados([])
    }
  }

  async function onScanKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown') {
      e.preventDefault(); setHighlightIdx(i => Math.min(i + 1, resultados.length - 1)); return
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault(); setHighlightIdx(i => Math.max(i - 1, 0)); return
    }
    if (e.key === 'Escape') { setResultados([]); setHighlightIdx(-1); return }
    if (e.key !== 'Enter') return
    e.preventDefault()

    if (resultados.length > 0 && highlightIdx >= 0) {
      const p = resultados[highlightIdx]; setResultados([]); setHighlightIdx(-1)
      await selecionarProduto(p); return
    }

    const raw = scan.trim(); if (!raw) return
    const { qty, query } = parseQtyPrefix(raw)
    setResultados([]); setHighlightIdx(-1)
    const found = await buscarBarcode(query, qty)
    if (found) { setScan(''); scanRef.current?.focus() }
    else await buscarTexto(raw)
  }

  function selecionarVariacao(v: any, produto: any, qty: number) {
    const preco = v.preco_especifico ? +v.preco_especifico : +produto.preco_base
    addItem({ versao_id: v.id, produto_id: produto.id, nome: produto.nome,
              atributos: v.atributos_json ?? {}, codigo_barras: v.codigo_barras ?? null,
              preco_unitario: preco }, qty)
    setModalVariacao(null); setScan(''); scanRef.current?.focus()
  }

  // ── Save / cancel ────────────────────────────────────────────────────────────
  async function handleSalvar() {
    if (!clienteId || itens.length === 0) return
    setSalvando(true); setBuilderErro('')
    try {
      if (editingId) {
        await sacolasApi.updateItens(editingId, itens as SacolaItemRemoto[], clienteId, clienteNome)
      } else {
        await sacolasApi.create({ cliente_id: clienteId, cliente_nome: clienteNome, itens: itens as SacolaItemRemoto[] })
      }
      backToGrid()
    } catch (e: any) {
      setBuilderErro(e?.response?.data?.error ?? 'Erro ao salvar sacola.')
    } finally { setSalvando(false) }
  }

  async function handleCancelar() {
    if (!editingId) { backToGrid(); return }
    setSalvando(true); setBuilderErro('')
    try {
      await sacolasApi.cancelar(editingId)
      backToGrid()
    } catch (e: any) {
      setBuilderErro(e?.response?.data?.error ?? 'Erro ao cancelar sacola.')
    } finally { setSalvando(false) }
  }

  const total    = itens.reduce((s, i) => s + i.preco_unitario * i.quantidade, 0)
  const totalQtd = itens.reduce((s, i) => s + i.quantidade, 0)
  const canSave  = !!clienteId && itens.length > 0

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <>
      <TopBar />

      {view === 'grid' ? (

        /* ══════════════════════════════════ GRID VIEW ══════════════════════════ */
        <main className="flex-1 min-h-0 overflow-y-auto p-4 md:p-5 pb-24 flex flex-col gap-4">

          {/* Header row */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)' }}>
              Sacolas aguardando atendimento. O caixa pode puxar direto para o carrinho.
            </p>
            <button
              onClick={() => loadGrid(true)}
              disabled={refreshing}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.4)', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', padding: '4px 8px', borderRadius: '6px' }}
              onMouseEnter={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.75)' }}
              onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.4)' }}
            >
              <RefreshCw size={12} style={{ animation: refreshing ? 'spin 1s linear infinite' : undefined }} />
              Atualizar
            </button>
          </div>

          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', paddingTop: '64px' }}>
              <div className="w-6 h-6 border-2 border-electric-cyan border-t-transparent rounded-full animate-spin" />
            </div>
          ) : sacolas.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px', paddingTop: '80px' }}>
              <ShoppingBag size={40} style={{ color: 'rgba(255,255,255,0.15)' }} />
              <p style={{ fontSize: '14px', fontWeight: 500, color: 'rgba(255,255,255,0.4)' }}>Nenhuma sacola aguardando</p>
              <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.25)', textAlign: 'center', maxWidth: '240px' }}>
                Crie uma sacola para reservar produtos de um cliente antes de chegar ao caixa.
              </p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px' }}>
              {sacolas.map(s => {
                const tot = s.itens.reduce((a, i) => a + Number(i.preco_unitario) * i.quantidade, 0)
                const qtd = s.itens.reduce((a, i) => a + i.quantidade, 0)
                return (
                  <div
                    key={s.id}
                    onClick={() => openEdit(s)}
                    className="cursor-pointer active:scale-[0.98]"
                    style={{ ...CARD, padding: '16px', minHeight: '120px', display: 'flex', flexDirection: 'column', gap: '8px', transition: 'background 120ms, border-color 120ms' }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.18)' }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'rgba(8,18,30,0.48)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.09)' }}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
                      <p style={{ fontSize: '13px', fontWeight: 600, color: 'rgba(255,255,255,0.85)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                        {s.cliente_nome ?? 'Sem cliente'}
                      </p>
                      <span style={{ fontSize: '9px', background: 'rgba(0,239,255,0.12)', color: '#0ef', borderRadius: '9999px', padding: '2px 8px', flexShrink: 0, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                        Aguardando
                      </span>
                    </div>
                    <p style={{ fontSize: '15px', fontWeight: 700, color: '#0ef' }}>{fmtR(tot)}</p>
                    <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)' }}>
                      {qtd} item{qtd !== 1 ? 'ns' : ''} · {s.nome_vendedor ?? '—'}
                    </p>
                    <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.2)', marginTop: 'auto' }}>
                      {agoMin(s.criado_em)}
                    </p>
                  </div>
                )
              })}
            </div>
          )}

          {/* FAB */}
          <button
            onClick={openCreate}
            className="fixed bottom-6 right-6 z-50 flex items-center justify-center shadow-lg active:scale-95 transition-transform"
            style={{ width: '48px', height: '48px', background: 'rgba(0,239,255,0.9)', borderRadius: '50%', color: '#0a0a1a', fontSize: '24px', fontWeight: 700, border: 'none', outline: 'none', cursor: 'pointer' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(0,239,255,0.75)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(0,239,255,0.9)' }}
            onFocus={e => { e.currentTarget.style.boxShadow = '0 0 0 3px rgba(0,239,255,0.35)' }}
            onBlur={e => { e.currentTarget.style.boxShadow = 'none' }}
          >+</button>
        </main>

      ) : (

        /* ════════════════════════════════ BUILDER VIEW ═════════════════════════ */
        <main style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

          {/* Builder top bar */}
          <div style={{ padding: '10px 16px', borderBottom: '0.5px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
            <button
              onClick={backToGrid}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.45)', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', padding: '4px 8px', borderRadius: '6px' }}
              onMouseEnter={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.85)' }}
              onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.45)' }}
            >
              <ArrowLeft size={14} />
              Sacolas
            </button>
            <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.2)' }}>/</span>
            <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.65)', fontWeight: 500 }}>
              {editingId ? 'Editar sacola' : 'Nova sacola'}
            </span>
          </div>

          {/* Two-column body */}
          <div style={{ flex: 1, minHeight: 0, display: 'flex' }}>

            {/* ── LEFT: items + search ── */}
            <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', padding: '14px 16px', gap: '10px', borderRight: '0.5px solid rgba(255,255,255,0.07)' }}>

              {/* Items list */}
              <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
                {itens.length === 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '8px', opacity: 0.3 }}>
                    <ShoppingBag size={36} />
                    <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>Adicione produtos com o campo abaixo</p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    {itens.map(item => {
                      const attrText = Object.entries(item.atributos ?? {}).map(([k, v]) => `${k}: ${v}`).join(' · ')
                      return (
                        <div key={item.versao_id} style={{ ...CARD, padding: '9px 12px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{ fontSize: '13px', fontWeight: 500, color: 'rgba(255,255,255,0.85)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {item.nome}
                            </p>
                            {attrText && <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', marginTop: '2px' }}>{attrText}</p>}
                            <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', marginTop: '2px' }}>{fmtR(item.preco_unitario)} un.</p>
                          </div>
                          {/* qty controls */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                            <button
                              onClick={() => setQtd(item.versao_id, item.quantidade - 1)}
                              style={{ width: '26px', height: '26px', background: 'rgba(255,255,255,0.06)', border: '0.5px solid rgba(255,255,255,0.12)', borderRadius: '6px', color: 'rgba(255,255,255,0.6)', fontSize: '16px', lineHeight: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.12)' }}
                              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)' }}
                            >−</button>
                            <span style={{ fontSize: '14px', fontWeight: 600, color: 'rgba(255,255,255,0.85)', minWidth: '22px', textAlign: 'center' }}>{item.quantidade}</span>
                            <button
                              onClick={() => setQtd(item.versao_id, item.quantidade + 1)}
                              style={{ width: '26px', height: '26px', background: 'rgba(255,255,255,0.06)', border: '0.5px solid rgba(255,255,255,0.12)', borderRadius: '6px', color: 'rgba(255,255,255,0.6)', fontSize: '16px', lineHeight: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.12)' }}
                              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)' }}
                            >+</button>
                          </div>
                          <p style={{ fontSize: '13px', fontWeight: 600, color: '#0ef', minWidth: '70px', textAlign: 'right', flexShrink: 0 }}>
                            {fmtR(item.preco_unitario * item.quantidade)}
                          </p>
                          <button
                            onClick={() => removeItem(item.versao_id)}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.2)', fontSize: '18px', lineHeight: 1, flexShrink: 0, padding: '2px 4px' }}
                            onMouseEnter={e => { e.currentTarget.style.color = 'rgba(248,113,113,0.8)' }}
                            onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.2)' }}
                          >×</button>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Search bar */}
              <div style={{ flexShrink: 0, position: 'relative' }}>
                {scanErro && (
                  <p style={{ fontSize: '11px', color: 'rgba(248,113,113,0.8)', marginBottom: '5px' }}>{scanErro}</p>
                )}
                {/* Dropdown above */}
                {resultados.length > 0 && (
                  <div style={{ position: 'absolute', bottom: '100%', left: 0, right: 0, marginBottom: '4px', background: 'rgba(8,18,30,0.98)', border: '0.5px solid rgba(255,255,255,0.12)', borderRadius: '10px', overflow: 'hidden', zIndex: 20 }}>
                    {resultados.slice(0, 7).map((p, idx) => (
                      <div
                        key={p.id}
                        onMouseDown={() => { setResultados([]); selecionarProduto(p) }}
                        style={{ padding: '9px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', background: idx === highlightIdx ? 'rgba(0,239,255,0.08)' : 'transparent', borderBottom: idx < Math.min(resultados.length, 7) - 1 ? '0.5px solid rgba(255,255,255,0.05)' : 'none' }}
                        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(0,239,255,0.06)' }}
                        onMouseLeave={e => { e.currentTarget.style.background = idx === highlightIdx ? 'rgba(0,239,255,0.08)' : 'transparent' }}
                      >
                        <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.8)' }}>{p.nome}</span>
                        <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.35)' }}>R$ {(+p.preco_base).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                )}
                <input
                  ref={scanRef}
                  value={scan}
                  onChange={e => { setScan(e.target.value); buscarTexto(e.target.value); setScanErro('') }}
                  onKeyDown={onScanKeyDown}
                  placeholder="Código de barras, nome… ou '3-item' para qty 3"
                  className="outline-none w-full"
                  autoFocus
                  style={{ background: 'rgba(8,18,30,0.5)', border: '0.5px solid rgba(255,255,255,0.12)', borderRadius: '10px', padding: '10px 14px', fontSize: '13px', color: 'rgba(255,255,255,0.75)' }}
                  onFocus={e => { e.currentTarget.style.borderColor = 'rgba(0,239,255,0.4)' }}
                  onBlur={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)' }}
                />
              </div>
            </div>

            {/* ── RIGHT: client + total + actions ── */}
            <div style={{ width: '256px', flexShrink: 0, display: 'flex', flexDirection: 'column', padding: '14px 16px', gap: '10px', overflowY: 'auto' }}>

              {/* Cliente */}
              <div style={{ ...PANEL, padding: '12px' }}>
                <p style={{ fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.3)', marginBottom: '8px' }}>Cliente *</p>
                {clienteId ? (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
                    <p style={{ fontSize: '13px', fontWeight: 500, color: 'rgba(255,255,255,0.85)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {clienteNome}
                    </p>
                    <button
                      onClick={() => setModalCliente(true)}
                      style={{ fontSize: '11px', color: 'rgba(0,239,255,0.7)', background: 'none', border: 'none', cursor: 'pointer', flexShrink: 0 }}
                      onMouseEnter={e => { e.currentTarget.style.color = '#0ef' }}
                      onMouseLeave={e => { e.currentTarget.style.color = 'rgba(0,239,255,0.7)' }}
                    >Trocar</button>
                  </div>
                ) : (
                  <button
                    onClick={() => setModalCliente(true)}
                    style={{ width: '100%', padding: '7px 0', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(240,100,100,0.6)', fontSize: '12px', textAlign: 'left' }}
                    onMouseEnter={e => { e.currentTarget.style.color = 'rgba(240,100,100,0.9)' }}
                    onMouseLeave={e => { e.currentTarget.style.color = 'rgba(240,100,100,0.6)' }}
                  >
                    Vincular cliente (obrigatório)
                  </button>
                )}
              </div>

              {/* Vendedor */}
              <div style={{ ...PANEL, padding: '12px' }}>
                <p style={{ fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.3)', marginBottom: '6px' }}>Vendedor</p>
                <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.7)' }}>{usuario?.nome ?? '—'}</p>
                <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.2)', marginTop: '2px' }}>logado automaticamente</p>
              </div>

              {/* Total */}
              <div style={{ ...PANEL, padding: '12px' }}>
                <p style={{ fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.3)', marginBottom: '6px' }}>Total</p>
                <p style={{ fontSize: '22px', fontWeight: 700, color: '#0ef' }}>{fmtR(total)}</p>
                <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', marginTop: '2px' }}>
                  {totalQtd} item{totalQtd !== 1 ? 'ns' : ''}
                </p>
              </div>

              {builderErro && (
                <p style={{ fontSize: '12px', color: 'rgba(248,113,113,0.8)' }}>{builderErro}</p>
              )}

              {/* Actions */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: 'auto', paddingTop: '8px' }}>
                <button
                  onClick={handleSalvar}
                  disabled={!canSave || salvando}
                  style={{
                    width: '100%', minHeight: '44px', borderRadius: '10px', border: 'none', outline: 'none', cursor: canSave ? 'pointer' : 'not-allowed',
                    background: canSave ? 'rgba(0,239,255,0.9)' : 'rgba(0,239,255,0.2)',
                    color: canSave ? '#0a0a1a' : 'rgba(0,239,255,0.35)',
                    fontSize: '14px', fontWeight: 700, transition: 'background 120ms',
                  }}
                  onMouseEnter={e => { if (canSave && !salvando) e.currentTarget.style.background = 'rgba(0,239,255,0.75)' }}
                  onMouseLeave={e => { if (canSave) e.currentTarget.style.background = 'rgba(0,239,255,0.9)' }}
                >
                  {salvando ? 'Salvando…' : 'Enviar para o caixa →'}
                </button>

                <button
                  onClick={handleCancelar}
                  disabled={salvando}
                  style={{ width: '100%', minHeight: '40px', background: 'transparent', border: '0.5px solid rgba(240,100,100,0.3)', borderRadius: '10px', color: 'rgba(240,100,100,0.55)', fontSize: '13px', cursor: 'pointer', outline: 'none', transition: 'background 120ms, border-color 120ms, color 120ms' }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(240,100,100,0.07)'; e.currentTarget.style.borderColor = 'rgba(240,100,100,0.5)'; e.currentTarget.style.color = 'rgba(240,100,100,0.9)' }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'rgba(240,100,100,0.3)'; e.currentTarget.style.color = 'rgba(240,100,100,0.55)' }}
                >
                  {editingId ? 'Cancelar sacola' : 'Descartar'}
                </button>
              </div>
            </div>
          </div>
        </main>
      )}

      {/* ── Modals ── */}
      <CustomerSearchModal
        open={modalCliente}
        onClose={() => setModalCliente(false)}
        onSelect={(c: any) => { setClienteId(c.id); setClienteNome(c.nome); setModalCliente(false) }}
      />

      {modalVariacao && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', background: 'rgba(2,8,16,0.82)' }}
          onClick={() => setModalVariacao(null)}
        >
          <div
            style={{ maxWidth: '380px', width: '100%', maxHeight: '80vh', background: 'rgba(8,18,30,0.98)', border: '0.5px solid rgba(255,255,255,0.12)', borderRadius: '16px', display: 'flex', flexDirection: 'column' }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ padding: '16px 20px', borderBottom: '0.5px solid rgba(255,255,255,0.07)' }}>
              <p style={{ fontSize: '14px', fontWeight: 600, color: 'rgba(255,255,255,0.85)' }}>{modalVariacao.produto.nome}</p>
              <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', marginTop: '2px' }}>Selecione uma variação</p>
            </div>
            <div style={{ overflowY: 'auto', padding: '10px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
              {(modalVariacao.produto.versoes ?? []).map((v: any) => {
                const preco   = v.preco_especifico ? +v.preco_especifico : +modalVariacao.produto.preco_base
                const attrTxt = Object.entries(v.atributos_json ?? {}).map(([k, val]) => `${k}: ${val}`).join(' · ')
                return (
                  <button
                    key={v.id}
                    onClick={() => selecionarVariacao(v, modalVariacao.produto, modalVariacao.qty)}
                    style={{ background: 'rgba(255,255,255,0.03)', border: '0.5px solid rgba(255,255,255,0.09)', borderRadius: '8px', padding: '10px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', textAlign: 'left', transition: 'background 120ms, border-color 120ms' }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(0,239,255,0.06)'; e.currentTarget.style.borderColor = 'rgba(0,239,255,0.25)' }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.09)' }}
                  >
                    <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.75)' }}>{attrTxt || 'Padrão'}</span>
                    <span style={{ fontSize: '13px', color: '#0ef', fontWeight: 600 }}>{fmtR(preco)}</span>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
