'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, ClipboardList, RefreshCw, ShoppingBag } from 'lucide-react'
import { TopBar } from '@/components/layout/TopBar'
import { CustomerSearchModal } from '@/components/pdv/CustomerSearchModal'
import { SalespersonSearchModal } from '@/components/pdv/SalespersonSearchModal'
import { provasApi, type ProvaRemota, type ProvaItemRemoto } from '@/lib/api/provas'
import { sacolasApi } from '@/lib/api/sacolas'
import { api } from '@/lib/api/client'
import { useAuthStore } from '@/store/auth.store'

type ViewMode = 'grid' | 'builder' | 'devolucao'
type GridTab  = 'ativas' | 'concluidas'

interface BuilderItem {
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
function fmtR(v: number) { return `R$ ${Number(v).toFixed(2).replace('.', ',')}` }

function fmtData(iso: string): string {
  const d = new Date(iso)
  return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}`
}

function fmtDataFull(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR')
}

function agoMin(iso: string) {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
  if (diff < 1) return 'agora'
  if (diff < 60) return `há ${diff} min`
  const h = Math.floor(diff / 60)
  if (h < 24) return `há ${h}h`
  return `há ${Math.floor(h/24)}d`
}

function diffDias(prazoIso: string): number {
  const today = new Date(); today.setHours(0,0,0,0)
  const prazo = new Date(prazoIso); prazo.setHours(0,0,0,0)
  return Math.round((prazo.getTime() - today.getTime()) / 86400000)
}

function parseQtyPrefix(raw: string): { qty: number; query: string } {
  const m = raw.match(/^(\d+)-(.+)$/)
  return m ? { qty: parseInt(m[1], 10), query: m[2].trim() } : { qty: 1, query: raw }
}

// ── Styles ────────────────────────────────────────────────────────────────────
const CARD: React.CSSProperties = {
  background:     'rgba(8,18,30,0.48)',
  backdropFilter: 'blur(8px)',
  border:         '0.5px solid rgba(255,255,255,0.09)',
  borderRadius:   '10px',
}

const PANEL: React.CSSProperties = {
  background:    'rgba(8,18,30,0.55)',
  backdropFilter:'blur(12px)',
  border:        '0.5px solid rgba(255,255,255,0.09)',
  borderRadius:  '12px',
}

function prazoBadge(prazo: string | null, alertaDias: number) {
  if (!prazo) return null
  const diff = diffDias(prazo)
  const data = fmtData(prazo)
  if (diff < 0) return { bg: 'rgba(240,100,100,0.08)', border: 'rgba(240,100,100,0.25)', color: 'rgba(240,100,100,0.85)', text: `Vencida · ${data}` }
  if (diff <= alertaDias) return { bg: 'rgba(234,179,8,0.08)', border: 'rgba(234,179,8,0.25)', color: 'rgba(234,179,8,0.9)', text: `Vence em ${diff}d · ${data}` }
  return { bg: 'rgba(100,220,160,0.08)', border: 'rgba(100,220,160,0.25)', color: 'rgba(100,220,160,0.85)', text: `Vence em ${diff}d · ${data}` }
}

function cardLeftBorder(prazo: string | null, alertaDias: number): string {
  if (!prazo) return 'none'
  const diff = diffDias(prazo)
  if (diff < 0) return '2px solid rgba(240,100,100,0.6)'
  if (diff <= alertaDias) return '2px solid rgba(234,179,8,0.5)'
  return '2px solid rgba(100,220,160,0.3)'
}

function statusBadge(status: ProvaRemota['status']) {
  switch (status) {
    case 'em_prova':        return { bg: 'rgba(0,239,255,0.08)',    border: 'rgba(0,239,255,0.25)',    color: '#0ef',                     text: 'Em prova' }
    case 'aguardando_caixa': return { bg: 'rgba(255,165,0,0.10)',  border: 'rgba(255,165,0,0.30)',    color: 'rgba(255,165,0,0.9)',      text: 'No caixa' }
    case 'finalizada':      return { bg: 'rgba(100,220,160,0.08)', border: 'rgba(100,220,160,0.25)', color: 'rgba(100,220,160,0.85)',   text: 'Finalizada' }
    case 'cancelada':       return { bg: 'rgba(255,255,255,0.04)', border: 'rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.35)',   text: 'Cancelada' }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
export default function ProvaEmCasaPage() {
  const usuario = useAuthStore(s => s.usuario)

  // ── View ────────────────────────────────────────────────────────────────────
  const [view,      setView]      = useState<ViewMode>('grid')
  const [gridTab,   setGridTab]   = useState<GridTab>('ativas')

  // ── Config ──────────────────────────────────────────────────────────────────
  const [alertaDias,       setAlertaDias]       = useState(2)
  const [provaHabilitada,  setProvaHabilitada]  = useState(true)
  const [prazObrig,        setPrazObrig]        = useState(false)

  // ── Grid ────────────────────────────────────────────────────────────────────
  const [provas,    setProvas]    = useState<ProvaRemota[]>([])
  const [loading,   setLoading]   = useState(true)
  const [refreshing,setRefreshing]= useState(false)

  // ── Devolução view ──────────────────────────────────────────────────────────
  const [provaAtiva,       setProvaAtiva]       = useState<ProvaRemota | null>(null)
  const [devolvidosLocal,  setDevolvidosLocal]  = useState<Set<string>>(new Set())
  const [devoluendoId,     setDevoluendoId]     = useState(false)
  const [devErro,          setDevErro]          = useState('')

  // ── Builder ─────────────────────────────────────────────────────────────────
  const [itens,        setItens]        = useState<BuilderItem[]>([])
  const [clienteId,    setClienteId]    = useState<string | null>(null)
  const [clienteNome,  setClienteNome]  = useState<string | null>(null)
  const [vendedorId,   setVendedorId]   = useState<string | null>(null)
  const [vendedorNome, setVendedorNome] = useState<string | null>(null)
  const [prazoInput,   setPrazoInput]   = useState('')
  const [observacao,   setObservacao]   = useState('')
  const [salvando,     setSalvando]     = useState(false)
  const [builderErro,  setBuilderErro]  = useState('')

  // ── Modals ──────────────────────────────────────────────────────────────────
  const [modalCliente,  setModalCliente]  = useState(false)
  const [modalVendedor, setModalVendedor] = useState(false)
  const [modalVariacao, setModalVariacao] = useState<{ produto: any; qty: number } | null>(null)
  const [focadoIdx,     setFocadoIdx]     = useState(0)
  const [modalImport,   setModalImport]   = useState(false)

  // ── Search ──────────────────────────────────────────────────────────────────
  const scanRef = useRef<HTMLInputElement>(null)
  const [scan,         setScan]         = useState('')
  const [resultados,   setResultados]   = useState<ProdutoSearch[]>([])
  const [highlightIdx, setHighlightIdx] = useState(-1)
  const [scanErro,     setScanErro]     = useState('')

  // ── Import sacola ────────────────────────────────────────────────────────────
  const [sacolasDisponiveis, setSacolasDisponiveis] = useState<any[]>([])
  const [importando,         setImportando]         = useState(false)
  const [importSacolaId,     setImportSacolaId]     = useState<string | null>(null)
  const [importPrazo,        setImportPrazo]        = useState('')
  const [importObs,          setImportObs]          = useState('')
  const [importErro,         setImportErro]         = useState('')

  // ── Load ─────────────────────────────────────────────────────────────────────
  async function loadData(soft = false) {
    soft ? setRefreshing(true) : setLoading(true)
    try {
      const sysRes = await api.get('/dados-loja/sistema')
      setAlertaDias(Number(sysRes.data.prova_alerta_dias ?? 2))
      setProvaHabilitada(sysRes.data.prova_habilitada ?? false)
      setPrazObrig(sysRes.data.prova_prazo_obrigatorio ?? false)
      try {
        const tab = gridTab === 'ativas' ? 'ativas' : 'concluidas'
        const { data } = await api.get<ProvaRemota[]>('/provas-em-casa', { params: { status: tab } })
        setProvas(data)
      } catch { setProvas([]) }
    } finally { setLoading(false); setRefreshing(false) }
  }

  useEffect(() => { loadData() }, [])

  async function reloadTab(tab: GridTab) {
    setGridTab(tab); setLoading(true)
    try {
      const { data } = await api.get<ProvaRemota[]>('/provas-em-casa', { params: { status: tab === 'ativas' ? 'ativas' : 'concluidas' } })
      setProvas(data)
    } catch { setProvas([]) }
    finally { setLoading(false) }
  }

  // ── Stats (em_prova only) ─────────────────────────────────────────────────
  const emProva      = provas.filter(p => p.status === 'em_prova').length
  const vencidas     = provas.filter(p => p.prazo && diffDias(p.prazo) < 0 && p.status === 'em_prova').length
  const venceProx    = provas.filter(p => p.prazo && p.status === 'em_prova' && diffDias(p.prazo) >= 0 && diffDias(p.prazo) <= alertaDias).length
  const totalProd    = provas.filter(p => p.status === 'em_prova').reduce((s, p) => s + p.itens.reduce((a, i) => a + Number(i.preco_unitario) * i.quantidade, 0), 0)

  // ── Open devolução ────────────────────────────────────────────────────────
  function openDevolucao(p: ProvaRemota) {
    setProvaAtiva(p)
    setDevolvidosLocal(new Set(p.itens.filter(i => i.devolvido).map(i => i.id)))
    setDevErro('')
    setView('devolucao')
  }

  // ── Builder helpers ─────────────────────────────────────────────────────────
  function openCreate() {
    setItens([]); setClienteId(null); setClienteNome(null)
    setVendedorId(usuario?.id ?? null); setVendedorNome(usuario?.nome ?? null)
    setPrazoInput(''); setObservacao('')
    setScan(''); setResultados([]); setScanErro(''); setBuilderErro(''); setModalVariacao(null)
    setView('builder')
  }

  function backToGrid() { setView('grid'); loadData(true) }

  function addItem(item: Omit<BuilderItem, 'quantidade'>, qty = 1) {
    setItens(prev => {
      const idx = prev.findIndex(i => i.versao_id === item.versao_id)
      if (idx >= 0) return prev.map((i, n) => n === idx ? { ...i, quantidade: i.quantidade + qty } : i)
      return [...prev, { ...item, quantidade: qty }]
    })
  }

  function removeItem(versao_id: string) { setItens(prev => prev.filter(i => i.versao_id !== versao_id)) }

  function setQtd(versao_id: string, qtd: number) {
    if (qtd <= 0) { removeItem(versao_id); return }
    setItens(prev => prev.map(i => i.versao_id === versao_id ? { ...i, quantidade: qtd } : i))
  }

  async function buscarBarcode(codigo: string, qty: number): Promise<boolean> {
    try {
      const { data } = await api.get<any>(`/produtos/barcode/${encodeURIComponent(codigo)}`)
      if (data.match === 'produto') {
        const p = data.produto; const versoes: any[] = data.versoes ?? []
        if (versoes.length === 1) {
          const v = versoes[0]
          addItem({ versao_id: v.id, produto_id: p.id, nome: p.nome, atributos: v.atributos_json ?? {}, codigo_barras: v.codigo_barras ?? null, preco_unitario: v.preco_especifico ? +v.preco_especifico : +p.preco_base }, qty)
        } else { setModalVariacao({ produto: { ...p, versoes }, qty }) }
      } else {
        addItem({ versao_id: data.id, produto_id: data.produto_id, nome: data.produto_nome, atributos: data.atributos_json ?? {}, codigo_barras: data.codigo_barras ?? null, preco_unitario: data.preco_especifico ? +data.preco_especifico : +data.preco_base }, qty)
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
        addItem({ versao_id: v.id, produto_id: p.id, nome: p.nome, atributos: v.atributos_json ?? {}, codigo_barras: v.codigo_barras ?? null, preco_unitario: v.preco_especifico ? +v.preco_especifico : +data.preco_base }, qty)
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
    if (e.key === 'ArrowDown') { e.preventDefault(); setHighlightIdx(i => Math.min(i + 1, resultados.length - 1)); return }
    if (e.key === 'ArrowUp')   { e.preventDefault(); setHighlightIdx(i => Math.max(i - 1, 0)); return }
    if (e.key === 'Escape')    { setResultados([]); setHighlightIdx(-1); return }
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
    addItem({ versao_id: v.id, produto_id: produto.id, nome: produto.nome, atributos: v.atributos_json ?? {}, codigo_barras: v.codigo_barras ?? null, preco_unitario: preco }, qty)
    setModalVariacao(null); setScan(''); scanRef.current?.focus()
  }

  useEffect(() => {
    if (!modalVariacao) return
    const versoes: any[] = modalVariacao.produto.versoes ?? []
    const first = versoes.findIndex((v: any) => !(modalVariacao.produto.controle_estoque && (v.estoque_atual ?? Infinity) <= 0))
    setFocadoIdx(first >= 0 ? first : 0)
  }, [modalVariacao])

  useEffect(() => {
    if (!modalVariacao) return
    function onKey(e: KeyboardEvent) {
      const versoes: any[] = modalVariacao!.produto.versoes ?? []
      const disponivel = versoes.map((v: any, i: number) => ({ v, i })).filter(({ v }) => !(modalVariacao!.produto.controle_estoque && (v.estoque_atual ?? Infinity) <= 0))
      if (e.key === 'Escape') { e.preventDefault(); setModalVariacao(null); setTimeout(() => scanRef.current?.focus(), 100); return }
      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
        e.preventDefault()
        const curr = disponivel.findIndex(({ i }) => i === focadoIdx)
        const delta = e.key === 'ArrowRight' ? 1 : -1
        const next = disponivel[(curr + delta + disponivel.length) % disponivel.length]
        if (next) setFocadoIdx(next.i); return
      }
      if (e.key === 'Enter') {
        e.preventDefault()
        const versao = versoes[focadoIdx]; if (!versao) return
        if (modalVariacao!.produto.controle_estoque && (versao.estoque_atual ?? Infinity) <= 0) return
        selecionarVariacao(versao, modalVariacao!.produto, modalVariacao!.qty)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [modalVariacao, focadoIdx])

  // ── Save builder ──────────────────────────────────────────────────────────
  const total    = itens.reduce((s, i) => s + i.preco_unitario * i.quantidade, 0)
  const totalQtd = itens.reduce((s, i) => s + i.quantidade, 0)
  const canSave  = !!clienteId && itens.length > 0 && (!prazObrig || !!prazoInput)

  async function handleSalvar() {
    if (!canSave) return
    setSalvando(true); setBuilderErro('')
    try {
      await provasApi.create({
        cliente_id:   clienteId, cliente_nome: clienteNome,
        vendedor_id:  vendedorId, vendedor_nome: vendedorNome,
        prazo:        prazoInput || null,
        observacao:   observacao || null,
        itens: itens.map(i => ({
          versao_id: i.versao_id, produto_id: i.produto_id, nome: i.nome,
          atributos: i.atributos, preco_unitario: i.preco_unitario,
          quantidade: i.quantidade, codigo_barras: i.codigo_barras ?? null,
        })),
      })
      backToGrid()
    } catch (e: any) {
      setBuilderErro(e?.response?.data?.error ?? 'Erro ao salvar prova.')
    } finally { setSalvando(false) }
  }

  // ── Devolução actions ─────────────────────────────────────────────────────
  function toggleDevolvido(id: string) {
    setDevolvidosLocal(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  async function confirmarDevolucao() {
    if (!provaAtiva) return
    const novosDevolvidos = [...devolvidosLocal].filter(id => !provaAtiva.itens.find(i => i.id === id && i.devolvido))
    if (novosDevolvidos.length === 0) { setDevErro('Nenhum item novo para devolver.'); return }
    setDevoluendoId(true); setDevErro('')
    try {
      const updated = await provasApi.devolver(provaAtiva.id, novosDevolvidos)
      setProvaAtiva(updated)
      setDevolvidosLocal(new Set(updated.itens.filter(i => i.devolvido).map(i => i.id)))
    } catch (e: any) {
      setDevErro(e?.response?.data?.error ?? 'Erro ao registrar devolução.')
    } finally { setDevoluendoId(false) }
  }

  async function liberarCaixa() {
    if (!provaAtiva) return
    setDevoluendoId(true); setDevErro('')
    try {
      await provasApi.liberarCaixa(provaAtiva.id)
      backToGrid()
    } catch (e: any) {
      setDevErro(e?.response?.data?.error ?? 'Erro ao liberar para o caixa.')
    } finally { setDevoluendoId(false) }
  }

  async function cancelarProva() {
    if (!provaAtiva) return
    setDevoluendoId(true); setDevErro('')
    try {
      await provasApi.cancelar(provaAtiva.id)
      backToGrid()
    } catch (e: any) {
      setDevErro(e?.response?.data?.error ?? 'Erro ao cancelar prova.')
    } finally { setDevoluendoId(false) }
  }

  // ── Import sacola ─────────────────────────────────────────────────────────
  async function openImport() {
    setModalImport(true); setImportErro(''); setImportPrazo(''); setImportObs(''); setImportSacolaId(null)
    try {
      const sacolas = await sacolasApi.list('aguardando')
      setSacolasDisponiveis(sacolas)
    } catch { setSacolasDisponiveis([]) }
  }

  async function confirmarImport() {
    if (!importSacolaId) { setImportErro('Selecione uma sacola.'); return }
    setImportando(true); setImportErro('')
    try {
      const sacola = sacolasDisponiveis.find(s => s.id === importSacolaId)
      if (!sacola) throw new Error('Sacola não encontrada.')
      await provasApi.create({
        cliente_id:   sacola.cliente_id, cliente_nome: sacola.cliente_nome,
        vendedor_id:  sacola.criado_por, vendedor_nome: sacola.nome_vendedor,
        prazo:        importPrazo || null, observacao: importObs || null,
        itens: sacola.itens.map((i: any) => ({
          versao_id: i.versao_id, produto_id: i.produto_id, nome: i.nome,
          atributos: i.atributos, preco_unitario: Number(i.preco_unitario),
          quantidade: i.quantidade, codigo_barras: i.codigo_barras ?? null,
        })),
      })
      await sacolasApi.cancelar(importSacolaId)
      setModalImport(false)
      loadData(true)
    } catch (e: any) {
      setImportErro(e?.response?.data?.error ?? 'Erro ao importar sacola.')
    } finally { setImportando(false) }
  }

  // ── Computed for devolução view ──────────────────────────────────────────
  const itensAtivos   = provaAtiva?.itens.filter(i => !devolvidosLocal.has(i.id)) ?? []
  const todoDevolvido = provaAtiva ? provaAtiva.itens.every(i => devolvidosLocal.has(i.id)) : false
  const novaDevolucaoPendente = provaAtiva
    ? [...devolvidosLocal].some(id => !provaAtiva.itens.find(i => i.id === id && i.devolvido))
    : false

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <>
      <TopBar />

      {/* ════════════════════════════ GRID VIEW ════════════════════════════ */}
      {view === 'grid' && (
        <main className="flex-1 min-h-0 overflow-y-auto p-4 md:p-5 pb-24 flex flex-col gap-4">

          {/* Module disabled */}
          {!loading && !provaHabilitada && (
            <div style={{ ...CARD, padding: '40px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', textAlign: 'center' }}>
              <ClipboardList size={36} style={{ color: 'rgba(255,255,255,0.15)' }} />
              <p style={{ fontSize: '14px', fontWeight: 500, color: 'rgba(255,255,255,0.45)' }}>Módulo desativado</p>
              <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)', maxWidth: '280px', lineHeight: 1.6 }}>Ative em Configurações › Sistema › Prova em Casa.</p>
              <Link href="/painel/configuracoes/sistema" style={{ fontSize: '12px', color: '#0ef', background: 'rgba(0,239,255,0.1)', border: '0.5px solid rgba(0,239,255,0.25)', borderRadius: '8px', padding: '7px 16px', textDecoration: 'none' }}>
                Ir para Configurações
              </Link>
            </div>
          )}

          {(loading || provaHabilitada) && <>

            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)' }}>
                Produtos enviados para prova em casa. Gerencie devoluções e finalizações.
              </p>
              <button
                onClick={() => loadData(true)} disabled={refreshing}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.4)', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', padding: '4px 8px', borderRadius: '6px' }}
                onMouseEnter={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.75)' }}
                onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.4)' }}
              >
                <RefreshCw size={12} style={{ animation: refreshing ? 'spin 1s linear infinite' : undefined }} />
                Atualizar
              </button>
            </div>

            {/* Stats (em_prova only) */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
              {([
                { label: 'Em prova',           value: String(emProva),   color: '#0ef' },
                { label: 'Vencem hoje/amanhã', value: String(venceProx), color: 'rgba(234,179,8,0.9)' },
                { label: 'Vencidas',           value: String(vencidas),  color: 'rgba(240,100,100,0.85)' },
                { label: 'Total em produtos',  value: fmtR(totalProd),   color: 'rgba(255,255,255,0.75)' },
              ] as const).map(({ label, value, color }) => (
                <div key={label} style={{ ...CARD, padding: '14px 16px' }}>
                  <p style={{ fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.3)', marginBottom: '6px' }}>{label}</p>
                  <p style={{ fontSize: '20px', fontWeight: 700, color }}>{value}</p>
                </div>
              ))}
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', gap: '20px', borderBottom: '0.5px solid rgba(255,255,255,0.07)', paddingBottom: '8px' }}>
              {(['ativas', 'concluidas'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => reloadTab(tab)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0 0 8px', fontSize: '13px', fontWeight: gridTab === tab ? 600 : 400, color: gridTab === tab ? '#0ef' : 'rgba(255,255,255,0.4)', borderBottom: gridTab === tab ? '2px solid #0ef' : '2px solid transparent', marginBottom: '-9px', transition: 'color 120ms' }}
                >
                  {tab === 'ativas' ? 'Ativas' : 'Concluídas'}
                </button>
              ))}
            </div>

            {/* List */}
            {loading ? (
              <div style={{ display: 'flex', justifyContent: 'center', paddingTop: '64px' }}>
                <div className="w-6 h-6 border-2 border-electric-cyan border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <ProvaList
                provas={provas}
                gridTab={gridTab}
                alertaDias={alertaDias}
                onClickEmProva={openDevolucao}
              />
            )}

          </>}

          {/* FABs */}
          {provaHabilitada && (
            <>
              <button
                onClick={openImport}
                className="fixed bottom-6 right-20 z-50 flex items-center gap-2 shadow-lg active:scale-95 transition-transform"
                style={{ height: '48px', padding: '0 18px', background: 'rgba(255,255,255,0.07)', borderRadius: '24px', color: 'rgba(255,255,255,0.6)', fontSize: '12px', fontWeight: 600, border: '0.5px solid rgba(255,255,255,0.15)', outline: 'none', cursor: 'pointer' }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.12)'; e.currentTarget.style.color = 'rgba(255,255,255,0.9)' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.07)'; e.currentTarget.style.color = 'rgba(255,255,255,0.6)' }}
              >
                <ShoppingBag size={14} />
                Importar sacola
              </button>
              <button
                onClick={openCreate}
                className="fixed bottom-6 right-6 z-50 flex items-center justify-center shadow-lg active:scale-95 transition-transform"
                style={{ width: '48px', height: '48px', background: 'rgba(0,239,255,0.9)', borderRadius: '50%', color: '#0a0a1a', fontSize: '24px', fontWeight: 700, border: 'none', outline: 'none', cursor: 'pointer' }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(0,239,255,0.75)' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(0,239,255,0.9)' }}
              >+</button>
            </>
          )}
        </main>
      )}

      {/* ════════════════════════════ BUILDER VIEW ════════════════════════════ */}
      {view === 'builder' && (
        <main style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* Breadcrumb */}
          <div style={{ padding: '10px 16px', borderBottom: '0.5px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
            <button onClick={backToGrid} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.45)', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', padding: '4px 8px', borderRadius: '6px' }}
              onMouseEnter={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.85)' }}
              onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.45)' }}
            >
              <ArrowLeft size={14} />Prova em Casa
            </button>
            <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.2)' }}>/</span>
            <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.65)', fontWeight: 500 }}>Nova prova em casa</span>
          </div>

          {/* Two-column body */}
          <div style={{ flex: 1, minHeight: 0, display: 'flex' }}>

            {/* LEFT: items + search */}
            <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', padding: '14px 16px', gap: '10px', borderRight: '0.5px solid rgba(255,255,255,0.07)' }}>
              <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
                {itens.length === 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '8px', opacity: 0.3 }}>
                    <ClipboardList size={36} />
                    <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>Adicione produtos com o campo abaixo</p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    {itens.map(item => {
                      const attrText = Object.entries(item.atributos ?? {}).map(([k, v]) => `${k}: ${v}`).join(' · ')
                      return (
                        <div key={item.versao_id} style={{ ...CARD, padding: '9px 12px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{ fontSize: '13px', fontWeight: 500, color: 'rgba(255,255,255,0.85)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.nome}</p>
                            {attrText && <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', marginTop: '2px' }}>{attrText}</p>}
                            <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', marginTop: '2px' }}>{fmtR(item.preco_unitario)} un.</p>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                            <button onClick={() => setQtd(item.versao_id, item.quantidade - 1)} style={{ width: '26px', height: '26px', background: 'rgba(255,255,255,0.06)', border: '0.5px solid rgba(255,255,255,0.12)', borderRadius: '6px', color: 'rgba(255,255,255,0.6)', fontSize: '16px', lineHeight: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.12)' }}
                              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)' }}
                            >−</button>
                            <span style={{ fontSize: '14px', fontWeight: 600, color: 'rgba(255,255,255,0.85)', minWidth: '22px', textAlign: 'center' }}>{item.quantidade}</span>
                            <button onClick={() => setQtd(item.versao_id, item.quantidade + 1)} style={{ width: '26px', height: '26px', background: 'rgba(255,255,255,0.06)', border: '0.5px solid rgba(255,255,255,0.12)', borderRadius: '6px', color: 'rgba(255,255,255,0.6)', fontSize: '16px', lineHeight: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.12)' }}
                              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)' }}
                            >+</button>
                          </div>
                          <p style={{ fontSize: '13px', fontWeight: 600, color: '#0ef', minWidth: '70px', textAlign: 'right', flexShrink: 0 }}>{fmtR(item.preco_unitario * item.quantidade)}</p>
                          <button onClick={() => removeItem(item.versao_id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.2)', fontSize: '18px', lineHeight: 1, flexShrink: 0, padding: '2px 4px' }}
                            onMouseEnter={e => { e.currentTarget.style.color = 'rgba(248,113,113,0.8)' }}
                            onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.2)' }}
                          >×</button>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Search */}
              <div style={{ flexShrink: 0, position: 'relative' }}>
                {scanErro && <p style={{ fontSize: '11px', color: 'rgba(248,113,113,0.8)', marginBottom: '5px' }}>{scanErro}</p>}
                {resultados.length > 0 && (
                  <div style={{ position: 'absolute', bottom: '100%', left: 0, right: 0, marginBottom: '4px', background: 'rgba(8,18,30,0.98)', border: '0.5px solid rgba(255,255,255,0.12)', borderRadius: '10px', overflow: 'hidden', zIndex: 20 }}>
                    {resultados.slice(0, 7).map((p, idx) => (
                      <div key={p.id} onMouseDown={() => { setResultados([]); selecionarProduto(p) }}
                        style={{ padding: '9px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', background: idx === highlightIdx ? 'rgba(0,239,255,0.08)' : 'transparent', borderBottom: idx < Math.min(resultados.length,7)-1 ? '0.5px solid rgba(255,255,255,0.05)' : 'none' }}
                        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(0,239,255,0.06)' }}
                        onMouseLeave={e => { e.currentTarget.style.background = idx === highlightIdx ? 'rgba(0,239,255,0.08)' : 'transparent' }}
                      >
                        <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.8)' }}>{p.nome}</span>
                        <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.35)' }}>R$ {(+p.preco_base).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                )}
                <input ref={scanRef} value={scan}
                  onChange={e => { setScan(e.target.value); buscarTexto(e.target.value); setScanErro('') }}
                  onKeyDown={onScanKeyDown}
                  placeholder="Código de barras, nome… ou '3-item' para qty 3"
                  className="outline-none w-full" autoFocus
                  style={{ background: 'rgba(8,18,30,0.5)', border: '0.5px solid rgba(255,255,255,0.12)', borderRadius: '10px', padding: '10px 14px', fontSize: '13px', color: 'rgba(255,255,255,0.75)' }}
                  onFocus={e => { e.currentTarget.style.borderColor = 'rgba(0,239,255,0.4)' }}
                  onBlur={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)' }}
                />
              </div>
            </div>

            {/* RIGHT: meta + actions */}
            <div style={{ width: '264px', flexShrink: 0, display: 'flex', flexDirection: 'column', padding: '14px 16px', gap: '10px', overflowY: 'auto' }}>

              {/* Cliente */}
              <div style={{ ...PANEL, padding: '12px' }}>
                <p style={{ fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.3)', marginBottom: '8px' }}>Cliente *</p>
                {clienteId ? (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
                    <p style={{ fontSize: '13px', fontWeight: 500, color: 'rgba(255,255,255,0.85)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{clienteNome}</p>
                    <button onClick={() => setModalCliente(true)} style={{ fontSize: '11px', color: 'rgba(0,239,255,0.7)', background: 'none', border: 'none', cursor: 'pointer', flexShrink: 0 }}
                      onMouseEnter={e => { e.currentTarget.style.color = '#0ef' }}
                      onMouseLeave={e => { e.currentTarget.style.color = 'rgba(0,239,255,0.7)' }}
                    >Trocar</button>
                  </div>
                ) : (
                  <button onClick={() => setModalCliente(true)} style={{ width: '100%', padding: '7px 0', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(240,100,100,0.6)', fontSize: '12px', textAlign: 'left' }}
                    onMouseEnter={e => { e.currentTarget.style.color = 'rgba(240,100,100,0.9)' }}
                    onMouseLeave={e => { e.currentTarget.style.color = 'rgba(240,100,100,0.6)' }}
                  >Vincular cliente (obrigatório)</button>
                )}
              </div>

              {/* Vendedor */}
              <div style={{ ...PANEL, padding: '12px' }}>
                <p style={{ fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.3)', marginBottom: '6px' }}>Vendedor</p>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
                  <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.75)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{vendedorNome ?? '—'}</p>
                  <button onClick={() => setModalVendedor(true)} style={{ fontSize: '11px', color: 'rgba(0,239,255,0.7)', background: 'none', border: 'none', cursor: 'pointer', flexShrink: 0 }}
                    onMouseEnter={e => { e.currentTarget.style.color = '#0ef' }}
                    onMouseLeave={e => { e.currentTarget.style.color = 'rgba(0,239,255,0.7)' }}
                  >Trocar</button>
                </div>
                <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.2)', marginTop: '2px' }}>logado automaticamente</p>
              </div>

              {/* Prazo */}
              <div style={{ ...PANEL, padding: '12px' }}>
                <p style={{ fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.3)', marginBottom: '8px' }}>
                  Data de devolução{prazObrig ? ' *' : ''}
                </p>
                <input
                  type="date" value={prazoInput}
                  onChange={e => setPrazoInput(e.target.value)}
                  className="outline-none w-full"
                  style={{ background: 'rgba(8,18,30,0.5)', border: '0.5px solid rgba(255,255,255,0.12)', borderRadius: '8px', padding: '8px 10px', fontSize: '13px', color: 'rgba(255,255,255,0.75)', colorScheme: 'dark' }}
                  onFocus={e => { e.currentTarget.style.borderColor = 'rgba(0,239,255,0.4)' }}
                  onBlur={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)' }}
                />
              </div>

              {/* Observações */}
              <div style={{ ...PANEL, padding: '12px' }}>
                <p style={{ fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.3)', marginBottom: '8px' }}>Observações</p>
                <textarea value={observacao} onChange={e => setObservacao(e.target.value)} rows={3} maxLength={400} placeholder="Opcional…" className="outline-none w-full resize-none"
                  style={{ background: 'rgba(8,18,30,0.5)', border: '0.5px solid rgba(255,255,255,0.12)', borderRadius: '8px', padding: '8px 10px', fontSize: '12px', color: 'rgba(255,255,255,0.75)', lineHeight: 1.5 }}
                  onFocus={e => { e.currentTarget.style.borderColor = 'rgba(0,239,255,0.4)' }}
                  onBlur={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)' }}
                />
              </div>

              {/* Total */}
              <div style={{ ...PANEL, padding: '12px' }}>
                <p style={{ fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.3)', marginBottom: '6px' }}>Total</p>
                <p style={{ fontSize: '22px', fontWeight: 700, color: '#0ef' }}>{fmtR(total)}</p>
                <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', marginTop: '2px' }}>{totalQtd} item{totalQtd !== 1 ? 'ns' : ''}</p>
              </div>

              {builderErro && <p style={{ fontSize: '12px', color: 'rgba(248,113,113,0.8)' }}>{builderErro}</p>}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: 'auto', paddingTop: '8px' }}>
                <button onClick={handleSalvar} disabled={!canSave || salvando}
                  style={{ width: '100%', minHeight: '44px', borderRadius: '10px', border: 'none', outline: 'none', cursor: canSave ? 'pointer' : 'not-allowed', background: canSave ? 'rgba(0,239,255,0.9)' : 'rgba(0,239,255,0.2)', color: canSave ? '#0a0a1a' : 'rgba(0,239,255,0.35)', fontSize: '14px', fontWeight: 700, transition: 'background 120ms' }}
                  onMouseEnter={e => { if (canSave && !salvando) e.currentTarget.style.background = 'rgba(0,239,255,0.75)' }}
                  onMouseLeave={e => { if (canSave) e.currentTarget.style.background = 'rgba(0,239,255,0.9)' }}
                >{salvando ? 'Salvando…' : 'Salvar prova'}</button>

                <button onClick={backToGrid} disabled={salvando}
                  style={{ width: '100%', minHeight: '40px', background: 'transparent', border: '0.5px solid rgba(240,100,100,0.3)', borderRadius: '10px', color: 'rgba(240,100,100,0.55)', fontSize: '13px', cursor: 'pointer', outline: 'none', transition: 'background 120ms, border-color 120ms, color 120ms' }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(240,100,100,0.07)'; e.currentTarget.style.borderColor = 'rgba(240,100,100,0.5)'; e.currentTarget.style.color = 'rgba(240,100,100,0.9)' }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'rgba(240,100,100,0.3)'; e.currentTarget.style.color = 'rgba(240,100,100,0.55)' }}
                >Descartar</button>
              </div>
            </div>
          </div>
        </main>
      )}

      {/* ═══════════════════════════ DEVOLUÇÃO VIEW ════════════════════════════ */}
      {view === 'devolucao' && provaAtiva && (
        <main style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* Breadcrumb */}
          <div style={{ padding: '10px 16px', borderBottom: '0.5px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
            <button onClick={backToGrid} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.45)', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', padding: '4px 8px', borderRadius: '6px' }}
              onMouseEnter={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.85)' }}
              onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.45)' }}
            ><ArrowLeft size={14} />Prova em Casa</button>
            <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.2)' }}>/</span>
            <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.65)', fontWeight: 500 }}>{provaAtiva.cliente_nome ?? 'Sem cliente'}</span>
          </div>

          <div style={{ flex: 1, minHeight: 0, display: 'flex' }}>
            {/* LEFT: itens com toggle */}
            <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', padding: '14px 16px', gap: '10px', borderRight: '0.5px solid rgba(255,255,255,0.07)', overflowY: 'auto' }}>
              <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', flexShrink: 0 }}>Marque os itens que foram devolvidos:</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {provaAtiva.itens.map(item => {
                  const jaDevolvido   = provaAtiva.itens.find(i => i.id === item.id)?.devolvido ?? false
                  const marcado       = devolvidosLocal.has(item.id)
                  const attrText      = Object.values(item.atributos ?? {}).join(' · ')
                  return (
                    <div
                      key={item.id}
                      onClick={() => !jaDevolvido && toggleDevolvido(item.id)}
                      style={{ ...CARD, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: '12px', cursor: jaDevolvido ? 'default' : 'pointer', opacity: marcado ? 0.5 : 1, transition: 'opacity 120ms, background 120ms' }}
                      onMouseEnter={e => { if (!jaDevolvido) e.currentTarget.style.background = 'rgba(255,255,255,0.04)' }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'rgba(8,18,30,0.48)' }}
                    >
                      {/* Checkbox */}
                      <div style={{ width: '18px', height: '18px', borderRadius: '4px', border: `1.5px solid ${marcado ? 'rgba(100,220,160,0.8)' : 'rgba(255,255,255,0.2)'}`, background: marcado ? 'rgba(100,220,160,0.15)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 120ms' }}>
                        {marcado && <span style={{ color: 'rgba(100,220,160,0.9)', fontSize: '12px', lineHeight: 1 }}>✓</span>}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: '13px', fontWeight: 500, color: 'rgba(255,255,255,0.85)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textDecoration: marcado ? 'line-through' : 'none' }}>{item.nome}</p>
                        {attrText && <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', marginTop: '1px' }}>{attrText}</p>}
                      </div>
                      <div style={{ flexShrink: 0, textAlign: 'right' }}>
                        <p style={{ fontSize: '12px', fontWeight: 600, color: marcado ? 'rgba(255,255,255,0.25)' : '#0ef' }}>{fmtR(Number(item.preco_unitario) * item.quantidade)}</p>
                        <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)' }}>× {item.quantidade}</p>
                      </div>
                    </div>
                  )
                })}
              </div>

              {devErro && <p style={{ fontSize: '12px', color: 'rgba(248,113,113,0.8)', flexShrink: 0 }}>{devErro}</p>}

              {/* Actions */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: 'auto', paddingTop: '8px', flexShrink: 0 }}>
                {novaDevolucaoPendente && (
                  <button onClick={confirmarDevolucao} disabled={devoluendoId}
                    style={{ width: '100%', minHeight: '44px', borderRadius: '10px', border: 'none', outline: 'none', cursor: 'pointer', background: 'rgba(100,220,160,0.9)', color: '#0a0a1a', fontSize: '14px', fontWeight: 700 }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(100,220,160,0.75)' }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'rgba(100,220,160,0.9)' }}
                  >{devoluendoId ? 'Registrando…' : 'Confirmar devolução'}</button>
                )}

                {!todoDevolvido && !novaDevolucaoPendente && (
                  <button onClick={liberarCaixa} disabled={devoluendoId}
                    style={{ width: '100%', minHeight: '44px', borderRadius: '10px', border: 'none', outline: 'none', cursor: 'pointer', background: 'rgba(0,239,255,0.9)', color: '#0a0a1a', fontSize: '14px', fontWeight: 700 }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(0,239,255,0.75)' }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'rgba(0,239,255,0.9)' }}
                  >{devoluendoId ? 'Processando…' : 'Liberar para o caixa'}</button>
                )}

                {todoDevolvido && (
                  <button onClick={cancelarProva} disabled={devoluendoId}
                    style={{ width: '100%', minHeight: '44px', borderRadius: '10px', border: '0.5px solid rgba(240,100,100,0.35)', outline: 'none', cursor: 'pointer', background: 'rgba(240,100,100,0.08)', color: 'rgba(240,100,100,0.8)', fontSize: '14px', fontWeight: 700 }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(240,100,100,0.15)' }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'rgba(240,100,100,0.08)' }}
                  >{devoluendoId ? 'Cancelando…' : 'Cancelar prova (todos devolvidos)'}</button>
                )}
              </div>
            </div>

            {/* RIGHT: summary */}
            <div style={{ width: '248px', flexShrink: 0, display: 'flex', flexDirection: 'column', padding: '14px 16px', gap: '10px', overflowY: 'auto' }}>
              <div style={{ ...PANEL, padding: '12px' }}>
                <p style={{ fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.3)', marginBottom: '8px' }}>Cliente</p>
                <p style={{ fontSize: '14px', fontWeight: 600, color: 'rgba(255,255,255,0.85)' }}>{provaAtiva.cliente_nome ?? 'Sem cliente'}</p>
              </div>
              <div style={{ ...PANEL, padding: '12px' }}>
                <p style={{ fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.3)', marginBottom: '6px' }}>Vendedor</p>
                <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.65)' }}>{provaAtiva.nome_vendedor ?? '—'}</p>
              </div>
              {provaAtiva.prazo && (() => {
                const badge = prazoBadge(provaAtiva.prazo, alertaDias)
                return badge ? (
                  <div style={{ ...PANEL, padding: '12px' }}>
                    <p style={{ fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.3)', marginBottom: '6px' }}>Prazo</p>
                    <span style={{ fontSize: '11px', padding: '3px 10px', borderRadius: '9999px', background: badge.bg, border: `0.5px solid ${badge.border}`, color: badge.color }}>{badge.text}</span>
                  </div>
                ) : null
              })()}
              {provaAtiva.observacao && (
                <div style={{ ...PANEL, padding: '12px' }}>
                  <p style={{ fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.3)', marginBottom: '6px' }}>Observações</p>
                  <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.55)', lineHeight: 1.5 }}>{provaAtiva.observacao}</p>
                </div>
              )}
              <div style={{ ...PANEL, padding: '12px' }}>
                <p style={{ fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.3)', marginBottom: '6px' }}>Itens restantes</p>
                <p style={{ fontSize: '22px', fontWeight: 700, color: '#0ef' }}>{fmtR(itensAtivos.reduce((s, i) => s + Number(i.preco_unitario) * i.quantidade, 0))}</p>
                <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', marginTop: '2px' }}>{itensAtivos.reduce((s, i) => s + i.quantidade, 0)} item{itensAtivos.length !== 1 ? 'ns' : ''}</p>
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

      <SalespersonSearchModal
        open={modalVendedor}
        onClose={() => setModalVendedor(false)}
        onSelect={(c: any) => { setVendedorId(c.id); setVendedorNome(c.nome); setModalVendedor(false) }}
      />

      {/* Variation picker */}
      {modalVariacao && (() => {
        const { produto, qty } = modalVariacao
        const versoes: any[] = produto.versoes ?? []
        return (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            onClick={() => { setModalVariacao(null); setTimeout(() => scanRef.current?.focus(), 100) }}
          >
            <div style={{ background: 'rgba(12,25,45,0.99)', border: '0.5px solid rgba(255,255,255,0.14)', borderRadius: '14px', padding: '24px 20px 20px', width: '460px', maxWidth: '90vw', maxHeight: '88vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 0 }}
              onClick={e => e.stopPropagation()}
            >
              <div style={{ textAlign: 'center', marginBottom: '18px' }}>
                <p style={{ fontSize: '16px', color: 'rgba(255,255,255,0.85)', fontWeight: 600, margin: '0 0 4px' }}>{produto.nome}</p>
                <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', margin: 0 }}>
                  {versoes.length} variação{versoes.length !== 1 ? 'ões' : ''} · clique para adicionar à prova
                  {qty > 1 && <span style={{ color: 'rgba(0,239,255,0.6)' }}> · {qty} unidades</span>}
                </p>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: '8px', marginBottom: '14px' }}>
                {versoes.map((versao: any, idx: number) => {
                  const esgotado = !!produto.controle_estoque && (versao.estoque_atual ?? Infinity) <= 0
                  const focused  = idx === focadoIdx && !esgotado
                  const preco    = versao.preco_especifico ? +versao.preco_especifico : +produto.preco_base
                  const atribs   = Object.entries(versao.atributos_json ?? {}) as [string, string][]
                  return (
                    <div key={versao.id} onClick={() => !esgotado && selecionarVariacao(versao, produto, qty)} onMouseEnter={() => !esgotado && setFocadoIdx(idx)}
                      style={{ position: 'relative', background: focused ? 'rgba(0,239,255,0.09)' : 'rgba(8,18,30,0.6)', border: `0.5px solid ${focused ? 'rgba(0,239,255,0.7)' : 'rgba(255,255,255,0.09)'}`, borderRadius: '10px', padding: '14px 8px', textAlign: 'center', cursor: esgotado ? 'not-allowed' : 'pointer', opacity: esgotado ? 0.35 : 1, transition: 'border-color 0.1s, background 0.1s' }}
                    >
                      {esgotado && <span style={{ position: 'absolute', top: '4px', right: '4px', fontSize: '8px', background: 'rgba(240,80,80,0.18)', border: '0.5px solid rgba(240,80,80,0.3)', borderRadius: '4px', padding: '1px 4px', color: 'rgba(240,130,130,0.8)' }}>Esgotado</span>}
                      {atribs.length === 0 ? <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)', margin: 0 }}>Versão única</p> : atribs.map(([key, val], ai) => (
                        <div key={key}>
                          {ai > 0 && <div style={{ height: '0.5px', background: 'rgba(255,255,255,0.07)', margin: '6px auto', width: '60%' }} />}
                          <p style={{ fontSize: '8px', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 2px' }}>{key}</p>
                          <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.85)', fontWeight: 500, margin: 0, wordBreak: 'break-word' }}>{val}</p>
                        </div>
                      ))}
                      <p style={{ fontSize: '11px', color: '#0ef', marginTop: '8px', marginBottom: 0 }}>R$ {preco.toFixed(2)}</p>
                      {produto.controle_estoque && <p style={{ fontSize: '9px', color: 'rgba(255,255,255,0.25)', margin: '2px 0 0' }}>{versao.estoque_atual} em estoque</p>}
                    </div>
                  )
                })}
              </div>
              <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.2)', textAlign: 'center', margin: 0 }}>← → navegar · Enter adicionar · Esc cancelar</p>
            </div>
          </div>
        )
      })()}

      {/* Import sacola modal */}
      {modalImport && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(8,10,20,0.85)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}
          onClick={() => setModalImport(false)}
        >
          <div style={{ background: 'rgba(8,18,30,0.97)', backdropFilter: 'blur(16px)', border: '0.5px solid rgba(255,255,255,0.10)', borderRadius: '16px', width: '100%', maxWidth: '480px', maxHeight: '82vh', display: 'flex', flexDirection: 'column' }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ flexShrink: 0, padding: '16px 20px', borderBottom: '0.5px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <p style={{ fontSize: '15px', fontWeight: 600, color: 'rgba(255,255,255,0.85)' }}>Importar Sacola</p>
              <button onClick={() => setModalImport(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.35)', fontSize: '22px' }}>×</button>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
              {sacolasDisponiveis.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 0', opacity: 0.4 }}>
                  <ShoppingBag size={36} style={{ margin: '0 auto 8px' }} />
                  <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)' }}>Nenhuma sacola aguardando</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '14px' }}>
                  {sacolasDisponiveis.map(s => {
                    const tot = s.itens.reduce((a: number, i: any) => a + Number(i.preco_unitario) * i.quantidade, 0)
                    const sel = importSacolaId === s.id
                    return (
                      <div key={s.id} onClick={() => setImportSacolaId(s.id)}
                        style={{ ...CARD, padding: '12px 14px', cursor: 'pointer', border: sel ? '0.5px solid rgba(0,239,255,0.5)' : '0.5px solid rgba(255,255,255,0.09)', background: sel ? 'rgba(0,239,255,0.06)' : 'rgba(8,18,30,0.48)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}
                      >
                        <div>
                          <p style={{ fontSize: '13px', fontWeight: 600, color: 'rgba(255,255,255,0.85)' }}>{s.cliente_nome ?? 'Sem cliente'}</p>
                          <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)', marginTop: '2px' }}>{s.itens.length} item{s.itens.length !== 1 ? 'ns' : ''} · {s.nome_vendedor ?? '—'}</p>
                        </div>
                        <p style={{ fontSize: '14px', fontWeight: 700, color: '#0ef', flexShrink: 0 }}>{fmtR(tot)}</p>
                      </div>
                    )
                  })}
                </div>
              )}
              {importSacolaId && (
                <>
                  <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', marginBottom: '8px' }}>Prazo de devolução</p>
                  <input type="date" value={importPrazo} onChange={e => setImportPrazo(e.target.value)} className="outline-none w-full" style={{ background: 'rgba(8,18,30,0.5)', border: '0.5px solid rgba(255,255,255,0.12)', borderRadius: '8px', padding: '8px 10px', fontSize: '13px', color: 'rgba(255,255,255,0.75)', colorScheme: 'dark', marginBottom: '10px' }} />
                  <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', marginBottom: '8px' }}>Observações</p>
                  <textarea value={importObs} onChange={e => setImportObs(e.target.value)} rows={2} className="outline-none w-full resize-none" style={{ background: 'rgba(8,18,30,0.5)', border: '0.5px solid rgba(255,255,255,0.12)', borderRadius: '8px', padding: '8px 10px', fontSize: '12px', color: 'rgba(255,255,255,0.75)', marginBottom: '6px' }} />
                </>
              )}
              {importErro && <p style={{ fontSize: '12px', color: 'rgba(248,113,113,0.8)' }}>{importErro}</p>}
            </div>
            <div style={{ flexShrink: 0, padding: '12px 16px 16px', borderTop: '0.5px solid rgba(255,255,255,0.07)' }}>
              <button onClick={confirmarImport} disabled={!importSacolaId || importando}
                style={{ width: '100%', minHeight: '44px', background: importSacolaId ? 'rgba(0,239,255,0.9)' : 'rgba(0,239,255,0.2)', border: 'none', borderRadius: '10px', color: importSacolaId ? '#0a0a1a' : 'rgba(0,239,255,0.35)', fontSize: '14px', fontWeight: 700, cursor: importSacolaId ? 'pointer' : 'not-allowed' }}
                onMouseEnter={e => { if (importSacolaId && !importando) e.currentTarget.style.background = 'rgba(0,239,255,0.75)' }}
                onMouseLeave={e => { if (importSacolaId) e.currentTarget.style.background = 'rgba(0,239,255,0.9)' }}
              >{importando ? 'Importando…' : 'Importar e cancelar sacola'}</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

// ── ProvaList component ────────────────────────────────────────────────────────
function ProvaList({ provas, gridTab, alertaDias, onClickEmProva }: {
  provas: ProvaRemota[]; gridTab: GridTab; alertaDias: number
  onClickEmProva: (p: ProvaRemota) => void
}) {
  const emProvaList       = provas.filter(p => p.status === 'em_prova')
  const aguardandoList    = provas.filter(p => p.status === 'aguardando_caixa')
  const finalizadaList    = provas.filter(p => p.status === 'finalizada')
  const canceladaList     = provas.filter(p => p.status === 'cancelada')

  function ProvaCard({ p, clickable }: { p: ProvaRemota; clickable?: boolean }) {
    const tot    = p.itens.reduce((s, i) => s + Number(i.preco_unitario) * i.quantidade, 0)
    const badge  = prazoBadge(p.prazo, alertaDias)
    const border = clickable ? cardLeftBorder(p.prazo, alertaDias) : 'none'
    const sbadge = statusBadge(p.status)
    const CARD_STYLE: React.CSSProperties = {
      background: 'rgba(8,18,30,0.48)', backdropFilter: 'blur(8px)',
      border: '0.5px solid rgba(255,255,255,0.09)', borderRadius: '10px',
      padding: '14px 16px', borderLeft: border,
      display: 'flex', alignItems: 'center', gap: '12px', transition: 'background 120ms',
    }
    return (
      <div
        style={{ ...CARD_STYLE, cursor: clickable ? 'pointer' : 'default' }}
        onClick={() => clickable && onClickEmProva(p)}
        onMouseEnter={e => { if (clickable) e.currentTarget.style.background = 'rgba(255,255,255,0.04)' }}
        onMouseLeave={e => { e.currentTarget.style.background = 'rgba(8,18,30,0.48)' }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: '13px', fontWeight: 600, color: 'rgba(255,255,255,0.85)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.cliente_nome ?? 'Sem cliente'}</p>
          <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', marginTop: '2px' }}>{agoMin(p.criado_em)} · {p.nome_vendedor ?? '—'}</p>
        </div>
        <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', flexShrink: 0 }}>{p.itens.length} {p.itens.length === 1 ? 'item' : 'itens'}</p>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px', flexShrink: 0 }}>
          {badge && <span style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '9999px', background: badge.bg, border: `0.5px solid ${badge.border}`, color: badge.color, whiteSpace: 'nowrap' }}>{badge.text}</span>}
          <span style={{ fontSize: '9px', padding: '1px 7px', borderRadius: '9999px', background: sbadge.bg, border: `0.5px solid ${sbadge.border}`, color: sbadge.color }}>{sbadge.text}</span>
          <p style={{ fontSize: '14px', fontWeight: 700, color: '#0ef' }}>{fmtR(tot)}</p>
        </div>
      </div>
    )
  }

  function Section({ title, items, clickable }: { title: string; items: ProvaRemota[]; clickable?: boolean }) {
    if (items.length === 0) return null
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <p style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.25)', marginBottom: '2px' }}>{title}</p>
        {items.map(p => <ProvaCard key={p.id} p={p} clickable={clickable} />)}
      </div>
    )
  }

  if (gridTab === 'ativas') {
    if (emProvaList.length === 0 && aguardandoList.length === 0) {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px', paddingTop: '60px' }}>
          <ClipboardList size={40} style={{ color: 'rgba(255,255,255,0.15)' }} />
          <p style={{ fontSize: '14px', fontWeight: 500, color: 'rgba(255,255,255,0.4)' }}>Nenhuma prova ativa</p>
          <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.25)', textAlign: 'center', maxWidth: '240px' }}>Crie uma prova para registrar produtos levados por um cliente.</p>
        </div>
      )
    }
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <Section title="Em prova" items={emProvaList} clickable />
        <Section title="Aguardando caixa" items={aguardandoList} />
      </div>
    )
  }

  if (finalizadaList.length === 0 && canceladaList.length === 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px', paddingTop: '60px' }}>
        <ClipboardList size={40} style={{ color: 'rgba(255,255,255,0.15)' }} />
        <p style={{ fontSize: '14px', fontWeight: 500, color: 'rgba(255,255,255,0.4)' }}>Nenhuma prova concluída</p>
      </div>
    )
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <Section title="Finalizadas" items={finalizadaList} />
      <Section title="Canceladas"  items={canceladaList} />
    </div>
  )
}
