'use client'

import { useEffect, useRef, useState } from 'react'
import { ArrowLeft, Briefcase, RefreshCw, ShoppingBag, User, X } from 'lucide-react'
import { TopBar } from '@/components/layout/TopBar'
import { ClienteDadosModal } from '@/components/pdv/ClienteDadosModal'
import { CustomerSearchModal } from '@/components/pdv/CustomerSearchModal'
import { SalespersonSearchModal } from '@/components/pdv/SalespersonSearchModal'
import { sacolasApi, type SacolaRemota, type SacolaItemRemoto } from '@/lib/api/sacolas'
import { api } from '@/lib/api/client'
import { useAuthStore } from '@/store/auth.store'

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

  // ── View ────────────────────────────────────────────────────────────────────
  const [view,      setView]      = useState<'grid' | 'builder'>('grid')
  const [editingId, setEditingId] = useState<string | null>(null)

  // ── Grid ────────────────────────────────────────────────────────────────────
  const [sacolas,    setSacolas]    = useState<SacolaRemota[]>([])
  const [loading,    setLoading]    = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  // ── Builder ─────────────────────────────────────────────────────────────────
  const [itens,        setItens]        = useState<SacolaItem[]>([])
  const [clienteId,    setClienteId]    = useState<string | null>(null)
  const [clienteNome,  setClienteNome]  = useState<string | null>(null)
  const [vendedorId,   setVendedorId]   = useState<string | null>(null)
  const [vendedorNome, setVendedorNome] = useState<string | null>(null)
  const [salvando,     setSalvando]     = useState(false)
  const [builderErro,  setBuilderErro]  = useState('')

  // ── Auto-open client flag (resets on each new builder session) ──────────────
  const [autoClienteAberto, setAutoClienteAberto] = useState(false)

  // ── Modals ──────────────────────────────────────────────────────────────────
  const [modalCliente,  setModalCliente]  = useState(false)
  const [modalVendedor, setModalVendedor] = useState(false)
  const [modalDados,    setModalDados]    = useState(false)
  const [sistemaConfig, setSistemaConfig] = useState<any>(null)
  const [modalVariacao, setModalVariacao] = useState<{ produto: any; qty: number } | null>(null)
  const [focadoIdx,     setFocadoIdx]     = useState(0)

  // ── Search ──────────────────────────────────────────────────────────────────
  const scanRef = useRef<HTMLInputElement>(null)
  const [scan,         setScan]         = useState('')
  const [resultados,   setResultados]   = useState<ProdutoSearch[]>([])
  const [highlightIdx, setHighlightIdx] = useState(-1)
  const [scanErro,     setScanErro]     = useState('')

  // ── Load grid ────────────────────────────────────────────────────────────────
  async function loadGrid(soft = false) {
    soft ? setRefreshing(true) : setLoading(true)
    try { setSacolas(await sacolasApi.listPendentes()) }
    finally { setLoading(false); setRefreshing(false) }
  }

  useEffect(() => { loadGrid() }, [])

  useEffect(() => {
    api.get('/dados-loja/sistema').then(r => setSistemaConfig(r.data)).catch(() => {})
  }, [])

  // ── Open builder ─────────────────────────────────────────────────────────────
  function openCreate() {
    setItens([]); setClienteId(null); setClienteNome(null)
    setVendedorId(usuario?.id ?? null); setVendedorNome(usuario?.nome ?? null)
    setAutoClienteAberto(false)
    setEditingId(null); setScan(''); setResultados([])
    setScanErro(''); setBuilderErro(''); setModalVariacao(null)
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
    setVendedorId(s.criado_por)
    setVendedorNome(s.nome_vendedor)
    setAutoClienteAberto(false)
    setEditingId(s.id)
    setScan(''); setResultados([])
    setScanErro(''); setBuilderErro(''); setModalVariacao(null)
    setView('builder')
  }

  function backToGrid() { setView('grid'); loadGrid(true) }

  // ── Auto-open CustomerSearchModal on first item (FIX 3) ──────────────────────
  useEffect(() => {
    if (view !== 'builder') return
    if (itens.length === 1 && !clienteId && !autoClienteAberto) {
      setAutoClienteAberto(true)
      setModalCliente(true)
    }
  }, [itens.length, clienteId, view])

  // ── Auto-focus first non-esgotado card when variation modal opens (FIX 2) ───
  useEffect(() => {
    if (!modalVariacao) return
    const versoes: any[] = modalVariacao.produto.versoes ?? []
    const first = versoes.findIndex(
      (v: any) => !(modalVariacao.produto.controle_estoque && (v.estoque_atual ?? Infinity) <= 0)
    )
    setFocadoIdx(first >= 0 ? first : 0)
  }, [modalVariacao])

  // ── Keyboard nav for variation modal (FIX 2) ─────────────────────────────────
  useEffect(() => {
    if (!modalVariacao) return
    function onKey(e: KeyboardEvent) {
      const versoes: any[]   = modalVariacao!.produto.versoes ?? []
      const disponivel = versoes
        .map((v: any, i: number) => ({ v, i }))
        .filter(({ v }) => !(modalVariacao!.produto.controle_estoque && (v.estoque_atual ?? Infinity) <= 0))

      if (e.key === 'Escape') {
        e.preventDefault()
        setModalVariacao(null)
        setTimeout(() => scanRef.current?.focus(), 100)
        return
      }
      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
        e.preventDefault()
        const curr  = disponivel.findIndex(({ i }) => i === focadoIdx)
        const delta = e.key === 'ArrowRight' ? 1 : -1
        const next  = disponivel[(curr + delta + disponivel.length) % disponivel.length]
        if (next) setFocadoIdx(next.i)
        return
      }
      if (e.key === 'Enter') {
        e.preventDefault()
        const versao = versoes[focadoIdx]
        if (!versao) return
        if (modalVariacao!.produto.controle_estoque && (versao.estoque_atual ?? Infinity) <= 0) return
        selecionarVariacao(versao, modalVariacao!.produto, modalVariacao!.qty)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [modalVariacao, focadoIdx])

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

  // ── Product search ────────────────────────────────────────────────────────────
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

  // ── Save / cancel ─────────────────────────────────────────────────────────────
  async function handleSalvar() {
    if (!clienteId || itens.length === 0) return
    setSalvando(true); setBuilderErro('')
    try {
      if (editingId) {
        await sacolasApi.updateItens(editingId, itens as SacolaItemRemoto[], clienteId, clienteNome)
      } else {
        await sacolasApi.create({
          cliente_id: clienteId, cliente_nome: clienteNome,
          vendedor_id: vendedorId, vendedor_nome: vendedorNome,
          itens: itens as SacolaItemRemoto[],
        })
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
                      {(() => { const emAtend = s.status === 'em_atendimento'; return (
                        <span style={{ fontSize: '9px', fontWeight: 500, letterSpacing: '0.06em', textTransform: 'uppercase', borderRadius: '9999px', padding: '2px 8px', flexShrink: 0, background: emAtend ? 'rgba(255,165,0,0.10)' : 'rgba(0,239,255,0.10)', color: emAtend ? 'rgba(255,165,0,0.85)' : '#0ef', border: `0.5px solid ${emAtend ? 'rgba(255,165,0,0.30)' : 'rgba(0,239,255,0.30)'}` }}>
                          {emAtend ? 'No caixa' : 'Aguardando'}
                        </span>
                      ) })()}
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

            {/* ── RIGHT: client + vendedor + total + actions ── */}
            <div style={{ width: '256px', flexShrink: 0, display: 'flex', flexDirection: 'column', padding: '14px 16px', gap: '10px', overflowY: 'auto' }}>

              {/* ATRIBUIÇÃO DA VENDA */}
              <div style={{ background: 'rgba(8,18,30,0.52)', border: '0.5px solid rgba(255,255,255,0.09)', borderRadius: '10px', padding: '12px' }}>
                <span style={{ fontSize: '9px', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.1em', display: 'block', marginBottom: '10px' }}>Atribuição da venda</span>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '7px' }}>
                  {/* Cliente card */}
                  <div
                    role="button"
                    onClick={() => { if (clienteId) setModalDados(true); else setModalCliente(true) }}
                    style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '5px', padding: '14px 4px', borderRadius: '9px', cursor: 'pointer', overflow: 'hidden', background: clienteId ? 'rgba(0,239,255,0.07)' : 'rgba(255,255,255,0.03)', border: clienteId ? '0.5px solid rgba(0,239,255,0.35)' : '0.5px dashed rgba(255,255,255,0.14)' }}
                  >
                    <User size={19} style={{ color: clienteId ? 'rgba(0,239,255,0.8)' : 'rgba(255,255,255,0.4)', flexShrink: 0 }} />
                    <span style={{ fontSize: '9px', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Cliente</span>
                    {clienteNome && (
                      <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.85)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%', padding: '0 14px', textAlign: 'center' }}>
                        {clienteNome}
                      </span>
                    )}
                    {!clienteId && (
                      <span style={{ fontSize: '9px', color: 'rgba(240,100,100,0.6)', textAlign: 'center', padding: '0 6px', lineHeight: 1.3 }}>
                        Vincular cliente
                      </span>
                    )}
                    {clienteId && (
                      <button
                        onClick={e => { e.stopPropagation(); setClienteId(null); setClienteNome(null) }}
                        style={{ position: 'absolute', top: '5px', right: '5px', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2px' }}
                      >
                        <X size={10} />
                      </button>
                    )}
                  </div>
                  {/* Vendedor card */}
                  <div
                    role="button"
                    onClick={() => { if (!editingId) setModalVendedor(true) }}
                    style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '5px', padding: '14px 4px', borderRadius: '9px', cursor: editingId ? 'default' : 'pointer', overflow: 'hidden', background: vendedorId ? 'rgba(0,239,255,0.07)' : 'rgba(255,255,255,0.03)', border: vendedorId ? '0.5px solid rgba(0,239,255,0.35)' : '0.5px dashed rgba(255,255,255,0.14)' }}
                  >
                    <Briefcase size={19} style={{ color: vendedorId ? 'rgba(0,239,255,0.8)' : 'rgba(255,255,255,0.4)', flexShrink: 0 }} />
                    <span style={{ fontSize: '9px', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Vendedor</span>
                    {vendedorNome && (
                      <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.85)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%', padding: '0 14px', textAlign: 'center' }}>
                        {vendedorNome}
                      </span>
                    )}
                    {!editingId && vendedorId && (
                      <button
                        onClick={e => { e.stopPropagation(); setVendedorId(null); setVendedorNome(null) }}
                        style={{ position: 'absolute', top: '5px', right: '5px', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2px' }}
                      >
                        <X size={10} />
                      </button>
                    )}
                  </div>
                </div>
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
                {/* FIX 1: "Salvar sacola" */}
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
                  onFocus={e => { if (canSave) e.currentTarget.style.boxShadow = '0 0 0 2px rgba(0,239,255,0.35)' }}
                  onBlur={e => { e.currentTarget.style.boxShadow = 'none' }}
                >
                  {salvando ? 'Salvando…' : 'Salvar sacola'}
                </button>

                <button
                  onClick={handleCancelar}
                  disabled={salvando}
                  style={{ width: '100%', minHeight: '40px', background: 'transparent', border: '0.5px solid rgba(240,100,100,0.3)', borderRadius: '10px', color: 'rgba(240,100,100,0.55)', fontSize: '13px', cursor: 'pointer', outline: 'none', transition: 'background 120ms, border-color 120ms, color 120ms' }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(240,100,100,0.07)'; e.currentTarget.style.borderColor = 'rgba(240,100,100,0.5)'; e.currentTarget.style.color = 'rgba(240,100,100,0.9)' }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'rgba(240,100,100,0.3)'; e.currentTarget.style.color = 'rgba(240,100,100,0.55)' }}
                  onFocus={e => { e.currentTarget.style.boxShadow = '0 0 0 2px rgba(240,100,100,0.3)' }}
                  onBlur={e => { e.currentTarget.style.boxShadow = 'none' }}
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
        onSelect={(c: any) => {
          setClienteId(c.id)
          setClienteNome(c.nome)
          setModalCliente(false)
          const missing =
            (sistemaConfig?.cadastro_exige_cpf && !c.cpf) ||
            (sistemaConfig?.cadastro_exige_email && !c.email) ||
            (sistemaConfig?.cadastro_exige_endereco && (!c.cep && !c.logradouro)) ||
            !c.telefone
          if (missing) setModalDados(true)
        }}
      />

      <SalespersonSearchModal
        open={modalVendedor}
        onClose={() => setModalVendedor(false)}
        onSelect={(c: any) => { setVendedorId(c.id); setVendedorNome(c.nome); setModalVendedor(false) }}
      />

      <ClienteDadosModal
        open={modalDados}
        clienteId={clienteId}
        onClose={() => setModalDados(false)}
        onSaved={(c) => { setClienteNome(c.nome) }}
      />

      {/* ── Variation picker — card grid matching caixa (FIX 2) ── */}
      {modalVariacao && (() => {
        const { produto, qty } = modalVariacao
        const versoes: any[]  = produto.versoes ?? []
        return (
          <div
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            onClick={() => { setModalVariacao(null); setTimeout(() => scanRef.current?.focus(), 100) }}
          >
            <div
              style={{ background: 'rgba(12,25,45,0.99)', border: '0.5px solid rgba(255,255,255,0.14)', borderRadius: '14px', padding: '24px 20px 20px', width: '460px', maxWidth: '90vw', maxHeight: '88vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 0 }}
              onClick={e => e.stopPropagation()}
            >
              {/* Header */}
              <div style={{ textAlign: 'center', marginBottom: '18px' }}>
                <p style={{ fontSize: '16px', color: 'rgba(255,255,255,0.85)', fontWeight: 600, margin: '0 0 4px' }}>{produto.nome}</p>
                <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', margin: 0 }}>
                  {versoes.length} variação{versoes.length !== 1 ? 'ões' : ''} · clique para adicionar à sacola
                  {qty > 1 && <span style={{ color: 'rgba(0,239,255,0.6)' }}> · {qty} unidades</span>}
                </p>
              </div>

              {/* Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: '8px', marginBottom: '14px' }}>
                {versoes.map((versao: any, idx: number) => {
                  const esgotado = !!produto.controle_estoque && (versao.estoque_atual ?? Infinity) <= 0
                  const focused  = idx === focadoIdx && !esgotado
                  const preco    = versao.preco_especifico ? +versao.preco_especifico : +produto.preco_base
                  const atribs   = Object.entries(versao.atributos_json ?? {}) as [string, string][]
                  return (
                    <div
                      key={versao.id}
                      onClick={() => !esgotado && selecionarVariacao(versao, produto, qty)}
                      onMouseEnter={() => !esgotado && setFocadoIdx(idx)}
                      style={{
                        position: 'relative',
                        background: focused ? 'rgba(0,239,255,0.09)' : 'rgba(8,18,30,0.6)',
                        border: `0.5px solid ${focused ? 'rgba(0,239,255,0.7)' : 'rgba(255,255,255,0.09)'}`,
                        borderRadius: '10px',
                        padding: '14px 8px',
                        textAlign: 'center',
                        cursor: esgotado ? 'not-allowed' : 'pointer',
                        opacity: esgotado ? 0.35 : 1,
                        transition: 'border-color 0.1s, background 0.1s',
                      }}
                    >
                      {esgotado && (
                        <span style={{ position: 'absolute', top: '4px', right: '4px', fontSize: '8px', background: 'rgba(240,80,80,0.18)', border: '0.5px solid rgba(240,80,80,0.3)', borderRadius: '4px', padding: '1px 4px', color: 'rgba(240,130,130,0.8)' }}>
                          Esgotado
                        </span>
                      )}
                      {atribs.length === 0 ? (
                        <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)', margin: 0 }}>Versão única</p>
                      ) : atribs.map(([key, val], ai) => (
                        <div key={key}>
                          {ai > 0 && <div style={{ height: '0.5px', background: 'rgba(255,255,255,0.07)', margin: '6px auto', width: '60%' }} />}
                          <p style={{ fontSize: '8px', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 2px' }}>{key}</p>
                          <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.85)', fontWeight: 500, margin: 0, wordBreak: 'break-word' }}>{val}</p>
                        </div>
                      ))}
                      <p style={{ fontSize: '11px', color: '#0ef', marginTop: '8px', marginBottom: 0 }}>R$ {preco.toFixed(2)}</p>
                      {produto.controle_estoque && (
                        <p style={{ fontSize: '9px', color: 'rgba(255,255,255,0.25)', margin: '2px 0 0' }}>{versao.estoque_atual} em estoque</p>
                      )}
                    </div>
                  )
                })}
              </div>

              <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.2)', textAlign: 'center', margin: 0 }}>
                ← → navegar · Enter adicionar · Esc cancelar
              </p>
            </div>
          </div>
        )
      })()}
    </>
  )
}
