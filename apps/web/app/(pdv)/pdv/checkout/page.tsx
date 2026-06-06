'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { usePDVStore } from '@/store/pdv.store'
import { financeiroApi, type FormaPagamento } from '@/lib/api/financeiro'
import { promocoesApi } from '@/lib/api/promocoes'
import { clientesApi } from '@/lib/api/clientes'
import { vendasApi } from '@/lib/api/vendas'
import { calcularDescontos } from '@/lib/calcularDesconto'

interface Pagamento {
  forma: FormaPagamento
  valor: string
  parcelas: number
}

export default function PDVCheckout() {
  const router = useRouter()
  const { itens, cliente_id, cliente_nome, vendedor_id, vendedor_nome, limpar } = usePDVStore()

  const [formas,       setFormas]       = useState<FormaPagamento[]>([])
  const [pagamentos,   setPagamentos]   = useState<Pagamento[]>([])
  const [promocoes,    setPromocoes]    = useState<any[]>([])
  const [clienteInfo,  setClienteInfo]  = useState<any>(null)
  const [usarCashback, setUsarCashback] = useState(false)
  const [processando,  setProcessando]  = useState(false)
  const [erro,         setErro]         = useState('')

  useEffect(() => {
    if (itens.length === 0) { router.push('/pdv'); return }

    Promise.all([
      financeiroApi.formasPagamento(),
      promocoesApi.list(false),
      cliente_id ? clientesApi.get(cliente_id) : Promise.resolve(null),
    ]).then(([fs, ps, cli]) => {
      setFormas(fs)
      setPromocoes(ps)
      setClienteInfo(cli)
      // Pré-seleciona Dinheiro como forma padrão
      const dinheiro = fs.find(f => f.tipo === 'dinheiro')
      if (dinheiro) setPagamentos([{ forma: dinheiro, valor: '', parcelas: 1 }])
    })
  }, [])

  // Calcula descontos das promoções
  const { itensComDesconto, totalDesconto } = calcularDescontos(
    itens, promocoes, !clienteInfo?.total_compras,
    {} // categorias — simplificado, será melhorado com integração completa
  )

  const subtotal       = itens.reduce((s, i) => s + i.preco_unitario * i.quantidade, 0)
  const cashbackDisp   = clienteInfo ? Number(clienteInfo.saldo_cashback) : 0
  const cashbackUsar   = usarCashback ? Math.min(cashbackDisp, subtotal - totalDesconto) : 0
  const total          = Math.max(0, subtotal - totalDesconto - cashbackUsar)
  const totalPagamentos= pagamentos.reduce((s, p) => s + (parseFloat(p.valor) || 0), 0)
  const troco          = Math.max(0, totalPagamentos - total)
  const falta          = Math.max(0, total - totalPagamentos)

  function addForma() {
    const usadas = pagamentos.map(p => p.forma.id)
    const livre  = formas.find(f => f.ativo && !usadas.includes(f.id))
    if (livre) setPagamentos(prev => [...prev, { forma: livre!, valor: '', parcelas: 1 }])
  }

  function updatePag(i: number, field: keyof Pagamento, val: any) {
    setPagamentos(prev => prev.map((p, idx) => idx === i ? { ...p, [field]: val } : p))
  }

  function removePag(i: number) {
    setPagamentos(prev => prev.filter((_, idx) => idx !== i))
  }

  // Distribui o valor restante automaticamente no primeiro campo vazio
  function autoDistribuir(i: number) {
    const outros = pagamentos.filter((_, idx) => idx !== i).reduce((s, p) => s + (parseFloat(p.valor) || 0), 0)
    const resto  = Math.max(0, total - outros)
    updatePag(i, 'valor', resto.toFixed(2))
  }

  async function handleConfirmar() {
    setErro('')
    if (Math.abs(falta) > 0.01) { setErro(`Faltam R$ ${falta.toFixed(2)} para cobrir o total.`); return }

    setProcessando(true)
    try {
      const payload = {
        cliente_id: cliente_id ?? null,
        itens: itensComDesconto.map(i => ({
          versao_id:      i.versao_id,
          quantidade:     i.quantidade,
          preco_unitario: i.preco_unitario,
          desconto_item:  i.desconto_item,
        })),
        pagamentos: pagamentos
          .filter(p => parseFloat(p.valor) > 0)
          .map(p => ({
            forma_pagamento_id: p.forma.id,
            valor:    parseFloat(p.valor),
            parcelas: p.parcelas,
          })),
        cashback_usado:    cashbackUsar,
        desconto_promocao: totalDesconto,
        vendedor_id:       vendedor_id ?? null,
        vendedor_nome:     vendedor_nome ?? null,
      }

      const result = await vendasApi.registrar(payload)
      limpar()
      router.push(`/pdv/venda/${result.venda_id}`)
    } catch (err: any) {
      setErro(err?.response?.data?.error ?? 'Erro ao registrar venda.')
    } finally { setProcessando(false) }
  }

  if (itens.length === 0) return null

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-3 bg-deep-ocean border-b border-ocean-depth flex items-center gap-3">
        <button onClick={() => router.back()} className="text-sea-foam text-xl px-1">←</button>
        <h2 className="text-sea-foam font-semibold">Fechar Venda</h2>
      </div>

      <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-3">

        {/* Resumo da sacola */}
        <div className="bg-deep-ocean border border-ocean-depth rounded-2xl p-4">
          <p className="text-sea-foam font-semibold text-sm mb-2">
            {itens.length} item(ns) · {cliente_nome ? `Cliente: ${cliente_nome}` : 'Sem cliente'}
          </p>
          <div className="flex flex-col gap-1">
            {itensComDesconto.map(item => {
              const label = Object.values(item.atributos).join(' / ') || 'Versão única'
              return (
                <div key={item.versao_id} className="flex items-center justify-between text-xs">
                  <span className="text-steel truncate flex-1">{item.nome} — {label} × {item.quantidade}</span>
                  <div className="text-right ml-2 shrink-0">
                    {item.desconto_item > 0 && (
                      <span className="text-mint-green mr-2">-R${item.desconto_item.toFixed(2)}</span>
                    )}
                    <span className="text-sea-foam">R${(item.preco_unitario * item.quantidade - item.desconto_item).toFixed(2)}</span>
                  </div>
                </div>
              )
            })}
          </div>
          <div className="border-t border-ocean-depth mt-3 pt-3 flex flex-col gap-1 text-xs">
            <div className="flex justify-between text-steel">
              <span>Subtotal</span><span>R$ {subtotal.toFixed(2)}</span>
            </div>
            {totalDesconto > 0 && (
              <div className="flex justify-between text-mint-green">
                <span>Desconto promoção</span><span>-R$ {totalDesconto.toFixed(2)}</span>
              </div>
            )}
            {cashbackUsar > 0 && (
              <div className="flex justify-between text-mint-green">
                <span>Cashback usado</span><span>-R$ {cashbackUsar.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-sea-foam font-bold text-base mt-1">
              <span>Total</span><span>R$ {total.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Cashback */}
        {cashbackDisp > 0 && (
          <div className={`flex items-center justify-between border rounded-2xl px-4 py-3 ${
            usarCashback ? 'border-mint-green bg-mint-green/10' : 'border-ocean-depth bg-deep-ocean'
          }`}>
            <div>
              <p className="text-sea-foam text-sm font-medium">Usar cashback do cliente</p>
              <p className="text-mint-green text-xs">Saldo: R$ {cashbackDisp.toFixed(2)}</p>
            </div>
            <button onClick={() => setUsarCashback(v => !v)}
              className={`w-10 h-6 rounded-full transition-colors relative shrink-0 ${usarCashback ? 'bg-mint-green' : 'bg-ocean-depth'}`}>
              <span className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${usarCashback ? 'left-5' : 'left-1'}`} />
            </button>
          </div>
        )}

        {/* Formas de pagamento */}
        <div className="bg-deep-ocean border border-ocean-depth rounded-2xl p-4 flex flex-col gap-3">
          <p className="text-sea-foam font-semibold text-sm">Pagamento</p>

          {pagamentos.map((pag, i) => (
            <div key={i} className="flex flex-col gap-2 bg-midnight rounded-xl p-3">
              <div className="flex items-center gap-2">
                <select
                  value={pag.forma.id}
                  onChange={e => {
                    const f = formas.find(f => f.id === e.target.value)
                    if (f) updatePag(i, 'forma', f)
                  }}
                  className="flex-1 min-h-[44px] bg-deep-ocean border border-ocean-depth rounded-xl px-3 text-sm text-sea-foam outline-none"
                >
                  {formas.filter(f => f.ativo).map(f => (
                    <option key={f.id} value={f.id}>{f.nome}</option>
                  ))}
                </select>
                <div className="relative w-28 shrink-0">
                  <input
                    type="number" min="0" step="0.01"
                    value={pag.valor}
                    onChange={e => updatePag(i, 'valor', e.target.value)}
                    onFocus={() => !pag.valor && autoDistribuir(i)}
                    placeholder="R$"
                    className="w-full min-h-[44px] bg-deep-ocean border border-ocean-depth rounded-xl px-3 text-sm text-sea-foam text-center outline-none focus:border-electric-cyan"
                  />
                </div>
                {pagamentos.length > 1 && (
                  <button onClick={() => removePag(i)} className="text-steel hover:text-red-400 text-xl min-h-[44px] min-w-[44px] flex items-center justify-center">×</button>
                )}
              </div>

              {pag.forma.tipo === 'crediario' && (
                <div className="flex items-center gap-2">
                  <label className="text-steel text-xs">Parcelas:</label>
                  <select value={pag.parcelas} onChange={e => updatePag(i, 'parcelas', parseInt(e.target.value))}
                    className="flex-1 min-h-[40px] bg-deep-ocean border border-ocean-depth rounded-xl px-3 text-sm text-sea-foam outline-none">
                    {[1,2,3,4,5,6,8,10,12].map(n => (
                      <option key={n} value={n}>{n}× R${(parseFloat(pag.valor || '0') / n).toFixed(2)}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          ))}

          {pagamentos.length < formas.filter(f => f.ativo).length && (
            <button onClick={addForma}
              className="text-xs text-electric-cyan/70 hover:text-electric-cyan self-start min-h-[36px]">
              + Outra forma de pagamento
            </button>
          )}

          {/* Resumo do pagamento */}
          <div className="border-t border-ocean-depth pt-3 flex flex-col gap-1 text-xs">
            <div className="flex justify-between text-steel">
              <span>Total da venda</span><span>R$ {total.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-steel">
              <span>Total informado</span><span>R$ {totalPagamentos.toFixed(2)}</span>
            </div>
            {troco > 0.01 && (
              <div className="flex justify-between text-mint-green font-semibold">
                <span>Troco</span><span>R$ {troco.toFixed(2)}</span>
              </div>
            )}
            {falta > 0.01 && (
              <div className="flex justify-between text-red-400 font-semibold">
                <span>Falta</span><span>R$ {falta.toFixed(2)}</span>
              </div>
            )}
          </div>
        </div>

        {erro && <p className="text-red-400 text-sm text-center">{erro}</p>}
      </div>

      {/* Botão confirmar */}
      <div className="p-3 bg-deep-ocean border-t border-ocean-depth">
        <button
          onClick={handleConfirmar}
          disabled={processando || falta > 0.01}
          className="w-full min-h-[56px] bg-electric-cyan text-midnight rounded-2xl text-base font-bold disabled:opacity-40 active:scale-[0.98] transition-transform"
        >
          {processando ? 'Registrando...' : `Confirmar Venda — R$ ${total.toFixed(2)}`}
        </button>
      </div>
    </div>
  )
}
