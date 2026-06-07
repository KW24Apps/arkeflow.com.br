'use client'

import { useEffect, useRef, useState } from 'react'
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

interface SistemaConfig {
  desconto_max_percentual:  number
  desconto_max_valor:       number
  promocao_aceita_desconto: boolean
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
}

// ── Component ─────────────────────────────────────────────────────────────────

export function CheckoutModal({
  open, onClose, onSuccess,
  itensComDesconto, baseTotal, totalDesconto, cashbackUsar, clienteId,
}: Props) {
  const valorRef = useRef<HTMLInputElement>(null)

  const [formas,       setFormas]       = useState<FormaPagamento[]>([])
  const [carregando,   setCarregando]   = useState(false)
  const [pagamentos,   setPagamentos]   = useState<PagamentoParcial[]>([])
  const [formaAtual,   setFormaAtual]   = useState<FormaPagamento | null>(null)
  const [valorAtual,   setValorAtual]   = useState('')
  const [parcelas,     setParcelas]     = useState(1)
  const [processando,  setProcessando]  = useState(false)
  const [erro,         setErro]         = useState('')

  // Review step
  const [step,              setStep]              = useState<'payment' | 'review'>('payment')
  const [listaCompleta,     setListaCompleta]     = useState<PagamentoParcial[]>([])
  const [descontoAtivado,   setDescontoAtivado]   = useState(false)
  const [descontoAplicavel, setDescontoAplicavel] = useState(0)
  const [sistemaConfig,     setSistemaConfig]     = useState<SistemaConfig | null>(null)

  // ── Load on open ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!open) return
    setPagamentos([]); setValorAtual(''); setParcelas(1); setErro('')
    setStep('payment'); setListaCompleta([]); setDescontoAtivado(false); setDescontoAplicavel(0)
    setCarregando(true)

    Promise.all([
      financeiroApi.formasPagamento(),
      api.get<SistemaConfig>('/dados-loja/sistema'),
    ]).then(([fs, sysRes]) => {
      const TIPOS = ['dinheiro', 'pix', 'debito', 'credito', 'crediario']
      const sorted = [...fs].sort((a, b) => {
        const ia = TIPOS.indexOf(a.tipo); const ib = TIPOS.indexOf(b.tipo)
        if (ia !== ib) return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib)
        return a.nome.localeCompare(b.nome)
      })
      setFormas(sorted)
      setFormaAtual(sorted.find(f => f.ativo) ?? null)
      setSistemaConfig(sysRes.data)
      setCarregando(false)
      setTimeout(() => valorRef.current?.focus(), 100)
    }).catch(() => setCarregando(false))
  }, [open])

  if (!open) return null

  // ── Payment step calculations ─────────────────────────────────────────────
  const totalJaPago = pagamentos.reduce((s, p) => s + p.valor, 0)
  const restante    = Math.max(0, baseTotal - totalJaPago)
  const valAtual    = parseFloat(valorAtual) || 0
  const troco       = valAtual > restante ? valAtual - restante : 0

  // ── Discount calculator ───────────────────────────────────────────────────
  function calcularDescontoAplicavel(lista: PagamentoParcial[]): number {
    if (!sistemaConfig) return 0
    const { desconto_max_percentual, desconto_max_valor, promocao_aceita_desconto } = sistemaConfig
    if (desconto_max_percentual === 0 && desconto_max_valor === 0) return 0

    const base_produtos = itensComDesconto.reduce((s, i) => {
      if (i.desconto_item > 0 && !promocao_aceita_desconto) return s
      return s + i.preco_unitario * i.quantidade - i.desconto_item
    }, 0)

    const formas_elegiveis = lista.reduce((s, p) =>
      p.forma.aceita_desconto !== false ? s + p.valor : s, 0)

    const base_elegivel = Math.min(base_produtos, formas_elegiveis)
    if (base_elegivel <= 0) return 0

    const descPct = desconto_max_percentual > 0 ? base_elegivel * (desconto_max_percentual / 100) : Infinity
    const descVal = desconto_max_valor > 0 ? desconto_max_valor : Infinity
    if (descPct === Infinity && descVal === Infinity) return 0

    return Math.round(Math.min(descPct, descVal, base_elegivel) * 100) / 100
  }

  // ── Rebalancing ───────────────────────────────────────────────────────────
  function rebalancearPagamentos(lista: PagamentoParcial[], D: number) {
    const totalAlvo = Math.round((baseTotal - D) * 100) / 100
    const abated    = lista.map(p => p.valor)

    const cashIdxs = lista.map((p, i) => p.forma.tipo === 'dinheiro' ? i : -1).filter(i => i >= 0)
    const eligIdxs = lista.map((p, i) =>
      p.forma.tipo !== 'dinheiro' && p.forma.aceita_desconto !== false ? i : -1
    ).filter(i => i >= 0)

    let rem = D

    if (cashIdxs.length > 0) {
      // Reduce cash first
      for (const idx of cashIdxs) {
        const cut = Math.min(abated[idx], rem)
        abated[idx] -= cut; rem -= cut
        if (rem <= 0.001) break
      }
      // Remaining discount spreads proportionally to other eligible forms
      if (rem > 0.001 && eligIdxs.length > 0) {
        const tot = eligIdxs.reduce((s, i) => s + lista[i].valor, 0)
        if (tot > 0) eligIdxs.forEach(i => { abated[i] -= (lista[i].valor / tot) * rem })
      }
    } else {
      // No cash — proportional across eligible non-cash
      const tot = eligIdxs.reduce((s, i) => s + lista[i].valor, 0)
      if (tot > 0) eligIdxs.forEach(i => { abated[i] -= (lista[i].valor / tot) * D })
    }

    // Round and fix any cent discrepancy on last eligible form
    const rounded    = abated.map(v => Math.round(v * 100) / 100)
    const currentSum = rounded.reduce((s, v) => s + v, 0)
    const diff       = Math.round((totalAlvo - currentSum) * 100) / 100
    if (Math.abs(diff) >= 0.005) {
      const corrIdx = cashIdxs.length > 0
        ? cashIdxs[cashIdxs.length - 1]
        : eligIdxs.length > 0 ? eligIdxs[eligIdxs.length - 1] : -1
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

  // ── Validation ───────────────────────────────────────────────────────────
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
    const novoRestante = Math.max(0, baseTotal - novaLista.reduce((s, p) => s + p.valor, 0))

    if (novoRestante <= 0.01) {
      const desconto = calcularDescontoAplicavel(novaLista)
      if (desconto > 0) {
        setListaCompleta(novaLista)
        setDescontoAplicavel(desconto)
        setDescontoAtivado(false)
        setStep('review')
      } else {
        finalizarVenda(novaLista, 0)
      }
    } else {
      setPagamentos(novaLista)
      setValorAtual(''); setParcelas(1)
      const usadas = novaLista.map(p => p.forma.id)
      const prox = formas.find(f => f.ativo && !usadas.includes(f.id))
      if (prox) setFormaAtual(prox)
      setTimeout(() => valorRef.current?.focus(), 50)
    }
  }

  // ── Finalize ──────────────────────────────────────────────────────────────
  async function finalizarVenda(lista: PagamentoParcial[], D: number) {
    setProcessando(true); setErro('')
    try {
      const pagamentosParaAPI = rebalancearPagamentos(lista, D)
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
    setErro(''); setProcessando(false); setFormaAtual(null)
    setStep('payment'); setListaCompleta([]); setDescontoAtivado(false); setDescontoAplicavel(0)
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key !== 'Enter') return
    e.preventDefault(); registrarEtapa()
  }

  function autoFill() {
    setValorAtual(restante.toFixed(2))
    setTimeout(() => valorRef.current?.select(), 30)
  }

  const fmt = (v: number) => `R$ ${v.toFixed(2)}`
  const usadasIds = pagamentos.map(p => p.forma.id)

  // ── Review step derived values ────────────────────────────────────────────
  const D          = descontoAtivado ? descontoAplicavel : 0
  const totalFinal = Math.round((baseTotal - D) * 100) / 100
  const reviewPags = step === 'review' ? rebalancearPagamentos(listaCompleta, D) : []

  return (
    <div className="fixed inset-0 bg-midnight/90 z-50 flex items-center justify-center p-4">
      <div className="bg-deep-ocean border border-ocean-depth rounded-2xl w-full max-w-md flex flex-col shadow-2xl">

        {/* Header */}
        <div className="px-6 py-5 border-b border-ocean-depth flex items-start justify-between">
          <div>
            <h3 className="text-sea-foam font-bold text-lg">
              {step === 'review' ? 'Revisar Pagamento' : 'Finalizar Compra'}
            </h3>
            <p className="text-steel text-xs mt-0.5">
              {itensComDesconto.reduce((s, i) => s + i.quantidade, 0)} item(ns)
            </p>
          </div>
          <div className="text-right">
            <p className="text-electric-cyan font-black text-3xl">
              {step === 'review' && descontoAtivado ? fmt(totalFinal) : fmt(baseTotal)}
            </p>
            {(totalDesconto > 0 || cashbackUsar > 0 || (step === 'review' && descontoAtivado)) && (
              <p className="text-steel text-xs">
                {step === 'review' && descontoAtivado
                  ? `sem desconto ${fmt(baseTotal)}`
                  : `subtotal ${fmt(itensComDesconto.reduce((s, i) => s + i.preco_unitario * i.quantidade, 0))}`}
              </p>
            )}
          </div>
        </div>

        <div className="p-6 flex flex-col gap-4">

          {step === 'review' ? (
            /* ── REVIEW STEP ─────────────────────────────────────────────── */
            <>
              {/* Payment list */}
              <div className="flex flex-col gap-2">
                {listaCompleta.map((p, i) => {
                  const rp          = reviewPags.find(pp => pp.forma_pagamento_id === p.forma.id)
                  const displayValor = rp?.valor ?? 0
                  const displayTroco = rp?.troco
                  const reduzido     = descontoAtivado && rp != null && rp.valor < p.valor
                  return (
                    <div key={i} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <span className="w-4 h-4 rounded-full bg-mint-green/20 flex items-center justify-center">
                          <span className="text-mint-green text-[10px]">✓</span>
                        </span>
                        <div>
                          <span className="text-sea-foam">{p.forma.nome}</span>
                          {displayTroco != null && displayTroco > 0 && (
                            <p className="text-mint-green text-[11px]">troco {fmt(displayTroco)}</p>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`font-semibold ${reduzido ? 'text-mint-green' : 'text-sea-foam'}`}>
                          {fmt(displayValor)}
                        </p>
                        {reduzido && (
                          <p className="text-steel text-[11px] line-through">{fmt(p.valor)}</p>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Divider */}
              <div style={{ height: '0.5px', background: 'rgba(255,255,255,0.07)' }} />

              {/* Discount toggle */}
              <div className="flex items-center justify-between">
                <div>
                  <p style={{ fontSize: '13px', fontWeight: 500, color: 'rgba(255,255,255,0.75)' }}>
                    Desconto aplicável
                  </p>
                  <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', marginTop: '2px' }}>
                    {fmt(descontoAplicavel)} disponível
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setDescontoAtivado(v => !v)}
                  className="relative transition-colors shrink-0"
                  style={{ width: '40px', height: '22px', borderRadius: '9999px', border: 'none',
                    background: descontoAtivado ? 'rgba(0,212,212,0.7)' : 'rgba(255,255,255,0.1)' }}
                >
                  <span className="absolute top-[3px] w-[16px] h-[16px] bg-white rounded-full transition-all"
                    style={{ left: descontoAtivado ? '21px' : '3px' }} />
                </button>
              </div>

              {descontoAtivado && (
                <div className="flex justify-between text-sm"
                  style={{ background: 'rgba(100,220,160,0.08)', border: '0.5px solid rgba(100,220,160,0.2)',
                    borderRadius: '8px', padding: '8px 12px' }}>
                  <span style={{ color: 'rgba(100,220,160,0.9)' }}>Total com desconto</span>
                  <span style={{ color: 'rgba(100,220,160,0.9)', fontWeight: 700 }}>{fmt(totalFinal)}</span>
                </div>
              )}

              {erro && <p className="text-red-400 text-sm text-center">{erro}</p>}

              {/* Review footer */}
              <div className="flex gap-3 pt-1">
                <button
                  onClick={() => {
                    const last = listaCompleta[listaCompleta.length - 1]
                    setStep('payment')
                    setPagamentos(listaCompleta.slice(0, -1))
                    setValorAtual(last?.valor.toFixed(2) ?? '')
                    setFormaAtual(last?.forma ?? null)
                    setErro('')
                  }}
                  disabled={processando}
                  className="flex-1 min-h-[52px] border border-ocean-depth text-steel rounded-2xl text-sm"
                >
                  Voltar
                </button>
                <button
                  onClick={() => finalizarVenda(listaCompleta, D)}
                  disabled={processando}
                  className="flex-1 min-h-[52px] bg-electric-cyan text-midnight rounded-2xl text-sm font-bold disabled:opacity-40"
                >
                  {processando ? 'Registrando...' : `Finalizar — ${fmt(totalFinal)}`}
                </button>
              </div>
            </>
          ) : (
            /* ── PAYMENT STEP ────────────────────────────────────────────── */
            <>
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
                    <label className="text-steel text-xs">Forma de pagamento</label>
                    <select
                      value={formaAtual?.id ?? ''}
                      onChange={e => {
                        const f = formas.find(f => f.id === e.target.value)
                        if (f) { setFormaAtual(f); setErro('') }
                      }}
                      className="min-h-[48px] bg-midnight border border-ocean-depth rounded-xl px-4 text-sm text-sea-foam outline-none focus:border-electric-cyan"
                    >
                      {formas.filter(f => f.ativo).map(f => (
                        <option key={f.id} value={f.id} disabled={usadasIds.includes(f.id) && f.id !== formaAtual?.id}>
                          {f.nome}{usadasIds.includes(f.id) ? ' (usado)' : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Installments (crediário) */}
                  {formaAtual?.tipo === 'crediario' && valAtual && (
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
                          ? `Revisar — ${fmt(baseTotal)}`
                          : `Confirmar ${fmt(valAtual)} →`
                      }
                    </button>
                  </div>

                  <p className="text-center text-steel text-[11px]">
                    Enter para confirmar · Parcial registra e pede próximo método
                  </p>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
