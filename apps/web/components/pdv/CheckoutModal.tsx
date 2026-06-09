'use client'

import { useEffect, useRef, useState } from 'react'
import { User, Briefcase, X, Minus, Plus } from 'lucide-react'
import { financeiroApi, type FormaPagamento } from '@/lib/api/financeiro'
import { vendasApi, type PagamentoVenda } from '@/lib/api/vendas'
import { clientesApi } from '@/lib/api/clientes'
import { usePDVStore } from '@/store/pdv.store'
import { api } from '@/lib/api/client'
import type { ItemComDesconto } from '@/lib/calcularDesconto'

// ── Types ─────────────────────────────────────────────────────────────────────

interface PagamentoParcial {
  forma:    FormaPagamento
  valor:    number
  parcelas: number
}

interface DescontoCfg {
  pct:         number
  valor:       number
  promoAceita: boolean
  restringe:   boolean
}

interface CrediarioCfg {
  max_parcelas:        number
  entrada_obrigatoria: boolean
  entrada_min_pct:     number
  juros_habilitado:    boolean
  juros_sem_ate:       number
  juros_mes:           number
  formas_entrada_ids:  string[]
}

interface CreditoInfo {
  limite:     number
  ocupado:    number
  disponivel: number
}

export interface CheckoutResult {
  venda_id:           string
  total:              number
  cashback_gerado:    number
  pagamentos:         { nome: string; valor: number; troco: number }[]
  desconto_promocao:  number
  desconto_pagamento: number
  cashback_usado:     number
}

interface Props {
  open:                boolean
  onClose:             () => void
  onSuccess:           (r: CheckoutResult) => void
  itensComDesconto:    ItemComDesconto[]
  baseTotal:           number
  totalDesconto:       number
  cashbackUsar:        number
  clienteId:           string | null
  clienteNome:         string | null
  vendedorNome:        string | null
  vendedorRemovivel:   boolean
  onAbrirCliente:      () => void
  onAbrirVendedor:     () => void
  onAbrirDadosCliente: () => void
  onRemoverCliente:    () => void
  onRemoverVendedor:   () => void
}

function defaultPrimeiraParcela(): string {
  const d = new Date()
  d.setMonth(d.getMonth() + 1)
  return d.toISOString().split('T')[0]
}

// ── Component ─────────────────────────────────────────────────────────────────

export function CheckoutModal({
  open, onClose, onSuccess,
  itensComDesconto, baseTotal, totalDesconto, cashbackUsar, clienteId,
  clienteNome, vendedorNome, vendedorRemovivel,
  onAbrirCliente, onAbrirVendedor, onAbrirDadosCliente, onRemoverCliente, onRemoverVendedor,
}: Props) {
  const valorRef = useRef<HTMLInputElement>(null)

  // ── Core state ───────────────────────────────────────────────────────────
  const [formas,          setFormas]          = useState<FormaPagamento[]>([])
  const [carregando,      setCarregando]      = useState(false)
  const [pagamentos,      setPagamentos]      = useState<PagamentoParcial[]>([])
  const [formaAtual,      setFormaAtual]      = useState<FormaPagamento | null>(null)
  const [valorAtual,      setValorAtual]      = useState('')
  const [parcelas,        setParcelas]        = useState(1)
  const [processando,     setProcessando]     = useState(false)
  const [erro,            setErro]            = useState('')
  const [descontoCfg,     setDescontoCfg]     = useState<DescontoCfg | null>(null)
  const [comDesconto,     setComDesconto]     = useState(false)
  const [creditoLiberado, setCreditoLiberado] = useState(false)
  const [creditoInfo,     setCreditoInfo]     = useState<CreditoInfo>({ limite: 0, ocupado: 0, disponivel: 0 })

  // ── Crediário state ──────────────────────────────────────────────────────
  const [crediarioCfg,      setCrediarioCfg]      = useState<CrediarioCfg | null>(null)
  const [entrada,           setEntrada]            = useState(0)
  const [crediarioParcelas, setCrediarioParcelas]  = useState(1)
  const [primeiraParcela,   setPrimeiraParcela]    = useState(defaultPrimeiraParcela)
  const [formaEntradaId,    setFormaEntradaId]     = useState<string | null>(null)

  // ── Load forms + config on open ──────────────────────────────────────────
  useEffect(() => {
    if (!open) return
    setPagamentos([]); setValorAtual(''); setParcelas(1); setErro(''); setComDesconto(false)
    setCreditoLiberado(false); setCreditoInfo({ limite: 0, ocupado: 0, disponivel: 0 })
    setCrediarioParcelas(1); setPrimeiraParcela(defaultPrimeiraParcela())
    setEntrada(0); setFormaEntradaId(null)
    setCarregando(true)

    Promise.all([
      financeiroApi.formasPagamento(),
      api.get<any>('/dados-loja/sistema'),
    ]).then(([fs, sysRes]) => {
      const TIPOS = ['dinheiro', 'pix', 'debito', 'credito', 'crediario']
      const sorted = [...fs].sort((a, b) => {
        const ia = TIPOS.indexOf(a.tipo); const ib = TIPOS.indexOf(b.tipo)
        if (ia !== ib) return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib)
        return a.nome.localeCompare(b.nome)
      })
      const cfg: DescontoCfg = {
        pct:         Number(sysRes.data.desconto_max_percentual ?? 0),
        valor:       Number(sysRes.data.desconto_max_valor ?? 0),
        promoAceita: !!sysRes.data.promocao_aceita_desconto,
        restringe:   !!sysRes.data.desconto_restringe_formas,
      }
      const ccfg: CrediarioCfg = {
        max_parcelas:        Number(sysRes.data.crediario_max_parcelas ?? 12),
        entrada_obrigatoria: !!sysRes.data.crediario_entrada_obrigatoria,
        entrada_min_pct:     Number(sysRes.data.crediario_entrada_min_pct ?? 0),
        juros_habilitado:    !!sysRes.data.crediario_juros_habilitado,
        juros_sem_ate:       Number(sysRes.data.crediario_juros_sem_ate ?? 0),
        juros_mes:           Number(sysRes.data.crediario_juros_mes ?? 0),
        formas_entrada_ids:  Array.isArray(sysRes.data.crediario_formas_entrada) ? sysRes.data.crediario_formas_entrada : [],
      }
      setFormas(sorted)
      setDescontoCfg(cfg)
      setCrediarioCfg(ccfg)
      // Default to first non-crediário form; credit effect will reveal crediário when confirmed
      setFormaAtual(sorted.find(f => f.ativo && f.tipo !== 'crediario') ?? null)
      setCarregando(false)
      setTimeout(() => valorRef.current?.focus(), 100)
    }).catch(() => setCarregando(false))
  }, [open])

  // ── Re-fetch credit whenever clienteId changes while modal is open ───────
  useEffect(() => {
    if (!open) return
    if (!clienteId) {
      setCreditoLiberado(false)
      setCreditoInfo({ limite: 0, ocupado: 0, disponivel: 0 })
      return
    }
    clientesApi.getCredito(clienteId)
      .then(r => {
        setCreditoLiberado(r.credito_liberado === true)
        setCreditoInfo({ limite: Number(r.limite), ocupado: Number(r.ocupado), disponivel: Number(r.disponivel) })
      })
      .catch(() => {
        setCreditoLiberado(false)
        setCreditoInfo({ limite: 0, ocupado: 0, disponivel: 0 })
      })
  }, [open, clienteId])

  if (!open) return null

  // ── Discount computation ─────────────────────────────────────────────────
  const baseElegivel = itensComDesconto.reduce((s, i) => {
    if (i.aceita_desconto === false) return s
    if (i.desconto_item > 0 && descontoCfg && !descontoCfg.promoAceita) return s
    return s + i.preco_unitario * i.quantidade - i.desconto_item
  }, 0)
  let descontoCaixa = 0
  if (descontoCfg && (descontoCfg.pct > 0 || descontoCfg.valor > 0)) {
    const porPct = descontoCfg.pct > 0 ? baseElegivel * (descontoCfg.pct / 100) : Infinity
    const porVal = descontoCfg.valor > 0 ? descontoCfg.valor : Infinity
    descontoCaixa = Math.round(Math.min(porPct, porVal, baseElegivel) * 100) / 100
  }
  const totalEfetivo = comDesconto
    ? Math.round((baseTotal - descontoCaixa) * 100) / 100
    : baseTotal

  // ── Allowed forms ────────────────────────────────────────────────────────
  const formasPermitidas = formas.filter(f => {
    if (!f.ativo) return false
    if (f.tipo === 'crediario' && !creditoLiberado) return false
    if (comDesconto && descontoCfg?.restringe && f.aceita_desconto === false) return false
    return true
  })

  // ── Common payment calculations ──────────────────────────────────────────
  const fmt         = (v: number) => `R$ ${v.toFixed(2)}`
  const totalJaPago = pagamentos.reduce((s, p) => s + p.valor, 0)
  const restante    = Math.max(0, totalEfetivo - totalJaPago)
  const valAtual    = parseFloat(valorAtual) || 0
  const troco       = valAtual > restante ? valAtual - restante : 0
  const usadasIds   = pagamentos.map(p => p.forma.id)

  // ── Crediário derived values ─────────────────────────────────────────────
  const entradaMinima  = crediarioCfg ? Math.round(totalEfetivo * (crediarioCfg.entrada_min_pct / 100) * 100) / 100 : 0
  const financiado     = Math.round(Math.max(0, totalEfetivo - entrada) * 100) / 100
  const N              = crediarioParcelas
  const jurosParcelado = (() => {
    if (!crediarioCfg?.juros_habilitado || N <= crediarioCfg.juros_sem_ate) return financiado
    return Math.round(financiado * (1 + (crediarioCfg.juros_mes / 100) * N) * 100) / 100
  })()
  const valorPorParcela = N > 0 ? jurosParcelado / N : 0
  const creditoOk       = financiado <= creditoInfo.disponivel + 0.01
  const entradaValida   = crediarioCfg?.entrada_obrigatoria ? entrada >= entradaMinima - 0.005 : true
  const crediarioOk     = entradaValida && financiado > 0.005 && creditoOk

  const formasEntrada: FormaPagamento[] = (() => {
    if (!crediarioCfg) return []
    const ids = crediarioCfg.formas_entrada_ids
    if (ids.length > 0) return formas.filter(f => f.ativo && ids.includes(f.id))
    return formas.filter(f => f.ativo && f.tipo !== 'crediario')
  })()

  const isCrediario = formaAtual?.tipo === 'crediario'

  // ── Discount toggle ──────────────────────────────────────────────────────
  function handleComDesconto(novoValor: boolean) {
    setComDesconto(novoValor)
    setPagamentos([]); setValorAtual(''); setParcelas(1); setErro('')
    const novasPermitidas = formas.filter(f => {
      if (!f.ativo) return false
      if (f.tipo === 'crediario' && !creditoLiberado) return false
      if (novoValor && descontoCfg?.restringe && f.aceita_desconto === false) return false
      return true
    })
    setFormaAtual(novasPermitidas[0] ?? null)
    setTimeout(() => valorRef.current?.focus(), 50)
  }

  // ── Switch payment form ──────────────────────────────────────────────────
  function handleFormaChange(f: FormaPagamento) {
    const switchingToCrediario = f.tipo === 'crediario' && formaAtual?.tipo !== 'crediario'
    setFormaAtual(f)
    setErro('')
    if (switchingToCrediario) {
      setPagamentos([])
      setValorAtual('')
      const min = crediarioCfg ? Math.round(totalEfetivo * (crediarioCfg.entrada_min_pct / 100) * 100) / 100 : 0
      setEntrada(min)
      setCrediarioParcelas(1)
      setPrimeiraParcela(defaultPrimeiraParcela())
      setFormaEntradaId(null)
    }
  }

  // ── Build API payments for common flow ───────────────────────────────────
  function construirPagamentosParaAPI(lista: PagamentoParcial[]) {
    const totalAlvo  = totalEfetivo
    const rounded    = lista.map(p => Math.round(p.valor * 100) / 100)
    const currentSum = rounded.reduce((s, v) => s + v, 0)
    const diff       = Math.round((totalAlvo - currentSum) * 100) / 100
    if (Math.abs(diff) >= 0.005) {
      const cashIdxs = lista.map((p, i) => p.forma.tipo === 'dinheiro' ? i : -1).filter(i => i >= 0)
      const corrIdx  = cashIdxs.length > 0 ? cashIdxs[cashIdxs.length - 1] : lista.length - 1
      if (corrIdx >= 0) rounded[corrIdx] = Math.round((rounded[corrIdx] + diff) * 100) / 100
    }
    return lista.map((p, i) => {
      const abatedValor = rounded[i]
      const isDinheiro  = p.forma.tipo === 'dinheiro'
      return {
        forma_pagamento_id: p.forma.id,
        valor:              abatedValor,
        parcelas:           p.parcelas,
        valor_recebido:     isDinheiro ? p.valor : undefined,
        troco:              isDinheiro ? Math.round(Math.max(0, p.valor - abatedValor) * 100) / 100 : undefined,
      }
    }).filter(p => p.valor > 0)
  }

  function validarEntrada(): string | null {
    if (!formaAtual || valAtual <= 0) return null
    if (formaAtual.tipo !== 'dinheiro' && valAtual > restante + 0.01)
      return 'Valor inválido: pagamento excede o saldo restante.'
    return null
  }

  function registrarEtapa() {
    if (!formaAtual || valAtual <= 0) return
    const err = validarEntrada()
    if (err) { setErro(err); return }
    setErro('')
    const novoPag: PagamentoParcial = { forma: formaAtual, valor: valAtual, parcelas }
    const novaLista    = [...pagamentos, novoPag]
    const novoRestante = Math.max(0, totalEfetivo - novaLista.reduce((s, p) => s + p.valor, 0))
    if (novoRestante <= 0.01) {
      finalizarVenda(novaLista)
    } else {
      setPagamentos(novaLista)
      setValorAtual(''); setParcelas(1)
      const usadas = novaLista.map(p => p.forma.id)
      const prox = formasPermitidas.find(f => !usadas.includes(f.id))
      if (prox) setFormaAtual(prox)
      setTimeout(() => valorRef.current?.focus(), 50)
    }
  }

  async function finalizarVenda(lista: PagamentoParcial[]) {
    setProcessando(true); setErro('')
    const D = comDesconto ? descontoCaixa : 0
    try {
      const pagamentosParaAPI = construirPagamentosParaAPI(lista)
      const { vendedor_id, vendedor_nome } = usePDVStore.getState()
      const r = await vendasApi.registrar({
        cliente_id:         clienteId ?? null,
        itens:              itensComDesconto.map(i => ({ versao_id: i.versao_id, quantidade: i.quantidade, preco_unitario: i.preco_unitario, desconto_item: i.desconto_item })),
        pagamentos:         pagamentosParaAPI,
        cashback_usado:     cashbackUsar,
        desconto_promocao:  totalDesconto,
        desconto_pagamento: D,
        vendedor_id:        vendedor_id ?? null,
        vendedor_nome:      vendedor_nome ?? null,
      })
      const pagamentosRecap = pagamentosParaAPI.map(p => {
        const original = lista.find(l => l.forma.id === p.forma_pagamento_id)
        return { nome: original?.forma.nome ?? '', valor: p.valor, troco: p.troco ?? 0 }
      })
      resetState()
      onSuccess({ ...r, pagamentos: pagamentosRecap, desconto_promocao: totalDesconto, desconto_pagamento: D, cashback_usado: cashbackUsar })
    } catch (e: any) {
      setErro(e?.response?.data?.error ?? 'Erro ao registrar venda.')
      setProcessando(false)
    }
  }

  async function finalizarCrediario() {
    if (!formaAtual || !crediarioOk) return
    setProcessando(true); setErro('')
    const D = comDesconto ? descontoCaixa : 0
    try {
      const formaEnt = formasEntrada.find(f => f.id === (formaEntradaId ?? formasEntrada[0]?.id))
      const pags: PagamentoVenda[] = []
      if (entrada > 0.005 && formaEnt) {
        pags.push({ forma_pagamento_id: formaEnt.id, valor: Math.round(entrada * 100) / 100, parcelas: 1 })
      }
      pags.push({ forma_pagamento_id: formaAtual.id, valor: financiado, parcelas: N, primeira_parcela: primeiraParcela })
      const { vendedor_id, vendedor_nome } = usePDVStore.getState()
      const r = await vendasApi.registrar({
        cliente_id:         clienteId ?? null,
        itens:              itensComDesconto.map(i => ({ versao_id: i.versao_id, quantidade: i.quantidade, preco_unitario: i.preco_unitario, desconto_item: i.desconto_item })),
        pagamentos:         pags,
        cashback_usado:     cashbackUsar,
        desconto_promocao:  totalDesconto,
        desconto_pagamento: D,
        vendedor_id:        vendedor_id ?? null,
        vendedor_nome:      vendedor_nome ?? null,
      })
      const pagamentosRecap = pags.map(p => ({ nome: '', valor: p.valor, troco: 0 }))
      resetState()
      onSuccess({ ...r, pagamentos: pagamentosRecap, desconto_promocao: totalDesconto, desconto_pagamento: D, cashback_usado: cashbackUsar })
    } catch (e: any) {
      setErro(e?.response?.data?.error ?? 'Erro ao registrar venda.')
      setProcessando(false)
    }
  }

  function resetState() {
    setPagamentos([]); setValorAtual(''); setParcelas(1); setErro('')
    setProcessando(false); setFormaAtual(null); setComDesconto(false)
    setEntrada(0); setCrediarioParcelas(1); setPrimeiraParcela(defaultPrimeiraParcela())
    setFormaEntradaId(null)
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key !== 'Enter') return
    e.preventDefault(); registrarEtapa()
  }

  function autoFill() {
    setValorAtual(restante.toFixed(2))
    setTimeout(() => valorRef.current?.select(), 30)
  }

  // ── Derived button state ─────────────────────────────────────────────────
  const btnDisabled = processando || (isCrediario
    ? !crediarioOk
    : !formaAtual || valAtual <= 0 || !valorAtual)

  // ── Shared style tokens ──────────────────────────────────────────────────
  const labelStyle: React.CSSProperties = { fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.35)', margin: 0 }
  const inputStyle: React.CSSProperties = { width: '100%', background: 'rgba(2,8,16,0.8)', border: '0.5px solid rgba(255,255,255,0.12)', borderRadius: '12px', padding: '0 14px', color: 'rgba(255,255,255,0.88)', outline: 'none', boxSizing: 'border-box' }
  const dividerStyle: React.CSSProperties = { height: '0.5px', background: 'rgba(255,255,255,0.09)', flexShrink: 0 }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(2,8,16,0.92)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
      <div style={{ background: 'rgba(8,18,30,0.97)', border: '0.5px solid rgba(255,255,255,0.09)', borderRadius: '20px', width: '100%', maxWidth: '720px', maxHeight: '95vh', display: 'flex', flexDirection: 'column', boxShadow: '0 28px 80px rgba(0,0,0,0.75)', backdropFilter: 'blur(24px)' }}>

        {/* ── HEADER ─────────────────────────────────────────────────────── */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '20px', padding: '20px 24px', borderBottom: '0.5px solid rgba(255,255,255,0.09)', flexShrink: 0 }}>

          {/* Left: title + attribution chips */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
              <h3 style={{ fontWeight: 700, fontSize: '16px', color: 'rgba(255,255,255,0.9)', margin: 0 }}>Finalizar compra</h3>
              <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)', background: 'rgba(255,255,255,0.05)', border: '0.5px solid rgba(255,255,255,0.09)', borderRadius: '10px', padding: '2px 8px' }}>
                {itensComDesconto.reduce((s, i) => s + i.quantidade, 0)} item(ns)
              </span>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {clienteNome ? (
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', minHeight: '30px', padding: '3px 10px', background: 'rgba(255,255,255,0.06)', border: '0.5px solid rgba(255,255,255,0.12)', borderRadius: '20px', fontSize: '12px', color: 'rgba(255,255,255,0.75)' }}>
                  <User size={11} style={{ color: 'rgba(255,255,255,0.4)', flexShrink: 0 }} />
                  <button type="button" onClick={onAbrirDadosCliente} style={{ background: 'none', border: 'none', color: 'inherit', fontSize: 'inherit', cursor: 'pointer', padding: 0 }}>{clienteNome}</button>
                  <button type="button" onClick={onRemoverCliente} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.35)', display: 'flex', alignItems: 'center', padding: 0, marginLeft: '2px' }}><X size={10} /></button>
                </div>
              ) : (
                <button type="button" onClick={onAbrirCliente} style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', minHeight: '30px', padding: '3px 12px', background: 'none', border: '1px dashed rgba(0,239,255,0.35)', borderRadius: '20px', fontSize: '12px', color: 'rgba(0,239,255,0.65)', cursor: 'pointer' }}>
                  <User size={11} style={{ flexShrink: 0 }} />
                  <span>Adicionar cliente</span>
                </button>
              )}
              {vendedorNome ? (
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', minHeight: '30px', padding: '3px 10px', background: 'rgba(255,255,255,0.06)', border: '0.5px solid rgba(255,255,255,0.12)', borderRadius: '20px', fontSize: '12px', color: 'rgba(255,255,255,0.75)' }}>
                  <Briefcase size={11} style={{ color: 'rgba(255,255,255,0.4)', flexShrink: 0 }} />
                  <span>{vendedorNome}</span>
                  {vendedorRemovivel && (
                    <button type="button" onClick={onRemoverVendedor} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.35)', display: 'flex', alignItems: 'center', padding: 0, marginLeft: '2px' }}><X size={10} /></button>
                  )}
                </div>
              ) : (
                <button type="button" onClick={onAbrirVendedor} style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', minHeight: '30px', padding: '3px 12px', background: 'none', border: '1px dashed rgba(0,239,255,0.35)', borderRadius: '20px', fontSize: '12px', color: 'rgba(0,239,255,0.65)', cursor: 'pointer' }}>
                  <Briefcase size={11} style={{ flexShrink: 0 }} />
                  <span>Adicionar vendedor</span>
                </button>
              )}
            </div>
          </div>

          {/* Right: total card(s) */}
          <div style={{ width: '236px', flexShrink: 0 }}>
            {descontoCaixa === 0 ? (
              <div style={{ padding: '12px 14px', background: 'rgba(0,239,255,0.06)', border: '0.5px solid rgba(0,239,255,0.25)', borderRadius: '12px' }}>
                <p style={{ ...labelStyle, marginBottom: '4px' }}>Total</p>
                <p style={{ fontSize: '28px', fontWeight: 800, color: '#0ef', lineHeight: 1, margin: 0 }}>{fmt(baseTotal)}</p>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <button type="button" onClick={() => comDesconto && handleComDesconto(false)}
                  style={{ padding: '10px 12px', borderRadius: '10px', textAlign: 'left', cursor: comDesconto ? 'pointer' : 'default', background: !comDesconto ? 'rgba(0,239,255,0.08)' : 'rgba(255,255,255,0.03)', border: `1px solid ${!comDesconto ? 'rgba(0,239,255,0.5)' : 'rgba(255,255,255,0.08)'}` }}>
                  <p style={{ ...labelStyle, marginBottom: '3px', color: !comDesconto ? '#0ef' : 'rgba(255,255,255,0.3)' }}>Sem desconto</p>
                  <p style={{ fontSize: '20px', fontWeight: 700, lineHeight: 1, color: !comDesconto ? '#0ef' : 'rgba(255,255,255,0.4)', margin: 0 }}>{fmt(baseTotal)}</p>
                </button>
                <button type="button" onClick={() => !comDesconto && handleComDesconto(true)}
                  style={{ padding: '10px 12px', borderRadius: '10px', textAlign: 'left', cursor: !comDesconto ? 'pointer' : 'default', background: comDesconto ? 'rgba(100,220,160,0.08)' : 'rgba(255,255,255,0.03)', border: `1px solid ${comDesconto ? 'rgba(100,220,160,0.4)' : 'rgba(255,255,255,0.08)'}` }}>
                  <p style={{ ...labelStyle, marginBottom: '3px', color: comDesconto ? 'rgba(100,220,160,0.9)' : 'rgba(255,255,255,0.3)' }}>Com desconto</p>
                  <p style={{ fontSize: '20px', fontWeight: 700, lineHeight: 1, color: comDesconto ? 'rgba(100,220,160,0.9)' : 'rgba(255,255,255,0.4)', margin: 0 }}>{fmt(baseTotal - descontoCaixa)}</p>
                  <p style={{ fontSize: '10px', marginTop: '2px', color: comDesconto ? 'rgba(100,220,160,0.7)' : 'rgba(255,255,255,0.2)' }}>Desconto {fmt(descontoCaixa)}</p>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ── BODY ───────────────────────────────────────────────────────── */}
        <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1.15fr 1fr', minHeight: 0, overflow: 'hidden' }}>

          {/* Left column: inputs */}
          <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '16px', overflowY: 'auto' }}>
            {carregando ? (
              <div style={{ display: 'flex', justifyContent: 'center', paddingTop: '32px' }}>
                <div className="animate-spin" style={{ width: '24px', height: '24px', border: '2px solid #0ef', borderTopColor: 'transparent', borderRadius: '50%' }} />
              </div>
            ) : (
              <>
                {/* Form selector */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <p style={labelStyle}>Forma de pagamento</p>
                  <select
                    value={formaAtual?.id ?? ''}
                    onChange={e => {
                      const f = formasPermitidas.find(f => f.id === e.target.value)
                      if (f) handleFormaChange(f)
                    }}
                    style={{ ...inputStyle, minHeight: '44px', fontSize: '13px' }}
                  >
                    {formasPermitidas.map(f => (
                      <option key={f.id} value={f.id} disabled={!isCrediario && usadasIds.includes(f.id) && f.id !== formaAtual?.id}>
                        {f.nome}{!isCrediario && usadasIds.includes(f.id) ? ' (usado)' : ''}
                      </option>
                    ))}
                  </select>
                </div>

                {/* ── CREDIÁRIO PANEL ────────────────────────────────────── */}
                {isCrediario && crediarioCfg && (
                  <>
                    {/* Entrada */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <p style={labelStyle}>
                        Entrada{crediarioCfg.entrada_obrigatoria ? ` (mín. ${fmt(entradaMinima)})` : ' (opcional)'}
                      </p>
                      <input
                        type="number" min="0" step="0.01"
                        value={entrada || ''}
                        onChange={e => {
                          const v = Math.max(0, parseFloat(e.target.value) || 0)
                          setEntrada(Math.min(v, totalEfetivo - 0.01))
                        }}
                        placeholder={fmt(entradaMinima)}
                        style={{ ...inputStyle, minHeight: '48px', fontSize: '18px', fontWeight: 600, borderColor: crediarioCfg.entrada_obrigatoria && entrada < entradaMinima - 0.005 ? 'rgba(240,100,100,0.55)' : 'rgba(255,255,255,0.12)' }}
                      />
                    </div>

                    {/* Entry form chips (only when entrada > 0) */}
                    {entrada > 0.005 && formasEntrada.length > 0 && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <p style={labelStyle}>Forma da entrada</p>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                          {formasEntrada.map(f => {
                            const sel = (formaEntradaId ?? formasEntrada[0]?.id) === f.id
                            return (
                              <button key={f.id} type="button" onClick={() => setFormaEntradaId(f.id)}
                                style={{ padding: '5px 12px', borderRadius: '20px', fontSize: '12px', cursor: 'pointer', background: sel ? 'rgba(0,239,255,0.1)' : 'rgba(255,255,255,0.04)', border: `0.5px solid ${sel ? 'rgba(0,239,255,0.45)' : 'rgba(255,255,255,0.1)'}`, color: sel ? '#0ef' : 'rgba(255,255,255,0.5)' }}>
                                {f.nome}
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    )}

                    {/* Parcelas stepper */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <p style={labelStyle}>Parcelas</p>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                        <button type="button" onClick={() => setCrediarioParcelas(p => Math.max(1, p - 1))}
                          style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(255,255,255,0.05)', border: '0.5px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.6)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <Minus size={14} />
                        </button>
                        <span style={{ flex: 1, textAlign: 'center', fontSize: '24px', fontWeight: 700, color: '#0ef' }}>{N}×</span>
                        <button type="button" onClick={() => setCrediarioParcelas(p => Math.min(crediarioCfg.max_parcelas, p + 1))}
                          style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(255,255,255,0.05)', border: '0.5px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.6)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <Plus size={14} />
                        </button>
                      </div>
                    </div>

                    {/* First due date */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <p style={labelStyle}>Vencimento da 1ª parcela</p>
                      <input type="date" value={primeiraParcela} onChange={e => setPrimeiraParcela(e.target.value)}
                        style={{ ...inputStyle, minHeight: '44px', fontSize: '13px', colorScheme: 'dark' }}
                      />
                    </div>

                    {erro && <p style={{ color: 'rgba(240,100,100,0.85)', fontSize: '12px', textAlign: 'center', margin: 0 }}>{erro}</p>}
                  </>
                )}

                {/* ── COMMON FORM INPUTS ─────────────────────────────────── */}
                {!isCrediario && (
                  <>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <p style={labelStyle}>Valor</p>
                        {restante > 0 && (
                          <button onClick={autoFill} style={{ fontSize: '11px', color: '#0ef', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                            preencher restante ({fmt(restante)})
                          </button>
                        )}
                      </div>
                      <input
                        ref={valorRef}
                        type="number" min="0" step="0.01"
                        value={valorAtual}
                        onChange={e => { setValorAtual(e.target.value); setErro('') }}
                        onKeyDown={handleKeyDown}
                        placeholder="0,00"
                        style={{ ...inputStyle, minHeight: '56px', fontSize: '22px', fontWeight: 600, textAlign: 'center', borderColor: erro ? 'rgba(240,100,100,0.55)' : 'rgba(255,255,255,0.12)' }}
                      />
                      {formaAtual?.tipo === 'dinheiro' && troco > 0 && (
                        <p style={{ textAlign: 'center', color: 'rgba(100,220,160,0.9)', fontSize: '13px', fontWeight: 500, margin: 0 }}>Troco: {fmt(troco)}</p>
                      )}
                    </div>
                    {erro && <p style={{ color: 'rgba(240,100,100,0.85)', fontSize: '12px', textAlign: 'center', margin: 0 }}>{erro}</p>}
                  </>
                )}
              </>
            )}
          </div>

          {/* ── Right column: Resumo rail ─────────────────────────────────── */}
          <div style={{ borderLeft: '0.5px solid rgba(255,255,255,0.09)', background: 'rgba(8,18,30,0.45)', padding: '20px', display: 'flex', flexDirection: 'column', gap: '10px', overflowY: 'auto' }}>
            <p style={labelStyle}>Resumo</p>

            {isCrediario ? (
              /* Crediário resumo */
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.45)' }}>Crédito disponível</span>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: 'rgba(100,220,160,0.9)' }}>{fmt(creditoInfo.disponivel)}</span>
                </div>
                <div style={dividerStyle} />
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.45)' }}>Total</span>
                    <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.65)' }}>{fmt(totalEfetivo)}</span>
                  </div>
                  {entrada > 0.005 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.45)' }}>Entrada</span>
                      <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.65)' }}>{fmt(entrada)}</span>
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.45)' }}>Financiado</span>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: 'rgba(255,255,255,0.85)' }}>{fmt(financiado)}</span>
                  </div>
                  {crediarioCfg?.juros_habilitado && (
                    N > crediarioCfg.juros_sem_ate ? (
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.45)' }}>Juros ({crediarioCfg.juros_mes}%/mês)</span>
                        <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)' }}>{fmt(jurosParcelado - financiado)}</span>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.45)' }}>Juros</span>
                        <span style={{ fontSize: '11px', color: 'rgba(100,220,160,0.7)' }}>sem juros até {crediarioCfg.juros_sem_ate}×</span>
                      </div>
                    )
                  )}
                </div>
                <div style={dividerStyle} />
                <div>
                  <p style={{ ...labelStyle, marginBottom: '8px' }}>Parcelamento</p>
                  <p style={{ fontSize: '22px', fontWeight: 700, color: '#0ef', lineHeight: 1, margin: 0 }}>{N}× {fmt(valorPorParcela)}</p>
                  {N > 1 && <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)', marginTop: '4px', marginBottom: 0 }}>Total {fmt(jurosParcelado)}</p>}
                </div>
                <div style={{ marginTop: 'auto' }}>
                  <div style={{ padding: '8px 12px', borderRadius: '10px', background: creditoOk ? 'rgba(100,220,160,0.07)' : 'rgba(240,100,100,0.07)', border: `0.5px solid ${creditoOk ? 'rgba(100,220,160,0.3)' : 'rgba(240,100,100,0.3)'}` }}>
                    <p style={{ fontSize: '12px', fontWeight: 600, color: creditoOk ? 'rgba(100,220,160,0.9)' : 'rgba(240,100,100,0.75)', textAlign: 'center', margin: 0 }}>
                      {creditoOk ? '✓ Cabe no limite' : '✗ Crédito insuficiente'}
                    </p>
                  </div>
                </div>
              </>
            ) : (
              /* Common resumo */
              <>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.45)' }}>Subtotal</span>
                    <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.65)' }}>{fmt(itensComDesconto.reduce((s, i) => s + i.preco_unitario * i.quantidade, 0))}</span>
                  </div>
                  {totalDesconto > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.45)' }}>Desc. promoção</span>
                      <span style={{ fontSize: '12px', color: 'rgba(240,100,100,0.75)' }}>− {fmt(totalDesconto)}</span>
                    </div>
                  )}
                  {cashbackUsar > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.45)' }}>Cashback</span>
                      <span style={{ fontSize: '12px', color: 'rgba(100,220,160,0.7)' }}>− {fmt(cashbackUsar)}</span>
                    </div>
                  )}
                  {comDesconto && descontoCaixa > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.45)' }}>Desc. caixa</span>
                      <span style={{ fontSize: '12px', color: 'rgba(100,220,160,0.7)' }}>− {fmt(descontoCaixa)}</span>
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '6px', borderTop: '0.5px solid rgba(255,255,255,0.09)', marginTop: '2px' }}>
                    <span style={{ fontSize: '12px', fontWeight: 600, color: 'rgba(255,255,255,0.65)' }}>Total</span>
                    <span style={{ fontSize: '14px', fontWeight: 700, color: '#0ef' }}>{fmt(totalEfetivo)}</span>
                  </div>
                </div>

                {pagamentos.length > 0 && (
                  <>
                    <div style={dividerStyle} />
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
                      {pagamentos.map((p, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                            <span style={{ width: '15px', height: '15px', borderRadius: '50%', background: 'rgba(100,220,160,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '9px', color: 'rgba(100,220,160,0.9)', flexShrink: 0 }}>✓</span>
                            <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.65)' }}>{p.forma.nome}</span>
                          </div>
                          <span style={{ fontSize: '12px', fontWeight: 600, color: 'rgba(255,255,255,0.82)' }}>{fmt(p.valor)}</span>
                        </div>
                      ))}
                      <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '6px', borderTop: '0.5px solid rgba(255,255,255,0.09)', marginTop: '2px' }}>
                        <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.45)' }}>Restante</span>
                        <span style={{ fontSize: '14px', fontWeight: 700, color: '#0ef' }}>{fmt(restante)}</span>
                      </div>
                    </div>
                  </>
                )}

                {formaAtual?.tipo === 'dinheiro' && valAtual > 0 && (
                  <>
                    <div style={dividerStyle} />
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.45)' }}>Recebido</span>
                        <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.65)' }}>{fmt(valAtual)}</span>
                      </div>
                      {troco > 0 && (
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ fontSize: '12px', fontWeight: 600, color: 'rgba(100,220,160,0.9)' }}>Troco</span>
                          <span style={{ fontSize: '14px', fontWeight: 700, color: 'rgba(100,220,160,0.9)' }}>{fmt(troco)}</span>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        </div>

        {/* ── FOOTER ─────────────────────────────────────────────────────── */}
        <div style={{ padding: '16px 24px', borderTop: '0.5px solid rgba(255,255,255,0.09)', display: 'flex', gap: '12px', flexShrink: 0 }}>
          <button
            onClick={onClose}
            disabled={processando}
            style={{ flex: 1, minHeight: '48px', background: 'none', border: '0.5px solid rgba(255,255,255,0.12)', borderRadius: '14px', fontSize: '13px', color: 'rgba(255,255,255,0.45)', cursor: processando ? 'default' : 'pointer', opacity: processando ? 0.5 : 1 }}
          >
            Cancelar
          </button>
          <button
            onClick={isCrediario ? finalizarCrediario : registrarEtapa}
            disabled={btnDisabled}
            style={{ flex: 2, minHeight: '48px', background: '#0ef', border: 'none', borderRadius: '14px', fontSize: '14px', fontWeight: 700, color: 'rgba(2,8,16,0.95)', cursor: btnDisabled ? 'default' : 'pointer', opacity: btnDisabled ? 0.4 : 1, transition: 'opacity 0.15s' }}
          >
            {processando
              ? 'Registrando...'
              : isCrediario
                ? `Finalizar — ${fmt(totalEfetivo)}`
                : (restante <= 0.01 || valAtual >= restante)
                  ? `Finalizar — ${fmt(totalEfetivo)}`
                  : `Confirmar ${fmt(valAtual)} →`
            }
          </button>
        </div>

      </div>
    </div>
  )
}
