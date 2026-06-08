'use client'

import { useEffect, useRef, useState } from 'react'
import { User, Briefcase, X } from 'lucide-react'
import { financeiroApi, type FormaPagamento } from '@/lib/api/financeiro'
import { vendasApi } from '@/lib/api/vendas'
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
  pct:        number
  valor:      number
  promoAceita: boolean
  restringe:  boolean
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
  open:              boolean
  onClose:           () => void
  onSuccess:         (r: CheckoutResult) => void
  itensComDesconto:  ItemComDesconto[]
  baseTotal:         number
  totalDesconto:     number
  cashbackUsar:      number
  clienteId:         string | null
  // Atribuição
  clienteNome:         string | null
  vendedorNome:        string | null
  vendedorRemovivel:   boolean
  onAbrirCliente:      () => void
  onAbrirVendedor:     () => void
  onAbrirDadosCliente: () => void
  onRemoverCliente:    () => void
  onRemoverVendedor:   () => void
}

// ── Component ─────────────────────────────────────────────────────────────────

export function CheckoutModal({
  open, onClose, onSuccess,
  itensComDesconto, baseTotal, totalDesconto, cashbackUsar, clienteId,
  clienteNome, vendedorNome, vendedorRemovivel,
  onAbrirCliente, onAbrirVendedor, onAbrirDadosCliente, onRemoverCliente, onRemoverVendedor,
}: Props) {
  const valorRef = useRef<HTMLInputElement>(null)

  const [formas,      setFormas]      = useState<FormaPagamento[]>([])
  const [carregando,  setCarregando]  = useState(false)
  const [pagamentos,  setPagamentos]  = useState<PagamentoParcial[]>([])
  const [formaAtual,  setFormaAtual]  = useState<FormaPagamento | null>(null)
  const [valorAtual,  setValorAtual]  = useState('')
  const [parcelas,    setParcelas]    = useState(1)
  const [processando, setProcessando] = useState(false)
  const [erro,        setErro]        = useState('')
  const [descontoCfg, setDescontoCfg] = useState<DescontoCfg | null>(null)
  const [comDesconto, setComDesconto] = useState(false)

  // ── Load on open ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!open) return
    setPagamentos([]); setValorAtual(''); setParcelas(1); setErro(''); setComDesconto(false)
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
        pct:        Number(sysRes.data.desconto_max_percentual ?? 0),
        valor:      Number(sysRes.data.desconto_max_valor ?? 0),
        promoAceita: !!sysRes.data.promocao_aceita_desconto,
        restringe:  !!sysRes.data.desconto_restringe_formas,
      }
      setFormas(sorted)
      setDescontoCfg(cfg)
      setFormaAtual(sorted.find(f => f.ativo) ?? null)
      setCarregando(false)
      setTimeout(() => valorRef.current?.focus(), 100)
    }).catch(() => setCarregando(false))
  }, [open])

  if (!open) return null

  // ── Discount computation (same rule as cashier sidebar) ──────────────────────
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

  // ── Allowed payment forms ─────────────────────────────────────────────────
  const formasPermitidas = formas.filter(f => {
    if (!f.ativo) return false
    if (comDesconto && descontoCfg?.restringe && f.aceita_desconto === false) return false
    return true
  })

  // ── Payment step calculations ─────────────────────────────────────────────
  const fmt         = (v: number) => `R$ ${v.toFixed(2)}`
  const totalJaPago = pagamentos.reduce((s, p) => s + p.valor, 0)
  const restante    = Math.max(0, totalEfetivo - totalJaPago)
  const valAtual    = parseFloat(valorAtual) || 0
  const troco       = valAtual > restante ? valAtual - restante : 0
  const usadasIds   = pagamentos.map(p => p.forma.id)

  // ── Switch discount mode (wipes all entered payments) ────────────────────
  function handleComDesconto(novoValor: boolean) {
    setComDesconto(novoValor)
    setPagamentos([]); setValorAtual(''); setParcelas(1); setErro('')
    const novasPermitidas = formas.filter(f => {
      if (!f.ativo) return false
      if (novoValor && descontoCfg?.restringe && f.aceita_desconto === false) return false
      return true
    })
    setFormaAtual(novasPermitidas[0] ?? null)
    setTimeout(() => valorRef.current?.focus(), 50)
  }

  // ── Build API-ready payments (cap to totalEfetivo + compute troco) ────────
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

  // ── Validation ────────────────────────────────────────────────────────────
  function validarEntrada(): string | null {
    if (!formaAtual || valAtual <= 0) return null
    if (formaAtual.tipo !== 'dinheiro' && valAtual > restante + 0.01)
      return 'Valor inválido: pagamento excede o saldo restante.'
    return null
  }

  // ── Register one payment step ─────────────────────────────────────────────
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

  // ── Finalize ──────────────────────────────────────────────────────────────
  async function finalizarVenda(lista: PagamentoParcial[]) {
    setProcessando(true); setErro('')
    const D = comDesconto ? descontoCaixa : 0
    try {
      const pagamentosParaAPI = construirPagamentosParaAPI(lista)
      const { vendedor_id, vendedor_nome } = usePDVStore.getState()
      const r = await vendasApi.registrar({
        cliente_id:         clienteId ?? null,
        itens:              itensComDesconto.map(i => ({
          versao_id:      i.versao_id,
          quantidade:     i.quantidade,
          preco_unitario: i.preco_unitario,
          desconto_item:  i.desconto_item,
        })),
        pagamentos:         pagamentosParaAPI,
        cashback_usado:     cashbackUsar,
        desconto_promocao:  totalDesconto,
        desconto_pagamento: D,
        vendedor_id:        vendedor_id ?? null,
        vendedor_nome:      vendedor_nome ?? null,
      })
      const pagamentosRecap = pagamentosParaAPI.map(p => {
        const original = lista.find(l => l.forma.id === p.forma_pagamento_id)
        return {
          nome:  original?.forma.nome ?? '',
          valor: p.valor,
          troco: p.troco ?? 0,
        }
      })
      resetState()
      onSuccess({
        ...r,
        pagamentos:         pagamentosRecap,
        desconto_promocao:  totalDesconto,
        desconto_pagamento: D,
        cashback_usado:     cashbackUsar,
      })
    } catch (e: any) {
      setErro(e?.response?.data?.error ?? 'Erro ao registrar venda.')
      setProcessando(false)
    }
  }

  function resetState() {
    setPagamentos([]); setValorAtual(''); setParcelas(1)
    setErro(''); setProcessando(false); setFormaAtual(null); setComDesconto(false)
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key !== 'Enter') return
    e.preventDefault(); registrarEtapa()
  }

  function autoFill() {
    setValorAtual(restante.toFixed(2))
    setTimeout(() => valorRef.current?.select(), 30)
  }

  return (
    <div className="fixed inset-0 bg-midnight/90 z-50 flex items-center justify-center p-4">
      <div className="bg-deep-ocean border border-ocean-depth rounded-2xl w-full max-w-md flex flex-col shadow-2xl">

        {/* ── Header ────────────────────────────────────────────────────────── */}
        <div className="px-6 py-5 border-b border-ocean-depth">

          {/* Title */}
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="text-sea-foam font-bold text-lg">Finalizar Compra</h3>
              <p className="text-steel text-xs mt-0.5">
                {itensComDesconto.reduce((s, i) => s + i.quantidade, 0)} item(ns)
              </p>
            </div>
          </div>

          {/* ── Atribuição ── */}
          <p style={{ fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.35)', marginBottom: '8px' }}>Atribuição</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {/* Cliente chip */}
            {clienteNome ? (
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', minHeight: '32px', padding: '4px 10px', background: 'rgba(255,255,255,0.06)', border: '0.5px solid rgba(255,255,255,0.12)', borderRadius: '20px', fontSize: '12px', color: 'rgba(255,255,255,0.75)' }}>
                <User size={12} style={{ color: 'rgba(255,255,255,0.4)', flexShrink: 0 }} />
                <button type="button" onClick={onAbrirDadosCliente} style={{ background: 'none', border: 'none', color: 'inherit', fontSize: 'inherit', cursor: 'pointer', padding: 0 }}>{clienteNome}</button>
                <button type="button" onClick={onRemoverCliente} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.35)', display: 'flex', alignItems: 'center', padding: 0, marginLeft: '2px' }}><X size={11} /></button>
              </div>
            ) : (
              <button type="button" onClick={onAbrirCliente} style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', minHeight: '32px', padding: '4px 12px', background: 'none', border: '1px dashed rgba(0,239,255,0.35)', borderRadius: '20px', fontSize: '12px', color: 'rgba(0,239,255,0.65)', cursor: 'pointer' }}>
                <User size={12} style={{ flexShrink: 0 }} />
                <span>Adicionar cliente</span>
              </button>
            )}
            {/* Vendedor chip */}
            {vendedorNome ? (
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', minHeight: '32px', padding: '4px 10px', background: 'rgba(255,255,255,0.06)', border: '0.5px solid rgba(255,255,255,0.12)', borderRadius: '20px', fontSize: '12px', color: 'rgba(255,255,255,0.75)' }}>
                <Briefcase size={12} style={{ color: 'rgba(255,255,255,0.4)', flexShrink: 0 }} />
                <span>{vendedorNome}</span>
                {vendedorRemovivel && (
                  <button type="button" onClick={onRemoverVendedor} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.35)', display: 'flex', alignItems: 'center', padding: 0, marginLeft: '2px' }}><X size={11} /></button>
                )}
              </div>
            ) : (
              <button type="button" onClick={onAbrirVendedor} style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', minHeight: '32px', padding: '4px 12px', background: 'none', border: '1px dashed rgba(0,239,255,0.35)', borderRadius: '20px', fontSize: '12px', color: 'rgba(0,239,255,0.65)', cursor: 'pointer' }}>
                <Briefcase size={12} style={{ flexShrink: 0 }} />
                <span>Adicionar vendedor</span>
              </button>
            )}
          </div>

          <div style={{ height: '0.5px', background: 'rgba(255,255,255,0.1)', margin: '12px 0' }} />

          {/* ── Total da venda ── */}
          <p style={{ fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.35)', marginBottom: '8px' }}>Total da venda</p>
          {/* Single total when no discount available */}
          {descontoCaixa === 0 && (
            <div>
              <p className="text-electric-cyan font-black text-3xl">{fmt(baseTotal)}</p>
              {(totalDesconto > 0 || cashbackUsar > 0) && (
                <p className="text-steel text-xs">
                  subtotal {fmt(itensComDesconto.reduce((s, i) => s + i.preco_unitario * i.quantidade, 0))}
                </p>
              )}
            </div>
          )}

          {/* Selector cards — only when a discount is applicable */}
          {descontoCaixa > 0 && (
            <div className="grid grid-cols-2 gap-2">
              {/* Sem desconto */}
              <button
                type="button"
                onClick={() => comDesconto && handleComDesconto(false)}
                style={{
                  padding: '10px 12px', borderRadius: '10px', textAlign: 'left',
                  cursor: comDesconto ? 'pointer' : 'default',
                  background: !comDesconto ? 'rgba(0,239,255,0.08)' : 'rgba(255,255,255,0.03)',
                  border: `1px solid ${!comDesconto ? 'rgba(0,239,255,0.5)' : 'rgba(255,255,255,0.08)'}`,
                }}
              >
                <p style={{ fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '3px',
                  color: !comDesconto ? '#0ef' : 'rgba(255,255,255,0.3)' }}>Sem desconto</p>
                <p style={{ fontSize: '22px', fontWeight: 700, lineHeight: 1,
                  color: !comDesconto ? '#0ef' : 'rgba(255,255,255,0.4)' }}>{fmt(baseTotal)}</p>
              </button>

              {/* Com desconto */}
              <button
                type="button"
                onClick={() => !comDesconto && handleComDesconto(true)}
                style={{
                  padding: '10px 12px', borderRadius: '10px', textAlign: 'left',
                  cursor: !comDesconto ? 'pointer' : 'default',
                  background: comDesconto ? 'rgba(100,220,160,0.08)' : 'rgba(255,255,255,0.03)',
                  border: `1px solid ${comDesconto ? 'rgba(100,220,160,0.4)' : 'rgba(255,255,255,0.08)'}`,
                }}
              >
                <p style={{ fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '3px',
                  color: comDesconto ? 'rgba(100,220,160,0.9)' : 'rgba(255,255,255,0.3)' }}>Com desconto</p>
                <p style={{ fontSize: '22px', fontWeight: 700, lineHeight: 1,
                  color: comDesconto ? 'rgba(100,220,160,0.9)' : 'rgba(255,255,255,0.4)' }}>{fmt(baseTotal - descontoCaixa)}</p>
                <p style={{ fontSize: '10px', marginTop: '2px',
                  color: comDesconto ? 'rgba(100,220,160,0.7)' : 'rgba(255,255,255,0.2)' }}>Desconto {fmt(descontoCaixa)}</p>
              </button>
            </div>
          )}
        </div>

        {/* ── Body ─────────────────────────────────────────────────────────── */}
        <div className="p-6 flex flex-col gap-4">
          <p style={{ fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.35)' }}>Forma de pagamento</p>

          {/* Partial payments already registered */}
          {pagamentos.length > 0 && (
            <div className="flex flex-col gap-1.5">
              {pagamentos.map((p, i) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span className="w-4 h-4 rounded-full bg-mint-green/20 flex items-center justify-center">
                      <span className="text-mint-green text-[10px]">✓</span>
                    </span>
                    <span className="text-sea-foam">{p.forma.nome}</span>
                  </div>
                  <span className="text-sea-foam font-semibold">{fmt(p.valor)}</span>
                </div>
              ))}
              <div className="flex justify-between text-sm border-t border-ocean-depth pt-1.5 mt-0.5">
                <span className="text-steel">Restante</span>
                <span className="text-electric-cyan font-bold">{fmt(restante)}</span>
              </div>
            </div>
          )}

          {carregando ? (
            <div className="flex justify-center py-4">
              <div className="w-6 h-6 border-2 border-electric-cyan border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <>
              {/* Payment method selector */}
              <div className="flex flex-col gap-1.5">
                <select
                  value={formaAtual?.id ?? ''}
                  onChange={e => {
                    const f = formasPermitidas.find(f => f.id === e.target.value)
                    if (f) { setFormaAtual(f); setErro('') }
                  }}
                  className="min-h-[48px] bg-midnight border border-ocean-depth rounded-xl px-4 text-sm text-sea-foam outline-none focus:border-electric-cyan"
                >
                  {formasPermitidas.map(f => (
                    <option key={f.id} value={f.id} disabled={usadasIds.includes(f.id) && f.id !== formaAtual?.id}>
                      {f.nome}{usadasIds.includes(f.id) ? ' (usado)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Installments (crediário) */}
              {formaAtual?.tipo === 'crediario' && valAtual > 0 && (
                <div className="flex flex-col gap-1.5">
                  <label className="text-steel text-xs">Parcelas</label>
                  <select value={parcelas} onChange={e => setParcelas(parseInt(e.target.value))}
                    className="min-h-[44px] bg-midnight border border-ocean-depth rounded-xl px-4 text-xs text-sea-foam outline-none">
                    {[1,2,3,4,5,6,8,10,12].map(n => (
                      <option key={n} value={n}>{n}× {fmt(valAtual / n)}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Amount input */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-steel text-xs">Valor</label>
                  {restante > 0 && (
                    <button onClick={autoFill} className="text-xs text-electric-cyan hover:underline">
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
                  className={`min-h-[56px] bg-midnight border rounded-xl px-4 text-sea-foam text-xl font-semibold text-center outline-none transition-colors ${
                    erro ? 'border-red-400 focus:border-red-400' : 'border-ocean-depth focus:border-electric-cyan'
                  }`}
                />
                {formaAtual?.tipo === 'dinheiro' && troco > 0 && (
                  <p className="text-mint-green text-sm text-center font-medium">Troco: {fmt(troco)}</p>
                )}
              </div>

              {erro && <p className="text-red-400 text-sm text-center">{erro}</p>}

              {/* Buttons */}
              <div className="flex gap-3 pt-1">
                <button
                  onClick={onClose}
                  disabled={processando}
                  className="flex-1 min-h-[52px] border border-ocean-depth text-steel rounded-2xl text-sm"
                >
                  Cancelar
                </button>
                <button
                  onClick={registrarEtapa}
                  disabled={processando || !formaAtual || valAtual <= 0 || !valorAtual}
                  className="flex-2 flex-1 min-h-[52px] bg-electric-cyan text-midnight rounded-2xl text-sm font-bold disabled:opacity-40"
                >
                  {processando
                    ? 'Registrando...'
                    : restante <= 0.01 || valAtual >= restante
                      ? `Finalizar — ${fmt(totalEfetivo)}`
                      : `Confirmar ${fmt(valAtual)} →`
                  }
                </button>
              </div>

              <p className="text-center text-steel text-[11px]">
                Enter para confirmar · Parcial registra e pede próximo método
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
