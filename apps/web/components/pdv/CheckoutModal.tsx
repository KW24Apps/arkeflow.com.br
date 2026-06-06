'use client'

import { useEffect, useRef, useState } from 'react'
import { financeiroApi, type FormaPagamento } from '@/lib/api/financeiro'
import { vendasApi } from '@/lib/api/vendas'
import { usePDVStore } from '@/store/pdv.store'
import type { ItemComDesconto } from '@/lib/calcularDesconto'

// ── Types ─────────────────────────────────────────────────────────────────────

interface PagamentoParcial {
  forma:       FormaPagamento
  valor:       number  // amount the customer pays with this method
  parcelas:    number
  desconto:    number  // discount value applied (R$)
}

export interface CheckoutResult {
  venda_id:        string
  total:           number
  cashback_gerado: number
}

interface Props {
  open:              boolean
  onClose:           () => void
  onSuccess:         (r: CheckoutResult) => void
  // Cart data
  itensComDesconto:  ItemComDesconto[]
  baseTotal:         number   // após promoções + cashback
  totalDesconto:     number   // desconto de promoções
  cashbackUsar:      number
  clienteId:         string | null
}

// ── Component ─────────────────────────────────────────────────────────────────

export function CheckoutModal({ open, onClose, onSuccess, itensComDesconto, baseTotal, totalDesconto, cashbackUsar, clienteId }: Props) {
  const valorRef = useRef<HTMLInputElement>(null)

  const [formas,       setFormas]       = useState<FormaPagamento[]>([])
  const [carregando,   setCarregando]   = useState(false)

  // Pagamentos já registrados nesta venda
  const [pagamentos,   setPagamentos]   = useState<PagamentoParcial[]>([])

  // Forma e valor do pagamento atual
  const [formaAtual,   setFormaAtual]   = useState<FormaPagamento | null>(null)
  const [valorAtual,   setValorAtual]   = useState('')
  const [descontoPct,  setDescontoPct]  = useState(0)
  const [parcelas,     setParcelas]     = useState(1)

  const [processando,  setProcessando]  = useState(false)
  const [erro,         setErro]         = useState('')

  // ── Load formas on open ───────────────────────────────────────────────────
  useEffect(() => {
    if (!open) return
    setPagamentos([]); setValorAtual(''); setDescontoPct(0); setParcelas(1)
    setErro('')
    setCarregando(true)
    financeiroApi.formasPagamento().then(fs => {
      const TIPOS = ['dinheiro', 'pix', 'debito', 'credito', 'crediario']
      const sorted = [...fs].sort((a, b) => {
        const ia = TIPOS.indexOf(a.tipo)
        const ib = TIPOS.indexOf(b.tipo)
        if (ia !== ib) return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib)
        return a.nome.localeCompare(b.nome)
      })
      setFormas(sorted)
      const first = sorted.find(f => f.ativo)
      setFormaAtual(first ?? null)
      setCarregando(false)
      setTimeout(() => valorRef.current?.focus(), 100)
    }).catch(() => setCarregando(false))
  }, [open])

  if (!open) return null

  // ── Calculations ──────────────────────────────────────────────────────────
  const totalDescontoPag = pagamentos.reduce((s, p) => s + p.desconto, 0)
  const totalJaPago      = pagamentos.reduce((s, p) => s + p.valor, 0)
  const totalFinal       = Math.max(0, baseTotal - totalDescontoPag)
  const restante         = Math.max(0, totalFinal - totalJaPago)

  // Discount for current payment (real-time)
  const maxPct   = formaAtual ? parseFloat(formaAtual.desconto_percentual) || 0 : 0
  const capR$    = formaAtual ? parseFloat(formaAtual.desconto_maximo) || 0 : 0
  const valAtual = parseFloat(valorAtual) || 0
  const descontoAtual = maxPct > 0 && descontoPct > 0
    ? Math.min(valAtual * (descontoPct / 100), capR$ > 0 ? capR$ : Infinity)
    : 0

  // Total after adding current payment's discount
  const totalComDescontoAtual = Math.max(0, totalFinal - descontoAtual)
  const restanteComDescontoAtual = Math.max(0, totalComDescontoAtual - totalJaPago)

  const troco = valAtual > restanteComDescontoAtual
    ? valAtual - restanteComDescontoAtual
    : 0

  // ── Validation ───────────────────────────────────────────────────────────
  function validarEntrada(): string | null {
    if (!formaAtual || valAtual <= 0) return null

    const ehDinheiro = formaAtual.tipo === 'dinheiro'

    // Non-cash: amount must not exceed the effective remaining (after discount)
    if (!ehDinheiro && valAtual > restanteComDescontoAtual + 0.01) {
      return 'Valor inválido: pagamento excede o saldo restante.'
    }

    // Cash: troco is always mathematically valid (troco = val - remaining ≤ val)
    // but guard explicitly against the impossible case
    if (ehDinheiro) {
      const trocoCalculado = Math.max(0, valAtual - restanteComDescontoAtual)
      if (trocoCalculado > valAtual + 0.01) {
        return 'Operação inválida: troco excede o valor recebido em dinheiro.'
      }
    }

    return null
  }

  // ── Register one payment step ─────────────────────────────────────────────
  function registrarEtapa() {
    if (!formaAtual || valAtual <= 0) return

    const erroValidacao = validarEntrada()
    if (erroValidacao) { setErro(erroValidacao); return }
    setErro('')

    const novoPag: PagamentoParcial = {
      forma:    formaAtual,
      valor:    valAtual,
      parcelas,
      desconto: descontoAtual,
    }
    const novaLista = [...pagamentos, novoPag]
    const novoTotalDescontoPag = novaLista.reduce((s, p) => s + p.desconto, 0)
    const novoTotalJaPago      = novaLista.reduce((s, p) => s + p.valor, 0)
    const novoTotalFinal       = Math.max(0, baseTotal - novoTotalDescontoPag)
    const novoRestante         = Math.max(0, novoTotalFinal - novoTotalJaPago)

    if (novoRestante <= 0.01) {
      // Finalize the sale
      finalizarVenda(novaLista)
    } else {
      // Partial: register and prompt next payment
      setPagamentos(novaLista)
      setValorAtual('')
      setDescontoPct(0)
      setParcelas(1)
      // Switch to next unused payment method
      const usadas = novaLista.map(p => p.forma.id)
      const prox = formas.find(f => f.ativo && !usadas.includes(f.id))
      if (prox) setFormaAtual(prox)
      setTimeout(() => valorRef.current?.focus(), 50)
    }
  }

  async function finalizarVenda(lista: PagamentoParcial[]) {
    setProcessando(true); setErro('')
    try {
      // Effective total = baseTotal minus all payment-method discounts
      const totalDescontosPag  = lista.reduce((s, p) => s + p.desconto, 0)
      const effectiveTotal     = Math.max(0, baseTotal - totalDescontosPag)

      // Cap each payment valor so sum == effectiveTotal (backend expects this)
      let remaining = effectiveTotal
      const pagamentosParaAPI = lista
        .map(p => {
          const capped      = Math.min(p.valor, remaining)
          remaining         = Math.max(0, remaining - capped)
          const isDinheiro  = p.forma.tipo === 'dinheiro'
          return {
            forma_pagamento_id: p.forma.id,
            valor:              capped,
            parcelas:           p.parcelas,
            valor_recebido:     isDinheiro ? p.valor : undefined,
            troco:              isDinheiro && p.valor > capped ? p.valor - capped : undefined,
          }
        })
        .filter(p => p.valor > 0)

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
        desconto_pagamento: totalDescontosPag,
        vendedor_id:        vendedor_id ?? null,
        vendedor_nome:      vendedor_nome ?? null,
      })

      resetState()
      onSuccess(r)
    } catch (e: any) {
      setErro(e?.response?.data?.error ?? 'Erro ao registrar venda.')
      setProcessando(false)
    }
  }

  function resetState() {
    setPagamentos([]); setValorAtual(''); setDescontoPct(0); setParcelas(1)
    setErro(''); setProcessando(false); setFormaAtual(null)
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key !== 'Enter') return
    e.preventDefault()
    registrarEtapa()
  }

  function autoFill() {
    setValorAtual(restanteComDescontoAtual.toFixed(2))
    setTimeout(() => valorRef.current?.select(), 30)
  }

  const fmt = (v: number) => `R$ ${v.toFixed(2)}`
  const usadasIds = pagamentos.map(p => p.forma.id)

  return (
    <div className="fixed inset-0 bg-midnight/90 z-50 flex items-center justify-center p-4">
      <div className="bg-deep-ocean border border-ocean-depth rounded-2xl w-full max-w-md flex flex-col shadow-2xl">

        {/* Header */}
        <div className="px-6 py-5 border-b border-ocean-depth flex items-start justify-between">
          <div>
            <h3 className="text-sea-foam font-bold text-lg">Finalizar Compra</h3>
            <p className="text-steel text-xs mt-0.5">{itensComDesconto.reduce((s, i) => s + i.quantidade, 0)} item(ns)</p>
          </div>
          <div className="text-right">
            <p className="text-electric-cyan font-black text-3xl">{fmt(totalFinal)}</p>
            {(totalDesconto > 0 || cashbackUsar > 0) && (
              <p className="text-steel text-xs">
                subtotal {fmt(itensComDesconto.reduce((s, i) => s + i.preco_unitario * i.quantidade, 0))}
              </p>
            )}
          </div>
        </div>

        <div className="p-6 flex flex-col gap-4">

          {/* Pagamentos já realizados */}
          {pagamentos.length > 0 && (
            <div className="flex flex-col gap-1.5">
              {pagamentos.map((p, i) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span className="w-4 h-4 rounded-full bg-mint-green/20 flex items-center justify-center">
                      <span className="text-mint-green text-[10px]">✓</span>
                    </span>
                    <span className="text-sea-foam">{p.forma.nome}</span>
                    {p.desconto > 0 && <span className="text-mint-green text-xs">−{fmt(p.desconto)}</span>}
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

          {/* Seleção de forma atual */}
          {carregando ? (
            <div className="flex justify-center py-4">
              <div className="w-6 h-6 border-2 border-electric-cyan border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <>
              {/* Forma de pagamento */}
              <div className="flex flex-col gap-1.5">
                <label className="text-steel text-xs">Forma de pagamento</label>
                <select
                  value={formaAtual?.id ?? ''}
                  onChange={e => {
                    const f = formas.find(f => f.id === e.target.value)
                    if (f) { setFormaAtual(f); setDescontoPct(0); setErro('') }
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

              {/* Parcelas (crediário) */}
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

              {/* Valor */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-steel text-xs">Valor</label>
                  {restanteComDescontoAtual > 0 && (
                    <button onClick={autoFill} className="text-xs text-electric-cyan hover:underline">
                      preencher restante ({fmt(restanteComDescontoAtual)})
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

              {/* Slider de desconto */}
              {maxPct > 0 && valAtual && (
                <div className="flex flex-col gap-1.5 bg-midnight rounded-xl p-3">
                  <div className="flex justify-between text-xs">
                    <span className="text-steel">Desconto ({formaAtual?.nome})</span>
                    <span className="text-mint-green font-medium">
                      {descontoAtual > 0 ? `−${fmt(descontoAtual)}` : 'sem desconto'}
                    </span>
                  </div>
                  <input type="range" min="0" max={maxPct} step="0.5"
                    value={descontoPct}
                    onChange={e => setDescontoPct(parseFloat(e.target.value))}
                    className="w-full accent-electric-cyan h-1.5 rounded-full cursor-pointer" />
                  <div className="flex justify-between text-[10px] text-steel">
                    <span>0%</span>
                    <span>
                      máx {capR$ > 0 ? `${fmt(capR$)} (${maxPct}%)` : `${maxPct}%`}
                    </span>
                  </div>
                  {descontoAtual > 0 && (
                    <p className="text-center text-xs text-electric-cyan">
                      Total ajustado: {fmt(totalComDescontoAtual - totalJaPago)}
                    </p>
                  )}
                </div>
              )}

              {erro && <p className="text-red-400 text-sm text-center">{erro}</p>}

              {/* Botões */}
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
                    : restante <= 0.01 || valAtual >= restanteComDescontoAtual
                      ? `Finalizar — ${fmt(totalComDescontoAtual)}`
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
