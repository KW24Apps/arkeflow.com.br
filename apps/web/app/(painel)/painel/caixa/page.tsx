'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { TopBar } from '@/components/layout/TopBar'
import { useCaixaStore } from '@/store/caixa.store'

export default function CaixaPage() {
  const router = useRouter()
  const { status, turno, carregando, erro, carregar, abrir, fechar, registrarMovimento, limparErro } = useCaixaStore()

  const [saldoInicial,   setSaldoInicial]   = useState('')
  const [obsAbertura,    setObsAbertura]    = useState('')
  const [saldoFinal,     setSaldoFinal]     = useState('')
  const [obsFechamento,  setObsFechamento]  = useState('')
  const [valorMovimento, setValorMovimento] = useState('')
  const [tipoMovimento,  setTipoMovimento]  = useState<'sangria' | 'suprimento'>('sangria')
  const [motivoMov,      setMotivoMov]      = useState('')

  const [modalFechar,    setModalFechar]    = useState(false)
  const [modalMovimento, setModalMovimento] = useState(false)
  const [salvando,       setSalvando]       = useState(false)

  useEffect(() => { carregar() }, [])

  async function handleAbrir() {
    setSalvando(true)
    try {
      await abrir(parseFloat(saldoInicial) || 0, obsAbertura || undefined)
      setSaldoInicial(''); setObsAbertura('')
    } finally { setSalvando(false) }
  }

  async function handleFechar() {
    setSalvando(true)
    try {
      await fechar(parseFloat(saldoFinal) || 0, obsFechamento || undefined)
      setModalFechar(false); setSaldoFinal(''); setObsFechamento('')
    } finally { setSalvando(false) }
  }

  async function handleMovimento() {
    const valor = parseFloat(valorMovimento)
    if (!valor || valor <= 0) return
    setSalvando(true)
    try {
      await registrarMovimento(tipoMovimento, valor, motivoMov || undefined)
      setModalMovimento(false); setValorMovimento(''); setMotivoMov('')
    } finally { setSalvando(false) }
  }

  const fmt = (v?: string | number | null) => `R$ ${Number(v ?? 0).toFixed(2)}`
  const fmtData = (d?: string) => d ? new Date(d).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : '—'

  if (carregando && status === 'desconhecido') {
    return (
      <>
        <TopBar title="Caixa" />
        <main className="flex-1 flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-electric-cyan border-t-transparent rounded-full animate-spin" />
        </main>
      </>
    )
  }

  return (
    <>
      <TopBar title="Caixa" />
      <main className="flex-1 overflow-y-auto p-4 md:p-6 pb-10">
        <div className="max-w-2xl flex flex-col gap-5">

          {erro && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-2xl px-4 py-3 flex items-center justify-between">
              <p className="text-red-400 text-sm">{erro}</p>
              <button onClick={limparErro} className="text-red-400 hover:text-red-300 text-lg ml-3">×</button>
            </div>
          )}

          {/* ── CAIXA FECHADO ── */}
          {status !== 'aberto' && (
            <div className="bg-deep-ocean border border-ocean-depth rounded-2xl p-6 flex flex-col gap-5">

              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-ocean-depth flex items-center justify-center shrink-0">
                  <span className="text-steel text-xl">🔒</span>
                </div>
                <div>
                  <p className="text-sea-foam font-semibold">Caixa fechado</p>
                  {turno?.fechado_em && (
                    <p className="text-steel text-xs">Fechado em {fmtData(turno.fechado_em)}</p>
                  )}
                </div>
              </div>

              {/* Último turno resumo */}
              {turno && status === 'fechado' && (
                <div className="bg-midnight rounded-xl p-4 flex flex-col gap-2 text-sm">
                  <p className="text-steel text-xs uppercase tracking-wider mb-1">Último turno</p>
                  <div className="flex justify-between">
                    <span className="text-steel">Abertura</span>
                    <span className="text-sea-foam">{fmtData(turno.aberto_em)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-steel">Fechamento</span>
                    <span className="text-sea-foam">{fmtData(turno.fechado_em ?? undefined)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-steel">Vendas</span>
                    <span className="text-mint-green font-semibold">{fmt(turno.total_vendas)} ({turno.qtd_vendas ?? 0} venda{turno.qtd_vendas !== 1 ? 's' : ''})</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-steel">Saldo inicial</span>
                    <span className="text-sea-foam">{fmt(turno.saldo_inicial)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-steel">Saldo final contado</span>
                    <span className="text-sea-foam">{fmt(turno.saldo_final)}</span>
                  </div>
                </div>
              )}

              {/* Formulário abertura */}
              <div className="flex flex-col gap-3">
                <p className="text-sea-foam text-sm font-medium">Abrir novo turno</p>
                <div className="flex flex-col gap-2">
                  <label className="text-steel text-xs">Saldo inicial (dinheiro em caixa)</label>
                  <input
                    type="number" min="0" step="0.01"
                    value={saldoInicial}
                    onChange={e => setSaldoInicial(e.target.value)}
                    placeholder="R$ 0,00"
                    className="min-h-[48px] bg-midnight border border-ocean-depth rounded-xl px-4 text-sea-foam text-sm outline-none focus:border-electric-cyan"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-steel text-xs">Observação (opcional)</label>
                  <input
                    type="text"
                    value={obsAbertura}
                    onChange={e => setObsAbertura(e.target.value)}
                    placeholder="Ex: abertura do dia"
                    className="min-h-[48px] bg-midnight border border-ocean-depth rounded-xl px-4 text-sea-foam text-sm outline-none focus:border-electric-cyan"
                  />
                </div>
                <button
                  onClick={handleAbrir}
                  disabled={salvando || carregando}
                  className="min-h-[52px] bg-electric-cyan text-midnight rounded-2xl font-bold text-sm disabled:opacity-40"
                >
                  {salvando ? 'Abrindo...' : 'Abrir Caixa'}
                </button>
              </div>
            </div>
          )}

          {/* ── CAIXA ABERTO ── */}
          {status === 'aberto' && turno && (
            <>
              {/* Status header */}
              <div className="bg-deep-ocean border border-mint-green/30 rounded-2xl p-5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-mint-green animate-pulse shrink-0" />
                  <div>
                    <p className="text-sea-foam font-semibold">Caixa aberto</p>
                    <p className="text-steel text-xs">Desde {fmtData(turno.aberto_em)}</p>
                  </div>
                </div>
                <p className="text-steel text-xs">Saldo inicial: {fmt(turno.saldo_inicial)}</p>
              </div>

              {/* Cards de resumo */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-deep-ocean border border-ocean-depth rounded-2xl p-4">
                  <p className="text-steel text-xs mb-1">Total em vendas</p>
                  <p className="text-mint-green font-bold text-xl">{fmt(turno.total_vendas)}</p>
                  <p className="text-steel text-xs mt-1">{turno.qtd_vendas ?? 0} venda{turno.qtd_vendas !== 1 ? 's' : ''}</p>
                </div>
                <div className="bg-deep-ocean border border-ocean-depth rounded-2xl p-4">
                  <p className="text-steel text-xs mb-1">Saldo esperado</p>
                  <p className="text-sea-foam font-bold text-xl">
                    {fmt(Number(turno.saldo_inicial) + Number(turno.total_vendas ?? 0) - Number(turno.total_sangrias ?? 0) + Number(turno.total_suprimentos ?? 0))}
                  </p>
                  <p className="text-steel text-xs mt-1">inicial + vendas ± mov.</p>
                </div>
                {Number(turno.total_sangrias ?? 0) > 0 && (
                  <div className="bg-deep-ocean border border-ocean-depth rounded-2xl p-4">
                    <p className="text-steel text-xs mb-1">Sangrias</p>
                    <p className="text-red-400 font-bold text-xl">-{fmt(turno.total_sangrias)}</p>
                  </div>
                )}
                {Number(turno.total_suprimentos ?? 0) > 0 && (
                  <div className="bg-deep-ocean border border-ocean-depth rounded-2xl p-4">
                    <p className="text-steel text-xs mb-1">Suprimentos</p>
                    <p className="text-electric-cyan font-bold text-xl">+{fmt(turno.total_suprimentos)}</p>
                  </div>
                )}
              </div>

              {/* Ações */}
              <div className="flex flex-col gap-3">
                <button
                  onClick={() => router.push('/painel/caixa/vendas')}
                  className="min-h-[52px] bg-ocean-depth text-sea-foam rounded-2xl text-sm font-medium flex items-center justify-center gap-2"
                >
                  Ver vendas do turno →
                </button>

                <button
                  onClick={() => { setTipoMovimento('sangria'); setModalMovimento(true) }}
                  className="min-h-[52px] border border-ocean-depth text-steel rounded-2xl text-sm hover:border-red-400/50 hover:text-red-400 transition-colors"
                >
                  Registrar Sangria (retirada de dinheiro)
                </button>

                <button
                  onClick={() => { setTipoMovimento('suprimento'); setModalMovimento(true) }}
                  className="min-h-[52px] border border-ocean-depth text-steel rounded-2xl text-sm hover:border-electric-cyan/50 hover:text-electric-cyan transition-colors"
                >
                  Registrar Suprimento (reforço de caixa)
                </button>

                <button
                  onClick={() => setModalFechar(true)}
                  className="min-h-[52px] border border-red-500/40 text-red-400 rounded-2xl text-sm font-medium hover:bg-red-500/10 transition-colors"
                >
                  Fechar Caixa
                </button>
              </div>
            </>
          )}

        </div>
      </main>

      {/* Modal fechar caixa */}
      {modalFechar && (
        <div className="fixed inset-0 bg-midnight/80 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-deep-ocean border border-ocean-depth rounded-2xl w-full max-w-sm p-6 flex flex-col gap-4">
            <div>
              <h3 className="text-sea-foam font-semibold text-base">Fechar Caixa</h3>
              <p className="text-steel text-xs mt-1">Confirme o saldo em dinheiro no caixa antes de fechar.</p>
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-steel text-xs">Saldo final contado (dinheiro)</label>
              <input
                type="number" min="0" step="0.01"
                value={saldoFinal}
                onChange={e => setSaldoFinal(e.target.value)}
                placeholder="R$ 0,00"
                autoFocus
                className="min-h-[48px] bg-midnight border border-ocean-depth rounded-xl px-4 text-sea-foam text-sm outline-none focus:border-electric-cyan"
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-steel text-xs">Observação (opcional)</label>
              <input
                type="text"
                value={obsFechamento}
                onChange={e => setObsFechamento(e.target.value)}
                placeholder="Ex: sem divergências"
                className="min-h-[44px] bg-midnight border border-ocean-depth rounded-xl px-4 text-sea-foam text-sm outline-none focus:border-electric-cyan"
              />
            </div>
            <div className="flex gap-3">
              <button onClick={() => setModalFechar(false)} className="flex-1 min-h-[48px] border border-ocean-depth text-steel rounded-xl text-sm">
                Cancelar
              </button>
              <button
                onClick={handleFechar}
                disabled={salvando}
                className="flex-1 min-h-[48px] bg-red-500/20 border border-red-500/40 text-red-400 rounded-xl text-sm font-semibold disabled:opacity-40"
              >
                {salvando ? 'Fechando...' : 'Confirmar Fechamento'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal sangria / suprimento */}
      {modalMovimento && (
        <div className="fixed inset-0 bg-midnight/80 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-deep-ocean border border-ocean-depth rounded-2xl w-full max-w-sm p-6 flex flex-col gap-4">
            <div>
              <h3 className="text-sea-foam font-semibold text-base capitalize">{tipoMovimento}</h3>
              <p className="text-steel text-xs mt-1">
                {tipoMovimento === 'sangria' ? 'Retirada de dinheiro do caixa.' : 'Reforço de dinheiro no caixa.'}
              </p>
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-steel text-xs">Valor (R$)</label>
              <input
                type="number" min="0.01" step="0.01"
                value={valorMovimento}
                onChange={e => setValorMovimento(e.target.value)}
                placeholder="0,00"
                autoFocus
                className="min-h-[48px] bg-midnight border border-ocean-depth rounded-xl px-4 text-sea-foam text-sm outline-none focus:border-electric-cyan"
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-steel text-xs">Motivo (opcional)</label>
              <input
                type="text"
                value={motivoMov}
                onChange={e => setMotivoMov(e.target.value)}
                placeholder="Ex: troco para vendedora"
                className="min-h-[44px] bg-midnight border border-ocean-depth rounded-xl px-4 text-sea-foam text-sm outline-none focus:border-electric-cyan"
              />
            </div>
            <div className="flex gap-3">
              <button onClick={() => setModalMovimento(false)} className="flex-1 min-h-[48px] border border-ocean-depth text-steel rounded-xl text-sm">
                Cancelar
              </button>
              <button
                onClick={handleMovimento}
                disabled={salvando || !valorMovimento}
                className="flex-1 min-h-[48px] bg-electric-cyan text-midnight rounded-xl text-sm font-semibold disabled:opacity-40"
              >
                {salvando ? 'Registrando...' : 'Registrar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
