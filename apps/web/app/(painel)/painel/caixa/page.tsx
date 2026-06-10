'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { User, Briefcase, ShoppingBag, Home, ArrowUp, ArrowDown, Lock, Ban, X, Search, Check, Clock, DollarSign } from 'lucide-react'
import { TopBar } from '@/components/layout/TopBar'
import { useCaixaStore } from '@/store/caixa.store'
import { caixaApi, type VendaTurno } from '@/lib/api/caixa'
import { usePDVStore } from '@/store/pdv.store'
import { useAuthStore } from '@/store/auth.store'
import { api } from '@/lib/api/client'
import { clientesApi } from '@/lib/api/clientes'
import { financeiroApi, type FormaPagamento } from '@/lib/api/financeiro'
import { promocoesApi } from '@/lib/api/promocoes'
import { calcularDescontos } from '@/lib/calcularDesconto'
import { atributosInline, atributosCompletos } from '@/lib/utils/atributos'
import { AdvancedSearchModal } from '@/components/pdv/AdvancedSearchModal'
import { CheckoutModal, type CheckoutResult } from '@/components/pdv/CheckoutModal'
import { CustomerSearchModal } from '@/components/pdv/CustomerSearchModal'
import { ClienteDadosModal } from '@/components/pdv/ClienteDadosModal'
import { SalespersonSearchModal } from '@/components/pdv/SalespersonSearchModal'
import { SacolasModal }           from '@/components/pdv/SacolasModal'
import type { Cliente } from '@/lib/api/clientes'
import type { Colaborador } from '@/lib/api/colaboradores'
import { CurrencyInput } from '@/components/ui/CurrencyInput'
import { AuthorizationGateModal } from '@/components/pdv/AuthorizationGateModal'
import { autorizacoesApi } from '@/lib/api/autorizacoes'

interface ProdutoSearch { id: string; nome: string; preco_base: string; total_versoes: number }

const SHORTCUTS_META = [
  { key: 'F2',  label: 'cliente'      },
  { key: 'F3',  label: 'vendedor'     },
  { key: 'F4',  label: 'sacolas'      },
  { key: 'F6',  label: 'provas'       },
  { key: 'F7',  label: 'sangria'      },
  { key: 'F8',  label: 'suprimento'   },
  { key: 'F9',  label: 'fechar venda' },
  { key: 'F10', label: 'fechar caixa' },
] as const

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

// ── Boas-vindas ───────────────────────────────────────────────────────────────

const PARTE1 = (nome: string, hora: number, diaSemana: number) => {
  const periodo = hora < 12 ? 'Bom dia' : hora < 18 ? 'Boa tarde' : 'Boa noite'
  const dias = ['Boa domingo', 'Boa segunda', 'Feliz terça', 'Boa quarta', 'Quase sexta, é quinta', 'Boa sexta', 'Bom sábado']
  const opcoes = [
    `${periodo}, ${nome}!`,
    `${periodo}!`,
    `Olá, ${nome}!`,
    `E aí, ${nome}?`,
    `${dias[diaSemana]}!`,
    `${dias[diaSemana]}, ${nome}!`,
    `Tudo pronto, ${nome}?`,
    `Hora de trabalhar, ${nome}!`,
    `Chegou a hora, ${nome}!`,
    `Vamos nessa, ${nome}!`,
    `${periodo}, ${nome}! Caixa aberto.`,
    `Bem-vindo de volta, ${nome}!`,
    `${nome}, é hora de vender!`,
    `Preparado, ${nome}?`,
    `Vamos lá, ${nome}!`,
  ]
  return opcoes[Math.floor(Math.random() * opcoes.length)]
}

const PARTE2 = [
  'Que as vendas fluam hoje.',
  'Foco e energia!',
  'Cada cliente é uma oportunidade.',
  'Bora fechar bem o dia.',
  'Hoje pode ser incrível.',
  'Um cliente de cada vez.',
  'Ótimas vendas pela frente!',
  'Sorria, você está no caixa!',
  'Que venham os clientes.',
  'Faça cada atendimento valer.',
  'Energia boa atrai cliente bom.',
  'O melhor ainda está por vir.',
  'Boas vendas começam com bom humor.',
  'Cada venda conta.',
  'Hoje é dia de superar.',
  'Atenção e simpatia fazem a diferença.',
  'Bora bater as metas!',
  'Um dia de cada vez.',
  'Tudo começa com o primeiro cliente.',
  'Foco no que importa.',
]

function getMensagem(nome: string): string {
  const now = new Date()
  const p1  = PARTE1(nome, now.getHours(), now.getDay())
  const p2  = PARTE2[Math.floor(Math.random() * PARTE2.length)]
  return `${p1} ${p2}`
}

// ─────────────────────────────────────────────────────────────────────────────

export default function CaixaPage() {
  const router = useRouter()
  const { status, turno, erro: cxErro, carregar, abrir, fechar, registrarMovimento, limparErro } = useCaixaStore()
  const { itens, cliente_id, cliente_nome, vendedor_nome, vendedorDaSacola, addItem, addItemQtd, removeItem, setQtd, setCliente, setVendedor: setVendedorStore, limpar, clientePerguntado, setClientePerguntado } = usePDVStore()
  const usuario = useAuthStore(s => s.usuario)

  // ── Abertura ──────────────────────────────────────────────────────────────
  const [saldoInicial, setSaldoInicial] = useState(0)
  const [obsAbertura,  setObsAbertura]  = useState('')
  const [abrindo,      setAbrindo]      = useState(false)

  // ── Abertura ─────────────────────────────────────────────────────────────
  const obsAberturaRef = useRef<HTMLInputElement>(null)
  const obsFechRef     = useRef<HTMLInputElement>(null)

  // ── Scanner / busca ───────────────────────────────────────────────────────
  const scanRef        = useRef<HTMLInputElement>(null)
  const modalAbertoRef = useRef(false)
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

  const [modalVendedor,      setModalVendedor]      = useState(false)
  const [vendedor,           setVendedor]           = useState<Colaborador | null>(null)
  const [modalSacolas,       setModalSacolas]       = useState(false)
  const [modalDadosCliente,  setModalDadosCliente]  = useState(false)

  const [modalMov,   setModalMov]    = useState<'sangria' | 'suprimento' | null>(null)
  const [valorMov,   setValorMov]    = useState(0)
  const [motivoMov,  setMotivoMov]   = useState('')
  const [modalFechar,setModalFechar] = useState(false)
  const [saldoFinal, setSaldoFinal]  = useState(0)
  const [obsFech,    setObsFech]     = useState('')
  const [salvMov,    setSalvMov]     = useState(false)
  const [fechVendas, setFechVendas]  = useState<VendaTurno[]>([])
  const [fechLoad,   setFechLoad]    = useState(false)
  const [fechWarning,setFechWarning] = useState(false)

  // ── Seleção de variação ───────────────────────────────────────────────────
  const [modalVariacao,   setModalVariacao]   = useState(false)
  const [produtoVariacao, setProdutoVariacao] = useState<{ produto: any; qty: number } | null>(null)
  const [focadoIdx,       setFocadoIdx]       = useState(0)

  // ── Desconto do caixa ─────────────────────────────────────────────────────
  const [descontoCfg, setDescontoCfg] = useState<{ pct: number; valor: number; promoAceita: boolean } | null>(null)
  const [formasDesc,       setFormasDesc]       = useState<string[]>([])
  const [formasPagamento,  setFormasPagamento]  = useState<FormaPagamento[]>([])

  // ── Supervisão ────────────────────────────────────────────────────────────
  const [supCfg,             setSupCfg]             = useState<{ habilitada: boolean; cancelarItem: boolean; fecharFalta: boolean; fecharSobra: boolean }>({ habilitada: false, cancelarItem: false, fecharFalta: false, fecharSobra: false })
  const [gateItem,           setGateItem]           = useState<{ versaoId: string; nome: string } | null>(null)
  const [gateFechar,         setGateFechar]         = useState<{ divergencia: number } | null>(null)
  const [operadorSupervisor, setOperadorSupervisor] = useState(false)

  // ── Boas-vindas ───────────────────────────────────────────────────────────
  const [modalBoasVindas,  setModalBoasVindas]  = useState(false)
  const boasVindasRef      = useRef<{ msg: string; hora: string } | null>(null)
  const boasVindasTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ── Limite de caixa ──────────────────────────────────────────────────────
  const [limiteCfg,          setLimiteCfg]          = useState<{ habilitado: boolean; limite: number; fundo: number; modo: 'avisar' | 'obrigar' }>({ habilitado: false, limite: 0, fundo: 0, modo: 'avisar' })
  const [avisoLimite,        setAvisoLimite]        = useState(false)
  const [sangriaObrigatoria, setSangriaObrigatoria] = useState(false)
  const [movErro,            setMovErro]            = useState('')

  // ── Derived cash state ────────────────────────────────────────────────────
  const dinheiroCaixa  = Number(turno?.dinheiro_em_caixa ?? 0)
  const overLimit      = limiteCfg.habilitado && limiteCfg.limite > 0 && dinheiroCaixa > limiteCfg.limite
  const locked         = overLimit && limiteCfg.modo === 'obrigar'
  const suggestedCents = Math.max(0, Math.round((dinheiroCaixa - limiteCfg.fundo) * 100))

  // ── Init ──────────────────────────────────────────────────────────────────
  useEffect(() => { carregar() }, [])
  useEffect(() => () => { if (boasVindasTimerRef.current) clearTimeout(boasVindasTimerRef.current) }, [])

  useEffect(() => {
    if (status !== 'aberto') return
    promocoesApi.list(false).then(setPromocoes).catch(() => {})
    api.get('/dados-loja/sistema').then(r => {
      const d = r.data
      setDescontoCfg({ pct: Number(d.desconto_max_percentual ?? 0), valor: Number(d.desconto_max_valor ?? 0), promoAceita: !!d.promocao_aceita_desconto })
      setSupCfg({ habilitada: !!d.supervisao_habilitada, cancelarItem: !!d.exige_auth_cancelar_item, fecharFalta: !!d.exige_auth_fechar_falta, fecharSobra: !!d.exige_auth_fechar_sobra })
      setLimiteCfg({ habilitado: !!d.sangria_limite_habilitado, limite: Number(d.sangria_limite_valor ?? 0), fundo: Number(d.sangria_fundo_troco ?? 0), modo: d.sangria_limite_modo === 'obrigar' ? 'obrigar' : 'avisar' })
    }).catch(() => {})
    autorizacoesApi.supervisores()
      .then(r => {
        const ehDono = (usuario as any)?.nivel === 'dono_loja'
        const ehSup  = !!(usuario as any)?.id && r.supervisores.some(s => s.id === (usuario as any).id)
        setOperadorSupervisor(ehDono || ehSup)
      })
      .catch(() => setOperadorSupervisor((usuario as any)?.nivel === 'dono_loja'))
    financeiroApi.formasPagamento().then(fs => {
      setFormasPagamento(fs)
      setFormasDesc(fs.filter(f => f.ativo && f.aceita_desconto !== false).map(f => f.nome))
    }).catch(() => {})
    setTimeout(() => focusScanSafe(), 150)
  }, [status])

  useEffect(() => {
    if (cliente_id) clientesApi.get(cliente_id).then(setClienteInfo).catch(() => {})
    else { setClienteInfo(null); setUsarCB(false) }
  }, [cliente_id])

  // Fetch vendas when fechar modal opens
  useEffect(() => {
    if (!modalFechar) return
    setFechLoad(true)
    setFechVendas([])
    caixaApi.vendas().then(r => setFechVendas(r.vendas)).finally(() => setFechLoad(false))
  }, [modalFechar])

  // Start next sale when first product is added after a completed sale (blocked when locked)
  useEffect(() => {
    if (vendaOK && itens.length > 0 && !locked) novaVenda()
  }, [vendaOK, itens.length, locked])

  // Auto-focus first non-esgotado card when variant modal opens
  useEffect(() => {
    if (!modalVariacao || !produtoVariacao) return
    const versoes: any[] = produtoVariacao.produto.versoes ?? []
    const first = versoes.findIndex((v: any) => !(produtoVariacao.produto.controle_estoque && v.estoque_atual <= 0))
    setFocadoIdx(first >= 0 ? first : 0)
  }, [modalVariacao])

  // Keyboard nav for variant modal
  useEffect(() => {
    if (!modalVariacao || !produtoVariacao) return
    function onKey(e: KeyboardEvent) {
      const versoes: any[]     = produtoVariacao!.produto.versoes ?? []
      const disponivel = versoes.map((v: any, i: number) => ({ v, i }))
        .filter(({ v }) => !(produtoVariacao!.produto.controle_estoque && v.estoque_atual <= 0))
      if (e.key === 'Escape') {
        setModalVariacao(false)
        setTimeout(() => focusScanSafe(), 100)
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
        const versao = versoes[focadoIdx]
        if (!versao || (produtoVariacao!.produto.controle_estoque && versao.estoque_atual <= 0)) return
        const { produto, qty } = produtoVariacao!
        const preco = versao.preco_especifico ? parseFloat(versao.preco_especifico) : parseFloat(produto.preco_base)
        const item  = { versao_id: versao.id, produto_id: produto.id, nome: produto.nome, atributos: versao.atributos_json, preco_unitario: preco, codigo_barras: versao.codigo_barras ?? null, aceita_desconto: produto.aceita_desconto ?? true, tipo_nome: produto.tipo_nome ?? null }
        qty > 1 ? addItemQtd(item, qty) : addItem(item)
        setModalVariacao(false); setProdutoVariacao(null); setFocadoIdx(0)
        setResultados([]); setScan('')
        setTimeout(() => focusScanSafe(), 100)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [modalVariacao, produtoVariacao, focadoIdx])

  // Auto-open customer modal on first item (once per sale, persisted)
  useEffect(() => {
    if (status !== 'aberto') return
    if (itens.length === 0) return
    if (!cliente_id && !clientePerguntado) {
      setClientePerguntado(true)
      setClienteAutoAberto(true)
      setModalCliente(true)
    }
  }, [itens.length, cliente_id, status])

  // Show limit warning in obrigar mode (reload + post-sale)
  useEffect(() => {
    if (status !== 'aberto' || !overLimit || limiteCfg.modo !== 'obrigar') return
    setAvisoLimite(true)
  }, [status, overLimit, limiteCfg.modo])

  // Show limit warning after a sale in avisar mode
  useEffect(() => {
    if (vendaOK === null || !overLimit || limiteCfg.modo !== 'avisar') return
    setAvisoLimite(true)
  }, [vendaOK, overLimit, limiteCfg.modo])

  // Global F-key shortcuts — only when register is open, no modal, not locked
  useEffect(() => {
    if (status !== 'aberto') return
    function onKey(e: KeyboardEvent) {
      if (modalAbertoRef.current || locked) return
      const abrirCliente = () => {
        if (cliente_id) { setModalDadosCliente(true) }
        else { setClienteAutoAberto(false); setModalCliente(true) }
      }
      const map: Record<string, { action: () => void; enabled: boolean }> = {
        F2:  { action: abrirCliente,                                                              enabled: true               },
        F3:  { action: () => setModalVendedor(true),                                              enabled: true               },
        F4:  { action: () => setModalSacolas(true),                                               enabled: true               },
        F6:  { action: () => router.push('/painel/prova-em-casa'),                                enabled: true               },
        F7:  { action: () => { setValorMov(0); setMotivoMov(''); setModalMov('sangria') },        enabled: true               },
        F8:  { action: () => { setValorMov(0); setMotivoMov(''); setModalMov('suprimento') },     enabled: true               },
        F9:  { action: () => setModalCheckout(true),                                              enabled: itens.length > 0   },
        F10: { action: () => handleFecharCaixa(),                                                 enabled: itens.length === 0 },
      }
      const entry = map[e.key]
      if (!entry) return
      e.preventDefault()
      e.stopPropagation()
      if (entry.enabled) entry.action()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [status, itens.length, cliente_id, locked])

  // Global Esc — closes topmost open modal; mandatory sangria and lock state are immune
  useEffect(() => {
    function onEsc(e: KeyboardEvent) {
      if (e.key !== 'Escape') return
      if (modalVariacao) return  // variant modal owns its Esc
      if (sangriaObrigatoria || locked) { e.preventDefault(); return }
      if (modalBusca)        { e.preventDefault(); setModalBusca(false);        setTimeout(() => focusScanSafe(), 100); return }
      if (modalCheckout)     { e.preventDefault(); setModalCheckout(false);     setTimeout(() => focusScanSafe(), 100); return }
      if (modalCliente)      { e.preventDefault(); setModalCliente(false); setClienteAutoAberto(false); setTimeout(() => focusScanSafe(), 100); return }
      if (modalVendedor)     { e.preventDefault(); setModalVendedor(false);     setTimeout(() => focusScanSafe(), 100); return }
      if (modalSacolas)      { e.preventDefault(); setModalSacolas(false);      setTimeout(() => focusScanSafe(), 100); return }
      if (modalDadosCliente) { e.preventDefault(); setModalDadosCliente(false); return }
      if (modalFechar)       { e.preventDefault(); setModalFechar(false);       return }
      if (modalMov)          { e.preventDefault(); closeModalMov();             setTimeout(() => focusScanSafe(), 100); return }
      if (avisoLimite)       { e.preventDefault(); setAvisoLimite(false);       return }
    }
    window.addEventListener('keydown', onEsc)
    return () => window.removeEventListener('keydown', onEsc)
  }, [modalBusca, modalCheckout, modalCliente, modalVendedor, modalSacolas, modalDadosCliente, modalFechar, modalMov, avisoLimite, sangriaObrigatoria, locked, modalVariacao])

  function handleClienteSelecionado(c: Cliente) {
    setCliente(c.id, c.nome)
    setModalCliente(false)
    setTimeout(() => focusScanSafe(), 100)
  }

  // ── Cálculos ──────────────────────────────────────────────────────────────
  const { itensComDesconto, totalDesconto } = calcularDescontos(itens, promocoes, !clienteInfo?.total_compras, {})
  const subtotal     = itens.reduce((s, i) => s + i.preco_unitario * i.quantidade, 0)
  const cashbackDisp = clienteInfo ? Number(clienteInfo.saldo_cashback) : 0
  const cashbackUsar = usarCB ? Math.min(cashbackDisp, subtotal - totalDesconto) : 0
  const baseTotal    = Math.max(0, subtotal - totalDesconto - cashbackUsar)

  // Desconto global do caixa — display only
  const baseElegivel = itensComDesconto.reduce((s, i) => {
    const aceita  = i.aceita_desconto !== false
    const emPromo = i.desconto_item > 0
    if (!aceita) return s
    if (emPromo && descontoCfg && !descontoCfg.promoAceita) return s
    return s + (i.preco_unitario * i.quantidade - i.desconto_item)
  }, 0)
  let descontoCaixa = 0
  if (descontoCfg) {
    const porPct = descontoCfg.pct > 0 ? baseElegivel * (descontoCfg.pct / 100) : Infinity
    const porVal = descontoCfg.valor > 0 ? descontoCfg.valor : Infinity
    if (porPct !== Infinity || porVal !== Infinity) {
      descontoCaixa = Math.round(Math.min(porPct, porVal, baseElegivel) * 100) / 100
    }
  }
  const valorComDesconto = subtotal - descontoCaixa

  function adicionarVariacao(versao: any) {
    if (!produtoVariacao) return
    const { produto, qty } = produtoVariacao
    const preco = versao.preco_especifico ? parseFloat(versao.preco_especifico) : parseFloat(produto.preco_base)
    const item  = { versao_id: versao.id, produto_id: produto.id, nome: produto.nome, atributos: versao.atributos_json, preco_unitario: preco, codigo_barras: versao.codigo_barras ?? null, tipo_nome: produto.tipo_nome ?? null }
    qty > 1 ? addItemQtd(item, qty) : addItem(item)
    setModalVariacao(false); setProdutoVariacao(null); setFocadoIdx(0)
    setResultados([]); setScan('')
    setTimeout(() => focusScanSafe(), 100)
  }

  // ── Scanner ───────────────────────────────────────────────────────────────
  async function buscarBarcode(codigo: string, qty: number) {
    try {
      const { data } = await api.get<any>(`/produtos/barcode/${encodeURIComponent(codigo)}`)
      if (data.match === 'produto') {
        const p             = data.produto
        const versoes: any[] = data.versoes ?? []
        if (versoes.length === 1) {
          const v     = versoes[0]
          const preco = v.preco_especifico ? parseFloat(v.preco_especifico) : parseFloat(p.preco_base)
          const item  = { versao_id: v.id, produto_id: p.id, nome: p.nome, atributos: v.atributos_json, preco_unitario: preco, codigo_barras: v.codigo_barras ?? null, aceita_desconto: p.aceita_desconto ?? true, tipo_nome: p.tipo_nome ?? null }
          qty > 1 ? addItemQtd(item, qty) : addItem(item)
        } else if (versoes.length > 1) {
          setProdutoVariacao({ produto: { ...p, versoes }, qty })
          setModalVariacao(true)
        } else {
          setScanErro(`${p.nome} sem variações cadastradas.`)
          return true
        }
      } else {
        // Variation-level barcode → add directly; data.id is the versao UUID (SELECT v.*)
        const preco = data.preco_especifico ? parseFloat(data.preco_especifico) : parseFloat(data.preco_base)
        const item  = { versao_id: data.id, produto_id: data.produto_id, nome: data.produto_nome, atributos: data.atributos_json ?? {}, preco_unitario: preco, codigo_barras: data.codigo_barras, aceita_desconto: data.aceita_desconto ?? true, tipo_nome: data.tipo_nome ?? null }
        qty > 1 ? addItemQtd(item, qty) : addItem(item)
      }
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
    if (found) {
      // Barcode hit — clear input and refocus for next scan
      setScan(''); focusScanSafe()
    } else {
      // Fall back to text search — results from onChange already in dropdown
      // Re-run search to ensure dropdown is fresh, show error only if truly no results
      await buscarTexto(raw)
      if (resultados.length === 0) {
        setScanErro(`"${query}" não encontrado.${qty > 1 ? ` (qty: ${qty})` : ''}`)
      }
    }
  }

  async function selecionarProduto(p: ProdutoSearch) {
    const { qty } = parseQtyPrefix(scan)
    try {
      const { data } = await api.get<any>(`/produtos/${p.id}`)
      if (data.versoes?.length === 1) {
        const v = data.versoes[0]
        const preco = v.preco_especifico ? parseFloat(v.preco_especifico) : parseFloat(data.preco_base)
        const item  = { versao_id: v.id, produto_id: p.id, nome: p.nome, atributos: v.atributos_json, preco_unitario: preco, codigo_barras: v.codigo_barras, aceita_desconto: data.aceita_desconto ?? true, tipo_nome: data.tipo_nome ?? null }
        qty > 1 ? addItemQtd(item, qty) : addItem(item)
        setResultados([]); setScan('')
        focusScanSafe()
      } else if ((data.versoes?.length ?? 0) > 1) {
        setResultados([])
        setProdutoVariacao({ produto: data, qty })
        setModalVariacao(true)
      } else {
        setScanErro(`${p.nome} sem variações cadastradas.`)
        setResultados([])
        focusScanSafe()
      }
    } catch (err: any) {
      setScanErro(err?.response?.data?.error ?? 'Erro ao carregar produto.')
      focusScanSafe()
    }
  }

  // ── Abertura ──────────────────────────────────────────────────────────────
  async function handleAbrir() {
    setAbrindo(true)
    try {
      await abrir(saldoInicial / 100, obsAbertura || undefined)
      const now = new Date()
      boasVindasRef.current = {
        msg:  getMensagem(primeiroNome),
        hora: now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      }
      setModalBoasVindas(true)
      boasVindasTimerRef.current = setTimeout(() => setModalBoasVindas(false), 10000)
    }
    finally { setAbrindo(false) }
  }

  // ── Gestão caixa ──────────────────────────────────────────────────────────
  async function handleMovimento() {
    if (!valorMov || valorMov <= 0 || !modalMov) return
    setSalvMov(true)
    setMovErro('')
    try {
      await registrarMovimento(modalMov, valorMov / 100, motivoMov || undefined)
      setModalMov(null); setValorMov(0); setMotivoMov(''); setSangriaObrigatoria(false)
    } catch (e: any) {
      setMovErro(e?.message ?? 'Erro ao registrar movimento.')
    } finally { setSalvMov(false) }
  }

  async function handleFechar() {
    const saldoIni    = Number(turno?.saldo_inicial ?? 0)
    const sangrias    = Number(turno?.total_sangrias ?? 0)
    const suprimentos = Number(turno?.total_suprimentos ?? 0)
    let dinheiroVendas = 0
    for (const v of fechVendas) {
      for (const p of v.pagamentos ?? []) {
        if (p.tipo === 'dinheiro') dinheiroVendas += Number(p.valor)
      }
    }
    const saldoEsperado = saldoIni + dinheiroVendas + suprimentos - sangrias
    const contado       = saldoFinal / 100
    const div           = Math.round((contado - saldoEsperado) * 100) / 100

    const precisa = supCfg.habilitada && div !== 0 &&
      ((div < 0 && supCfg.fecharFalta) || (div > 0 && supCfg.fecharSobra))
    if (precisa) {
      setGateFechar({ divergencia: div })
      return
    }
    setSalvMov(true)
    try { await fechar(saldoFinal / 100, obsFech || undefined); setModalFechar(false) }
    finally { setSalvMov(false) }
  }

  function handleVendaOK(r: CheckoutResult) {
    setModalCheckout(false)
    setVendaOK(r)
    limpar()
    setVendedor(null)
    carregar()
  }

  function novaVenda() {
    setVendaOK(null)
    setTimeout(() => focusScanSafe(), 100)
  }

  function handleFecharCaixa() {
    if (itens.length > 0) {
      setFechWarning(true)
      setTimeout(() => setFechWarning(false), 3000)
      return
    }
    setModalFechar(true)
  }

  function closeModalMov() {
    setModalMov(null)
    setValorMov(0)
    setMotivoMov('')
    setSangriaObrigatoria(false)
    setMovErro('')
  }

  const fmt    = (v?: number | string | null) => `R$ ${Number(v ?? 0).toFixed(2)}`
  const nomeOp = (usuario as any)?.nome || (usuario as any)?.username || 'Operador'
  const primeiroNome = nomeOp.split(' ')[0]
  const totalQtd = itens.reduce((s, i) => s + i.quantidade, 0)

  const MOD: React.CSSProperties = { background: 'rgba(8,18,30,0.52)', border: '0.5px solid rgba(255,255,255,0.09)', borderRadius: '10px', padding: '12px', flexShrink: 0 }
  const MOD_LABEL: React.CSSProperties = { fontSize: '9px', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.1em', display: 'block', marginBottom: '10px' }

  // Keep modalAbertoRef current on every render so setTimeout callbacks read live state
  modalAbertoRef.current = modalBusca || modalCheckout || modalVariacao || modalCliente || modalVendedor || modalSacolas || !!modalMov || modalFechar || modalDadosCliente || !!gateItem || !!gateFechar || avisoLimite || locked

  function focusScanSafe() {
    if (!modalAbertoRef.current) scanRef.current?.focus()
  }

  // ── Gestão do caixa — card grid (reused in both sidebar states) ───────────
  const gestaoCaixaCards = (
    <div style={MOD}>
      <span style={MOD_LABEL}>Gestão do caixa</span>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '7px' }}>
        {([
          { key: 'sacolas',    icon: <ShoppingBag size={18} />, label: 'Sacolas',    onClick: () => setModalSacolas(true) },
          { key: 'provas',     icon: <Home        size={18} />, label: 'Provas',     onClick: () => router.push('/painel/prova-em-casa') },
          { key: 'sangria',    icon: <ArrowUp     size={18} />, label: 'Sangria',    onClick: () => { setValorMov(0); setMotivoMov(''); setModalMov('sangria') } },
          { key: 'suprimento', icon: <ArrowDown   size={18} />, label: 'Suprimento', onClick: () => { setValorMov(0); setMotivoMov(''); setModalMov('suprimento') } },
        ] as const).map(btn => (
          <button
            key={btn.key}
            onClick={btn.onClick}
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '5px', padding: '12px 6px', borderRadius: '9px', cursor: 'pointer', background: 'rgba(255,255,255,0.03)', border: '0.5px solid rgba(255,255,255,0.08)' }}
          >
            <span style={{ color: 'rgba(0,239,255,0.7)', display: 'flex', alignItems: 'center' }}>{btn.icon}</span>
            <span style={{ fontSize: '9px', color: 'rgba(255,255,255,0.55)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{btn.label}</span>
          </button>
        ))}
        <button
          onClick={() => handleFecharCaixa()}
          style={{ gridColumn: 'span 2', display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: '7px', padding: '11px', borderRadius: '9px', cursor: 'pointer', background: 'rgba(240,100,100,0.06)', border: '0.5px solid rgba(240,100,100,0.2)', opacity: itens.length > 0 ? 0.5 : 1 }}
        >
          <span style={{ color: 'rgba(240,130,130,0.7)', display: 'flex', alignItems: 'center' }}>
            {itens.length > 0 ? <Ban size={15} /> : <Lock size={15} />}
          </span>
          <span style={{ fontSize: '9px', color: 'rgba(240,130,130,0.7)', textTransform: 'uppercase', letterSpacing: '0.07em', fontWeight: 600 }}>Fechar caixa</span>
        </button>
      </div>
      {fechWarning && (
        <p style={{ fontSize: '10px', color: 'rgba(240,130,130,0.8)', textAlign: 'center', marginTop: '6px', lineHeight: 1.4 }}>
          Finalize ou cancele a venda atual antes de fechar o caixa.
        </p>
      )}
    </div>
  )

  // ── LOADING ───────────────────────────────────────────────────────────────
  if (status === 'desconhecido' && !cxErro) return (
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
              <CurrencyInput
                value={saldoInicial} onChange={setSaldoInicial}
                onEnter={() => obsAberturaRef.current?.focus()}
                autoFocus placeholder="R$ 0,00"
                className="w-full min-h-[48px] bg-midnight border border-ocean-depth rounded-xl px-4 text-sea-foam text-sm outline-none focus:border-electric-cyan" />
            </div>
            <div>
              <label className="text-steel text-xs block mb-1">Observação (opcional)</label>
              <input ref={obsAberturaRef} type="text" value={obsAbertura}
                onChange={e => setObsAbertura(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAbrir()}
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
      <style>{`
        .gestao-btn { border-radius: 8px; transition: background 0.15s, filter 0.15s, transform 0.08s, opacity 0.15s; }
        .gestao-btn:hover { background: rgba(0,239,255,0.08) !important; filter: brightness(1.3); }
        .gestao-btn-danger:hover { background: rgba(240,100,100,0.08) !important; filter: brightness(1.3); }
        .gestao-btn:active { transform: scale(0.96); }
        .atrib-row { transition: background 0.15s, border-color 0.15s, transform 0.08s; }
        .atrib-row:hover { background: rgba(255,255,255,0.08) !important; border-color: rgba(0,239,255,0.25) !important; }
        .atrib-row:active { transform: scale(0.99); background: rgba(255,255,255,0.11) !important; }
        .atrib-row-x { transition: color 0.12s; }
        .atrib-row-x:hover { color: rgba(255,255,255,0.6) !important; }
        .fechar-venda-btn { transition: background 0.15s, box-shadow 0.15s, transform 0.08s; }
        .fechar-venda-btn:hover { background: #0ef !important; box-shadow: 0 0 0 2px rgba(0,239,255,0.35); transform: scale(1.01); }
        .fechar-venda-btn:active { transform: scale(0.98) !important; box-shadow: none !important; }
      `}</style>
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
                    const itemElegivel = !!descontoCfg
                      && (descontoCfg.pct > 0 || descontoCfg.valor > 0)
                      && item.aceita_desconto !== false
                      && !(item.desconto_item > 0 && !descontoCfg.promoAceita)
                    return (
                      <tr key={item.versao_id} className="border-b border-ocean-depth/50 hover:bg-deep-ocean/50">
                        <td className="px-4 py-3">
                          <p className="text-sea-foam font-medium truncate max-w-[200px]">{item.nome}</p>
                          <p className="text-steel text-xs">
                            {(() => {
                              const inline   = atributosInline(item.atributos)
                              const completo = atributosCompletos(item.atributos)
                              const temMais  = completo.medidas.length > 0
                              const CHIP: React.CSSProperties = { fontSize: '10px', background: 'rgba(255,255,255,0.06)', border: '0.5px solid rgba(255,255,255,0.1)', borderRadius: '6px', padding: '2px 7px', color: 'rgba(255,255,255,0.65)', marginRight: '4px', display: 'inline-block' }
                              return (
                                <>
                                  {item.tipo_nome && <span style={CHIP}>{item.tipo_nome}</span>}
                                  {inline.length === 0
                                    ? <span style={{ ...CHIP, color: 'rgba(255,255,255,0.3)' }}>Versão única</span>
                                    : inline.map((v, i) => <span key={i} style={CHIP}>{v}</span>)
                                  }
                                  {temMais && (
                                    <span style={{ position: 'relative', display: 'inline-block' }}
                                      onMouseEnter={e => { const t = e.currentTarget.querySelector<HTMLElement>('[data-tip]'); if (t) t.style.display = 'block' }}
                                      onMouseLeave={e => { const t = e.currentTarget.querySelector<HTMLElement>('[data-tip]'); if (t) t.style.display = 'none' }}>
                                      <span style={{ ...CHIP, color: 'rgba(255,255,255,0.35)', cursor: 'default' }}>+</span>
                                      <span data-tip style={{ display: 'none', position: 'absolute', left: 0, top: '110%', zIndex: 50, background: 'rgb(10,22,34)', border: '0.5px solid rgba(255,255,255,0.14)', borderRadius: '9px', boxShadow: '0 4px 16px rgba(0,0,0,0.5)', minWidth: '200px', padding: '10px 12px', whiteSpace: 'nowrap' }}>
                                        <p style={{ fontSize: '9px', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 7px' }}>Detalhes da variação</p>
                                        {completo.principais.map(a => (
                                          <div key={a.label} style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', marginBottom: '3px' }}>
                                            <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>{a.label}</span>
                                            <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.85)', fontWeight: 500 }}>{a.valor}</span>
                                          </div>
                                        ))}
                                        {completo.medidas.length > 0 && (
                                          <>
                                            <div style={{ height: '0.5px', background: 'rgba(255,255,255,0.08)', margin: '7px 0 6px' }} />
                                            <p style={{ fontSize: '9px', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 5px' }}>Medidas</p>
                                            {completo.medidas.map(a => (
                                              <div key={a.label} style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', marginBottom: '3px' }}>
                                                <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>{a.label}</span>
                                                <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.85)', fontWeight: 500 }}>{a.valor}</span>
                                              </div>
                                            ))}
                                          </>
                                        )}
                                      </span>
                                    </span>
                                  )}
                                  {itemElegivel && (
                                    <span style={{ fontSize: '10px', background: 'rgba(100,220,160,0.12)', border: '0.5px solid rgba(100,220,160,0.3)', borderRadius: '6px', padding: '2px 7px', color: 'rgba(100,220,160,0.9)', fontWeight: 500, display: 'inline-block', marginRight: '4px' }}>desconto</span>
                                  )}
                                </>
                              )
                            })()}
                          </p>
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
                          <button
                            onClick={() => {
                              const precisaAuth = supCfg.habilitada && supCfg.cancelarItem && !operadorSupervisor
                              if (precisaAuth) {
                                setGateItem({ versaoId: item.versao_id, nome: item.nome })
                              } else {
                                removeItem(item.versao_id)
                              }
                            }}
                            className="w-8 h-8 text-steel hover:text-red-400 rounded-lg flex items-center justify-center">×</button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* Shortcut cheatsheet — absolute watermark, behind all flow content, no layout space */}
          <div style={{ position: 'absolute', right: '16px', bottom: '62px', zIndex: -1, pointerEvents: 'none', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '5px' }}>
            {SHORTCUTS_META.map(({ key, label }) => (
              <span key={key} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'rgba(255,255,255,0.20)' }}>
                {label}
                <kbd style={{ fontSize: '10px', color: 'rgba(0,239,255,0.40)', border: '0.5px solid rgba(0,239,255,0.18)', borderRadius: '5px', padding: '1px 6px', fontWeight: 600, fontFamily: 'inherit' }}>{key}</kbd>
              </span>
            ))}
          </div>

          {/* Input scanner */}
          <div
            className="shrink-0 relative"
            style={{ background: 'rgba(8,18,30,0.35)', borderTop: '0.5px solid rgba(255,255,255,0.07)', padding: '10px 12px' }}
          >
            {scanErro && <p className="text-red-400 text-xs mb-2 text-center">{scanErro}</p>}
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.25)', pointerEvents: 'none' }} />
                <input
                  ref={scanRef}
                  value={scan}
                  onChange={e => { if (locked) return; setScan(e.target.value); buscarTexto(e.target.value); setScanErro('') }}
                  onKeyDown={e => { if (locked) return; onScanKeyDown(e) }}
                  onFocus={e => { e.currentTarget.style.borderColor = locked ? 'rgba(240,100,100,0.3)' : 'rgba(0,239,255,0.4)' }}
                  onBlur={e => {
                    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'
                    const next = e.relatedTarget as HTMLElement | null
                    if (next && (next.tagName === 'SELECT' || next.tagName === 'BUTTON' || next.tagName === 'INPUT' || next.closest('[data-no-refocus]'))) return
                    setTimeout(() => focusScanSafe(), 250)
                  }}
                  placeholder={locked ? 'Faça uma sangria para continuar vendendo' : 'Código de barras, nome... ou "3-código" para qty 3'}
                  autoComplete="off"
                  readOnly={locked}
                  style={{ background: locked ? 'rgba(240,100,100,0.04)' : 'rgba(8,18,30,0.5)', border: `0.5px solid ${locked ? 'rgba(240,100,100,0.2)' : 'rgba(255,255,255,0.12)'}`, borderRadius: '8px', padding: '9px 12px 9px 36px', fontSize: '13px', color: locked ? 'rgba(240,130,130,0.5)' : 'rgba(255,255,255,0.75)', outline: 'none', width: '100%' }}
                />
              </div>
              <button
                onClick={() => { setModalBusca(true); setScan(''); setResultados([]) }}
                title="Busca avançada"
                style={{ width: '34px', height: '34px', flexShrink: 0, background: 'rgba(255,255,255,0.04)', border: '0.5px solid rgba(255,255,255,0.08)', borderRadius: '8px', color: 'rgba(255,255,255,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
              >
                <Search size={14} />
              </button>
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
          className="relative z-[1] hidden md:flex flex-col shrink-0"
          style={{ width: '280px', gap: '8px', padding: '10px', borderLeft: '0.5px solid rgba(255,255,255,0.06)' }}
          data-no-refocus
        >
          {vendaOK ? (
            <div className="flex-1 flex flex-col gap-3 py-2">
              {/* Check + total */}
              <div className="flex flex-col items-center gap-2 text-center">
                <div className="w-12 h-12 rounded-full bg-mint-green/20 flex items-center justify-center">
                  <span style={{ fontSize: '22px', color: 'rgba(100,220,160,0.9)' }}>✓</span>
                </div>
                <div>
                  <p style={{ fontSize: '20px', fontWeight: 700, color: 'rgba(255,255,255,0.9)', lineHeight: 1.1 }}>{fmt(vendaOK.total)}</p>
                  <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.45)', marginTop: '2px' }}>Venda registrada</p>
                </div>
              </div>

              <div style={{ height: '0.5px', background: 'rgba(255,255,255,0.07)' }} />

              {/* Payments */}
              <div className="flex flex-col gap-1.5">
                <p style={{ fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.3)', margin: '0 0 2px' }}>Pagamento</p>
                {vendaOK.pagamentos.map((p, i) => (
                  <div key={i}>
                    <div className="flex items-center justify-between">
                      <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)' }}>{p.nome}</span>
                      <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.85)', fontWeight: 600 }}>{fmt(p.valor)}</span>
                    </div>
                    {p.troco > 0 && (
                      <p style={{ fontSize: '11px', color: 'rgba(100,220,160,0.8)', marginLeft: '8px' }}>↳ troco {fmt(p.troco)}</p>
                    )}
                    {p.tipo === 'credito' && (p.parcelas ?? 1) > 1 && (
                      <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)', marginLeft: '8px' }}>
                        {p.parcelas}× de {fmt((p.valor + (p.juros ?? 0)) / p.parcelas!)}
                        {(p.juros ?? 0) > 0 && <span style={{ color: 'rgba(240,160,100,0.7)' }}> · juros {fmt(p.juros!)}</span>}
                      </p>
                    )}
                  </div>
                ))}
              </div>

              {/* Crediário detail */}
              {vendaOK.crediario && (() => {
                const c = vendaOK.crediario!
                const fmtDate = (iso: string) => iso.split('-').reverse().join('/')
                return (
                  <>
                    <div style={{ height: '0.5px', background: 'rgba(255,255,255,0.07)' }} />
                    <div className="flex flex-col gap-1.5">
                      <p style={{ fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.3)', margin: '0 0 2px' }}>Crediário</p>
                      {c.entrada > 0.005 && (
                        <div className="flex items-center justify-between">
                          <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>Entrada{c.entrada_forma ? ` (${c.entrada_forma})` : ''}</span>
                          <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.65)' }}>{fmt(c.entrada)}</span>
                        </div>
                      )}
                      <div className="flex items-center justify-between">
                        <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>Financiado</span>
                        <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.65)' }}>{fmt(c.financiado)}</span>
                      </div>
                      {c.juros > 0.005 && (
                        <div className="flex items-center justify-between">
                          <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>Juros</span>
                          <span style={{ fontSize: '11px', color: 'rgba(240,160,100,0.75)' }}>{fmt(c.juros)}</span>
                        </div>
                      )}
                      <div className="flex items-center justify-between">
                        <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>Parcelamento</span>
                        <span style={{ fontSize: '12px', fontWeight: 600, color: '#0ef' }}>{c.parcelas}× {fmt(c.valor_parcela)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>1ª parcela</span>
                        <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.55)' }}>{fmtDate(c.primeira_parcela)}</span>
                      </div>
                    </div>
                  </>
                )
              })()}

              {/* Financial adjustments */}
              {(vendaOK.desconto_promocao + vendaOK.desconto_pagamento > 0 || vendaOK.cashback_gerado > 0 || vendaOK.cashback_usado > 0) && (
                <>
                  <div style={{ height: '0.5px', background: 'rgba(255,255,255,0.07)' }} />
                  <div className="flex flex-col gap-1">
                    {vendaOK.desconto_promocao > 0 && vendaOK.desconto_pagamento > 0 ? (
                      <>
                        <div className="flex items-center justify-between">
                          <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>Promoção</span>
                          <span style={{ fontSize: '11px', color: 'rgba(100,220,160,0.8)' }}>− {fmt(vendaOK.desconto_promocao)}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>Desconto</span>
                          <span style={{ fontSize: '11px', color: 'rgba(100,220,160,0.8)' }}>− {fmt(vendaOK.desconto_pagamento)}</span>
                        </div>
                      </>
                    ) : (vendaOK.desconto_promocao + vendaOK.desconto_pagamento > 0) ? (
                      <div className="flex items-center justify-between">
                        <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>Desconto</span>
                        <span style={{ fontSize: '11px', color: 'rgba(100,220,160,0.8)' }}>− {fmt(vendaOK.desconto_promocao + vendaOK.desconto_pagamento)}</span>
                      </div>
                    ) : null}
                    {vendaOK.cashback_gerado > 0 && (
                      <div className="flex items-center justify-between">
                        <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>Cashback</span>
                        <span style={{ fontSize: '11px', color: 'rgba(100,220,160,0.8)' }}>+ {fmt(vendaOK.cashback_gerado)}</span>
                      </div>
                    )}
                    {vendaOK.cashback_usado > 0 && (
                      <div className="flex items-center justify-between">
                        <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>Cashback usado</span>
                        <span style={{ fontSize: '11px', color: 'rgba(100,220,160,0.8)' }}>− {fmt(vendaOK.cashback_usado)}</span>
                      </div>
                    )}
                  </div>
                </>
              )}

              <div style={{ height: '0.5px', background: 'rgba(255,255,255,0.07)' }} />

              <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', textAlign: 'center', lineHeight: 1.4 }}>
                Passe um produto para iniciar a próxima venda
              </p>

              {gestaoCaixaCards}
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
                <span style={MOD_LABEL}>Total da venda</span>
                {/* Sem desconto */}
                <div>
                  <p style={{ fontSize: '9px', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 2px' }}>Sem desconto</p>
                  <p style={{ fontSize: '24px', fontWeight: 600, color: '#0ef', lineHeight: 1.1, margin: 0 }}>
                    R$ {subtotal.toFixed(2)}
                  </p>
                </div>
                {/* Com desconto — only when a cashier discount is applicable */}
                {descontoCaixa > 0 && (
                  <>
                    <div style={{ borderTop: '0.5px solid rgba(255,255,255,0.06)', margin: '8px 0' }} />
                    <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.5)', margin: '0 0 2px' }}>
                      Desconto pagável em:
                    </p>
                    {formasDesc.length > 0 && (
                      <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.75)', margin: '0 0 6px', lineHeight: 1.4 }}>
                        {formasDesc.join(', ')}
                      </p>
                    )}
                    <div>
                      <p style={{ fontSize: '9px', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 2px' }}>Com desconto</p>
                      <p style={{ fontSize: '18px', fontWeight: 600, color: 'rgba(100,220,160,0.9)', lineHeight: 1.1, margin: 0 }}>
                        R$ {valorComDesconto.toFixed(2)}
                      </p>
                      <p style={{ fontSize: '11px', color: 'rgba(100,220,160,0.7)', margin: '4px 0 0' }}>
                        Desconto {fmt(descontoCaixa)}
                      </p>
                    </div>
                  </>
                )}
                <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.2)', margin: '6px 0 0' }}>
                  {totalQtd} {totalQtd === 1 ? 'item' : 'itens'}
                </p>
              </div>

              {/* MIDDLE: Atribuição + Gestão — scrolling zone */}
              <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {/* Module 2 — Atribuição da venda */}
                <div style={MOD}>
                  <span style={MOD_LABEL}>Atribuição da venda</span>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '7px' }}>
                    {/* Cliente card */}
                    <div
                      role="button"
                      onClick={() => { if (cliente_id) { setModalDadosCliente(true) } else { setClienteAutoAberto(false); setModalCliente(true) } }}
                      style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '5px', padding: '14px 4px', borderRadius: '9px', cursor: 'pointer', overflow: 'hidden', background: cliente_id ? 'rgba(0,239,255,0.07)' : 'rgba(255,255,255,0.03)', border: cliente_id ? '0.5px solid rgba(0,239,255,0.35)' : '0.5px dashed rgba(255,255,255,0.14)' }}
                    >
                      <User size={19} style={{ color: cliente_id ? 'rgba(0,239,255,0.8)' : 'rgba(255,255,255,0.4)', flexShrink: 0 }} />
                      <span style={{ fontSize: '9px', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Cliente</span>
                      {cliente_nome && (
                        <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.85)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%', padding: '0 14px', textAlign: 'center' }}>
                          {cliente_nome}
                        </span>
                      )}
                      {cliente_id && (
                        <button
                          onClick={e => { e.stopPropagation(); setCliente(null, null) }}
                          style={{ position: 'absolute', top: '5px', right: '5px', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2px' }}
                        >
                          <X size={10} />
                        </button>
                      )}
                    </div>
                    {/* Vendedor card */}
                    <div
                      role="button"
                      onClick={() => setModalVendedor(true)}
                      style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '5px', padding: '14px 4px', borderRadius: '9px', cursor: 'pointer', overflow: 'hidden', background: vendedor ? 'rgba(0,239,255,0.07)' : 'rgba(255,255,255,0.03)', border: vendedor ? '0.5px solid rgba(0,239,255,0.35)' : '0.5px dashed rgba(255,255,255,0.14)' }}
                    >
                      <Briefcase size={19} style={{ color: vendedor ? 'rgba(0,239,255,0.8)' : 'rgba(255,255,255,0.4)', flexShrink: 0 }} />
                      <span style={{ fontSize: '9px', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Vendedor</span>
                      {vendedor && (
                        <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.85)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%', padding: '0 14px', textAlign: 'center' }}>
                          {vendedor.nome}
                        </span>
                      )}
                      {vendedor && !vendedorDaSacola && (
                        <button
                          onClick={e => { e.stopPropagation(); setVendedor(null); setVendedorStore(null, null) }}
                          style={{ position: 'absolute', top: '5px', right: '5px', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2px' }}
                        >
                          <X size={10} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Module 3 — Gestão do caixa */}
                {gestaoCaixaCards}
              </div>

              {/* BOTTOM: Module 4 — Finalizar venda */}
              <div style={MOD}>
                <span style={MOD_LABEL}>Finalizar venda</span>
                {itens.length === 0 ? (
                  <button disabled style={{ width: '100%', padding: '12px', background: 'rgba(255,255,255,0.04)', border: '0.5px solid rgba(255,255,255,0.08)', borderRadius: '8px', fontSize: '13px', color: 'rgba(255,255,255,0.25)', cursor: 'default' }}>
                    Sacola vazia
                  </button>
                ) : (
                  <button onClick={() => !locked && setModalCheckout(true)} disabled={locked} className="fechar-venda-btn" style={{ width: '100%', padding: '12px', background: locked ? 'rgba(255,255,255,0.06)' : 'rgba(0,239,255,0.88)', color: locked ? 'rgba(255,255,255,0.2)' : '#0a0a1a', fontWeight: 700, borderRadius: '8px', fontSize: '13px', border: 'none', cursor: locked ? 'default' : 'pointer' }}>
                    {locked ? 'Sangria obrigatória' : 'Fechar venda →'}
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Modais ────────────────────────────────────────────────────────── */}

      <CheckoutModal
        open={modalCheckout}
        onClose={() => { setModalCheckout(false); setTimeout(() => focusScanSafe(), 100) }}
        onSuccess={handleVendaOK}
        itensComDesconto={itensComDesconto}
        baseTotal={baseTotal}
        totalDesconto={totalDesconto}
        cashbackUsar={cashbackUsar}
        clienteId={cliente_id}
        clienteNome={cliente_nome}
        vendedorNome={vendedor ? vendedor.nome : (vendedor_nome ?? null)}
        vendedorRemovivel={!vendedorDaSacola}
        formasPagamento={formasPagamento}
        onAbrirCliente={() => { setClienteAutoAberto(false); setModalCliente(true) }}
        onAbrirVendedor={() => setModalVendedor(true)}
        onAbrirDadosCliente={() => setModalDadosCliente(true)}
        onRemoverCliente={() => setCliente(null, null)}
        onRemoverVendedor={() => { setVendedor(null); setVendedorStore(null, null) }}
      />

      <AdvancedSearchModal
        open={modalBusca}
        onClose={() => { setModalBusca(false); setTimeout(() => focusScanSafe(), 100) }}
        onAddItem={item => { addItem(item); setTimeout(() => focusScanSafe(), 100) }}
      />

      <CustomerSearchModal
        open={modalCliente}
        autoAberto={clienteAutoAberto}
        onClose={() => { setModalCliente(false); setClienteAutoAberto(false); setTimeout(() => focusScanSafe(), 100) }}
        onSelect={handleClienteSelecionado}
      />

      <SalespersonSearchModal
        open={modalVendedor}
        onClose={() => { setModalVendedor(false); setTimeout(() => focusScanSafe(), 100) }}
        onSelect={c => { setVendedor(c); setVendedorStore(c.id, c.nome); setModalVendedor(false); setTimeout(() => focusScanSafe(), 100) }}
      />

      <SacolasModal
        open={modalSacolas}
        onClose={() => { setModalSacolas(false); setTimeout(() => focusScanSafe(), 100) }}
        onCarregada={() => setTimeout(() => focusScanSafe(), 100)}
      />

      <ClienteDadosModal
        open={modalDadosCliente}
        clienteId={cliente_id}
        onClose={() => setModalDadosCliente(false)}
        onSaved={(c) => setCliente(c.id, c.nome)}
      />

      <AuthorizationGateModal
        open={!!gateItem}
        acao="cancelar_item"
        acaoLabel="Cancelar item do caixa"
        acaoTom="danger"
        exigeJustificativa={false}
        turnoId={turno?.id ?? null}
        detalhe={gateItem ? { versao_id: gateItem.versaoId, nome: gateItem.nome } : {}}
        onClose={() => setGateItem(null)}
        onAuthorized={() => { if (gateItem) removeItem(gateItem.versaoId); setGateItem(null) }}
      />

      <AuthorizationGateModal
        open={!!gateFechar}
        acao={gateFechar && gateFechar.divergencia < 0 ? 'fechar_falta' : 'fechar_sobra'}
        acaoLabel={gateFechar && gateFechar.divergencia < 0 ? 'Fechar caixa com falta' : 'Fechar caixa com sobra'}
        acaoTom="danger"
        exigeJustificativa
        somenteJustificativa={operadorSupervisor}
        turnoId={turno?.id ?? null}
        detalhe={gateFechar ? { divergencia: gateFechar.divergencia } : {}}
        onClose={() => setGateFechar(null)}
        onAuthorized={async (r) => {
          setSalvMov(true)
          try {
            await fechar(saldoFinal / 100, obsFech || undefined, r.justificativa ?? null, r.autorizacao_id ?? null)
            setGateFechar(null)
            setModalFechar(false)
          } finally {
            setSalvMov(false)
          }
        }}
      />

      {/* Modal Limite de caixa */}
      {avisoLimite && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(2,8,16,0.82)' }}
          onClick={locked ? undefined : () => setAvisoLimite(false)}
        >
          <div
            style={{ background: 'rgba(8,18,30,0.98)', border: `0.5px solid ${locked ? 'rgba(240,100,100,0.3)' : 'rgba(234,179,8,0.3)'}`, borderRadius: '16px', width: '100%', maxWidth: '380px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: locked ? 'rgba(240,100,100,0.1)' : 'rgba(234,179,8,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <span style={{ fontSize: '18px' }}>{locked ? '🔒' : '⚠️'}</span>
              </div>
              <div>
                <p style={{ fontSize: '15px', fontWeight: 600, color: 'rgba(255,255,255,0.88)', margin: 0 }}>Limite de caixa atingido</p>
                <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)', margin: '2px 0 0' }}>
                  {locked ? 'Faça uma sangria para continuar vendendo' : 'Recomenda-se fazer uma sangria'}
                </p>
              </div>
            </div>

            <div style={{ background: locked ? 'rgba(240,100,100,0.08)' : 'rgba(234,179,8,0.08)', border: `0.5px solid ${locked ? 'rgba(240,100,100,0.2)' : 'rgba(234,179,8,0.2)'}`, borderRadius: '10px', padding: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.45)' }}>Dinheiro em caixa</span>
                <span style={{ fontSize: '13px', fontWeight: 600, color: locked ? 'rgba(240,130,130,0.9)' : 'rgba(234,179,8,0.9)' }}>{fmt(dinheiroCaixa)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.45)' }}>Limite configurado</span>
                <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.55)' }}>{fmt(limiteCfg.limite)}</span>
              </div>
            </div>

            {suggestedCents > 0 && (
              <p style={{ fontSize: '11px', color: 'rgba(100,220,160,0.7)', textAlign: 'center', margin: 0 }}>
                Valor sugerido: {fmt(suggestedCents / 100)} — deixa {fmt(limiteCfg.fundo)} na gaveta
              </p>
            )}

            <div style={{ display: 'flex', gap: '10px' }}>
              {!locked && (
                <button
                  onClick={() => setAvisoLimite(false)}
                  style={{ flex: 1, minHeight: '44px', background: 'none', border: '0.5px solid rgba(255,255,255,0.12)', borderRadius: '10px', color: 'rgba(255,255,255,0.45)', fontSize: '13px', cursor: 'pointer' }}
                >
                  Depois
                </button>
              )}
              <button
                onClick={() => {
                  setAvisoLimite(false)
                  setValorMov(suggestedCents > 0 ? suggestedCents : 0)
                  setMotivoMov(locked ? 'Limite de caixa atingido' : '')
                  setSangriaObrigatoria(locked)
                  setModalMov('sangria')
                }}
                style={{ flex: 1, minHeight: '44px', background: 'rgba(234,179,8,0.15)', border: '0.5px solid rgba(234,179,8,0.4)', borderRadius: '10px', color: 'rgba(234,179,8,0.9)', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
              >
                Fazer sangria
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Boas-vindas */}
      {modalBoasVindas && boasVindasRef.current && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={() => { setModalBoasVindas(false); if (boasVindasTimerRef.current) clearTimeout(boasVindasTimerRef.current) }}
        >
          <div
            style={{ background: 'rgb(8,18,30)', border: '0.5px solid rgba(255,255,255,0.12)', borderRadius: '14px', padding: '36px 32px', width: '340px', maxWidth: '90vw', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '20px' }}
            onClick={e => e.stopPropagation()}
          >
            {/* Check circle */}
            <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'rgba(100,220,160,0.1)', border: '1px solid rgba(100,220,160,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto' }}>
              <Check size={22} style={{ color: 'rgba(100,220,160,0.9)' }} />
            </div>

            {/* Message */}
            <p style={{ fontSize: '17px', color: 'rgba(255,255,255,0.8)', fontWeight: 500, lineHeight: 1.5, margin: 0 }}>
              {boasVindasRef.current.msg}
            </p>

            {/* Info rows */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px', color: 'rgba(255,255,255,0.4)', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Clock size={14} style={{ color: 'rgba(255,255,255,0.25)', flexShrink: 0 }} />
                <span>Caixa aberto às {boasVindasRef.current.hora}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <DollarSign size={14} style={{ color: 'rgba(255,255,255,0.25)', flexShrink: 0 }} />
                <span>Saldo inicial: {fmt(saldoInicial / 100)}</span>
              </div>
            </div>

            {/* Divider */}
            <div style={{ borderTop: '0.5px solid rgba(255,255,255,0.06)' }} />

            <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.2)', margin: 0 }}>Fechando em instantes...</p>
          </div>
        </div>
      )}

      {/* Modal Seleção de Variação */}
      {modalVariacao && produtoVariacao && (() => {
        const { produto, qty } = produtoVariacao
        const versoes: any[]   = produto.versoes ?? []
        return (
          <div
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            onClick={() => { setModalVariacao(false); setTimeout(() => focusScanSafe(), 100) }}
          >
            <div
              style={{ background: 'rgba(12,25,45,0.99)', border: '0.5px solid rgba(255,255,255,0.14)', borderRadius: '14px', padding: '24px 20px 20px', width: '460px', maxWidth: '90vw', maxHeight: '88vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0' }}
              onClick={e => e.stopPropagation()}
            >
              {/* Header */}
              <div style={{ textAlign: 'center', marginBottom: '18px' }}>
                <p style={{ fontSize: '16px', color: 'rgba(255,255,255,0.85)', fontWeight: 600, margin: '0 0 4px' }}>{produto.nome}</p>
                <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', margin: 0 }}>
                  {versoes.length} variação{versoes.length !== 1 ? 'ões' : ''} disponível{versoes.length !== 1 ? 'is' : ''} · clique para adicionar ao caixa
                  {qty > 1 && <span style={{ color: 'rgba(0,239,255,0.6)' }}> · {qty} unidades</span>}
                </p>
              </div>

              {/* Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: '8px', marginBottom: '14px' }}>
                {versoes.map((versao: any, idx: number) => {
                  const esgotado = produto.controle_estoque && versao.estoque_atual <= 0
                  const focused  = idx === focadoIdx && !esgotado
                  const preco    = versao.preco_especifico ? parseFloat(versao.preco_especifico) : parseFloat(produto.preco_base)
                  const atribs   = Object.entries(versao.atributos_json ?? {}) as [string, string][]
                  return (
                    <div
                      key={versao.id}
                      onClick={() => !esgotado && adicionarVariacao(versao)}
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

              {/* Hint */}
              <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.2)', textAlign: 'center', margin: 0 }}>
                ← → navegar · Enter adicionar · Esc cancelar
              </p>
            </div>
          </div>
        )
      })()}

      {/* Modal Sangria / Suprimento */}
      {modalMov && (
        <div className="fixed inset-0 bg-midnight/80 z-50 flex items-center justify-center p-4" onClick={sangriaObrigatoria ? undefined : closeModalMov}>
          <div
            className="bg-deep-ocean rounded-2xl w-full max-w-lg p-6 flex flex-col gap-4"
            style={{ maxHeight: '88vh', border: sangriaObrigatoria ? '0.5px solid rgba(240,100,100,0.35)' : '0.5px solid rgba(255,255,255,0.1)' }}
            onClick={e => e.stopPropagation()}
          >
            <div>
              <h3 className="text-sea-foam font-semibold capitalize">{modalMov}</h3>
              {sangriaObrigatoria ? (
                <div style={{ marginTop: '6px', background: 'rgba(240,100,100,0.08)', border: '0.5px solid rgba(240,100,100,0.2)', borderRadius: '8px', padding: '8px 10px' }}>
                  <p style={{ fontSize: '11px', color: 'rgba(240,130,130,0.8)', margin: 0 }}>
                    Caixa com {fmt(dinheiroCaixa)} em dinheiro — acima do limite de {fmt(limiteCfg.limite)}. Faça a sangria para continuar vendendo.
                  </p>
                </div>
              ) : (
                <p className="text-steel text-xs mt-1">{modalMov === 'sangria' ? 'Retirada de dinheiro do caixa.' : 'Reforço de dinheiro no caixa.'}</p>
              )}
            </div>
            <div>
              <label className="text-steel text-xs block mb-1">Valor (R$)</label>
              <CurrencyInput
                value={valorMov} onChange={setValorMov} onEnter={handleMovimento}
                autoFocus placeholder="R$ 0,00"
                className="w-full min-h-[48px] bg-midnight border border-ocean-depth rounded-xl px-4 text-sea-foam text-sm outline-none focus:border-electric-cyan" />
              {sangriaObrigatoria && suggestedCents > 0 && (
                <p style={{ fontSize: '11px', color: 'rgba(100,220,160,0.7)', marginTop: '4px' }}>
                  sugerido — deixa {fmt(limiteCfg.fundo)} na gaveta
                </p>
              )}
            </div>
            {!sangriaObrigatoria && (
              <div>
                <label className="text-steel text-xs block mb-1">Motivo (opcional)</label>
                <input type="text" value={motivoMov} onChange={e => setMotivoMov(e.target.value)}
                  className="w-full min-h-[44px] bg-midnight border border-ocean-depth rounded-xl px-4 text-sea-foam text-sm outline-none focus:border-electric-cyan" />
              </div>
            )}
            {movErro && (
              <div style={{ background: 'rgba(240,100,100,0.08)', border: '0.5px solid rgba(240,100,100,0.2)', borderRadius: '8px', padding: '8px 10px' }}>
                <p style={{ fontSize: '12px', color: 'rgba(240,130,130,0.85)', margin: 0 }}>{movErro}</p>
              </div>
            )}
            <div className="flex gap-3">
              {!sangriaObrigatoria && (
                <button onClick={closeModalMov} className="flex-1 min-h-[44px] border border-ocean-depth text-steel rounded-xl text-sm">Cancelar</button>
              )}
              <button onClick={handleMovimento} disabled={salvMov || !valorMov}
                className="flex-1 min-h-[44px] bg-electric-cyan text-midnight rounded-xl text-sm font-semibold disabled:opacity-40">
                {salvMov ? '...' : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Fechar Caixa */}
      {modalFechar && (() => {
        const saldoIni    = Number(turno?.saldo_inicial ?? 0)
        const sangrias    = Number(turno?.total_sangrias ?? 0)
        const suprimentos = Number(turno?.total_suprimentos ?? 0)

        const porFormaMap: Record<string, { nome: string; tipo: string; total: number }> = {}
        let dinheiroVendas = 0
        for (const v of fechVendas) {
          for (const p of v.pagamentos ?? []) {
            if (!porFormaMap[p.forma_nome]) porFormaMap[p.forma_nome] = { nome: p.forma_nome, tipo: p.tipo, total: 0 }
            porFormaMap[p.forma_nome].total += Number(p.valor)
            if (p.tipo === 'dinheiro') dinheiroVendas += Number(p.valor)
          }
        }
        const porForma     = Object.values(porFormaMap).sort((a, b) => b.total - a.total)
        const saldoEsperado = saldoIni + dinheiroVendas + suprimentos - sangrias
        const contado       = saldoFinal / 100
        const diferenca     = Math.round((contado - saldoEsperado) * 100) / 100
        const surplusColor  = diferenca >= 0 ? '#64dca0' : '#f06464'

        const PILL_COLORS: Record<string, string> = {
          dinheiro:       'rgba(100,220,160,0.12)',
          pix:            'rgba(0,239,255,0.12)',
          cartao_credito: 'rgba(168,85,247,0.12)',
          cartao_debito:  'rgba(45,212,191,0.12)',
          crediario:      'rgba(251,146,60,0.12)',
        }
        const PILL_TEXT: Record<string, string> = {
          dinheiro:       '#64dca0',
          pix:            '#0ef',
          cartao_credito: '#c084fc',
          cartao_debito:  '#5eead4',
          crediario:      '#fb923c',
        }

        return (
          <div className="fixed inset-0 bg-midnight/80 z-50 flex items-center justify-center p-4" onClick={() => setModalFechar(false)}>
            <div
              style={{ background: 'rgba(8,18,30,0.92)', backdropFilter: 'blur(16px)', border: '0.5px solid rgba(255,255,255,0.1)', borderRadius: '16px', width: '100%', maxWidth: '480px', maxHeight: '90vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}
              onClick={e => e.stopPropagation()}
            >
              {/* Header */}
              <div style={{ padding: '18px 20px 14px', borderBottom: '0.5px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
                <div>
                  <p style={{ fontSize: '15px', fontWeight: 700, color: 'rgba(255,255,255,0.88)' }}>Fechar Caixa</p>
                  <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)', marginTop: '2px' }}>Revise o resumo do turno antes de confirmar</p>
                </div>
                <button onClick={() => setModalFechar(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.3)', fontSize: '18px', lineHeight: 1, padding: '4px' }}>×</button>
              </div>

              {/* Body — scrollable */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>

                {fechLoad ? (
                  <div style={{ display: 'flex', justifyContent: 'center', padding: '32px 0' }}>
                    <div className="w-7 h-7 border-2 border-electric-cyan border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : (
                  <>
                    {/* Section 1 — Receita por forma */}
                    <div>
                      <p style={{ fontSize: '9px', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px' }}>Receita por forma de pagamento</p>
                      {porForma.length === 0 ? (
                        <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)' }}>Nenhuma venda neste turno.</p>
                      ) : (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                          {porForma.map(f => (
                            <div key={f.nome} style={{ background: PILL_COLORS[f.tipo] ?? 'rgba(255,255,255,0.05)', border: `0.5px solid ${PILL_TEXT[f.tipo] ?? 'rgba(255,255,255,0.1)'}33`, borderRadius: '8px', padding: '8px 10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
                              <span style={{ fontSize: '11px', color: PILL_TEXT[f.tipo] ?? 'rgba(255,255,255,0.5)', fontWeight: 500 }}>{f.nome}</span>
                              <span style={{ fontSize: '12px', color: PILL_TEXT[f.tipo] ?? 'rgba(255,255,255,0.7)', fontWeight: 700 }}>{fmt(f.total)}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Section 2 — Saldo esperado */}
                    <div style={{ background: 'rgba(255,255,255,0.03)', border: '0.5px solid rgba(255,255,255,0.08)', borderRadius: '10px', padding: '12px 14px' }}>
                      <p style={{ fontSize: '9px', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '10px' }}>Saldo esperado em caixa</p>
                      {[
                        { label: 'Saldo inicial',       value: saldoIni,       sign: '+', color: '#64dca0' },
                        { label: 'Vendas em dinheiro',  value: dinheiroVendas, sign: '+', color: '#64dca0' },
                        { label: 'Suprimentos',         value: suprimentos,    sign: '+', color: '#64dca0' },
                        { label: 'Sangrias',            value: sangrias,       sign: '−', color: '#f06464' },
                      ].map(row => (
                        <div key={row.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                          <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>{row.label}</span>
                          <span style={{ fontSize: '12px', color: row.color, fontWeight: 600 }}>{row.sign} {fmt(row.value)}</span>
                        </div>
                      ))}
                      <div style={{ borderTop: '0.5px solid rgba(255,255,255,0.08)', marginTop: '8px', paddingTop: '8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)', fontWeight: 600 }}>Total esperado</span>
                        <span style={{ fontSize: '14px', color: '#0ef', fontWeight: 700 }}>{fmt(saldoEsperado)}</span>
                      </div>
                    </div>

                    {/* Section 3 — Valor contado */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                      <p style={{ fontSize: '9px', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Valor contado em caixa</p>
                      <CurrencyInput
                        value={saldoFinal} onChange={setSaldoFinal}
                        onEnter={() => obsFechRef.current?.focus()}
                        autoFocus placeholder="R$ 0,00"
                        style={{ background: 'rgba(0,239,255,0.05)', border: '1px solid rgba(0,239,255,0.25)', borderRadius: '10px', padding: '12px 16px', fontSize: '20px', fontWeight: 600, color: 'rgba(255,255,255,0.88)', outline: 'none', width: '100%', textAlign: 'center' }}
                      />
                    </div>

                    {/* Section 4 — Diferença */}
                    {saldoFinal > 0 && (
                      <div style={{ background: diferenca >= 0 ? 'rgba(100,220,160,0.08)' : 'rgba(240,100,100,0.08)', border: `0.5px solid ${surplusColor}44`, borderRadius: '10px', padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>{diferenca === 0 ? 'Diferença' : diferenca > 0 ? 'Sobra' : 'Falta'}</span>
                        <span style={{ fontSize: '14px', color: surplusColor, fontWeight: 700 }}>
                          {diferenca > 0 ? '+' : diferenca < 0 ? '−' : ''}{fmt(Math.abs(diferenca))}
                        </span>
                      </div>
                    )}

                    {/* Observacao */}
                    <div>
                      <label style={{ fontSize: '9px', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.1em', display: 'block', marginBottom: '6px' }}>Observação (opcional)</label>
                      <input ref={obsFechRef} type="text" value={obsFech}
                        onChange={e => setObsFech(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && !salvMov && !fechLoad && handleFechar()}
                        placeholder="Ex: fechamento de sábado"
                        style={{ background: 'rgba(8,18,30,0.5)', border: '0.5px solid rgba(255,255,255,0.12)', borderRadius: '8px', padding: '9px 12px', fontSize: '13px', color: 'rgba(255,255,255,0.75)', outline: 'none', width: '100%' }}
                        onFocus={e => { e.currentTarget.style.borderColor = 'rgba(0,239,255,0.4)' }}
                        onBlur={e  => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)' }}
                      />
                    </div>
                  </>
                )}
              </div>

              {/* Footer */}
              <div style={{ padding: '12px 20px 16px', borderTop: '0.5px solid rgba(255,255,255,0.07)', display: 'flex', gap: '10px', flexShrink: 0 }}>
                <button onClick={() => setModalFechar(false)}
                  style={{ flex: 1, minHeight: '44px', background: 'none', border: '0.5px solid rgba(255,255,255,0.12)', borderRadius: '10px', color: 'rgba(255,255,255,0.45)', fontSize: '13px', cursor: 'pointer' }}>
                  Cancelar
                </button>
                <button onClick={handleFechar} disabled={salvMov || fechLoad}
                  style={{ flex: 2, minHeight: '44px', background: salvMov ? 'rgba(0,239,255,0.4)' : 'rgba(0,239,255,0.88)', border: 'none', borderRadius: '10px', color: '#0a0a1a', fontSize: '13px', fontWeight: 700, cursor: salvMov ? 'default' : 'pointer', opacity: salvMov || fechLoad ? 0.6 : 1 }}>
                  {salvMov ? 'Fechando...' : 'Confirmar fechamento'}
                </button>
              </div>
            </div>
          </div>
        )
      })()}

    </div>
    </>
  )
}
