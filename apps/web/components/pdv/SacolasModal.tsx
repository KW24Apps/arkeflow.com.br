'use client'

import { useEffect, useRef, useState } from 'react'
import { sacolasApi, type SacolaRemota } from '@/lib/api/sacolas'
import { usePDVStore } from '@/store/pdv.store'

interface Props {
  open:       boolean
  onClose:    () => void
  // Called after loading a cart so the page can redirect focus
  onCarregada?: () => void
}

export function SacolasModal({ open, onClose, onCarregada }: Props) {
  const searchRef = useRef<HTMLInputElement>(null)
  const { carregarSacola } = usePDVStore()

  const [sacolas,    setSacolas]    = useState<SacolaRemota[]>([])
  const [carregando, setCarregando] = useState(false)
  const [q,          setQ]          = useState('')
  const [loadingId,  setLoadingId]  = useState<string | null>(null)
  const [erro,       setErro]       = useState('')

  // ── Load on open ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!open) return
    setQ(''); setErro('')
    setCarregando(true)
    sacolasApi.list('aguardando')
      .then(setSacolas)
      .catch(() => setErro('Não foi possível carregar as sacolas.'))
      .finally(() => {
        setCarregando(false)
        setTimeout(() => searchRef.current?.focus(), 80)
      })
  }, [open])

  // ── ESC to close ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  // ── Filter ────────────────────────────────────────────────────────────────
  const filtradas = q.trim()
    ? sacolas.filter(s =>
        s.cliente_nome?.toLowerCase().includes(q.toLowerCase()) ||
        s.nome_vendedor?.toLowerCase().includes(q.toLowerCase())
      )
    : sacolas

  // ── Load cart into POS ────────────────────────────────────────────────────
  async function handleCarregar(sacola: SacolaRemota) {
    setLoadingId(sacola.id); setErro('')
    try {
      // Lock the cart so no one else can load it concurrently
      await sacolasApi.updateStatus(sacola.id, 'em_atendimento')
      // Populate the POS cart
      carregarSacola(
        sacola.id,
        sacola.itens,
        sacola.cliente_id,
        sacola.cliente_nome,
        sacola.criado_por,
        sacola.nome_vendedor,
      )
      onClose()
      onCarregada?.()
    } catch (e: any) {
      setErro(e?.response?.data?.error ?? 'Erro ao carregar sacola.')
      setLoadingId(null)
    }
  }

  const fmt = (v: number) => `R$ ${v.toFixed(2)}`
  const total = (s: SacolaRemota) =>
    s.itens.reduce((sum, i) => sum + i.preco_unitario * i.quantidade, 0)

  const fmtDt = (d: string) => new Date(d).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
  })

  return (
    <div
      className="fixed inset-0 bg-midnight/85 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-deep-ocean border border-ocean-depth rounded-2xl w-full max-w-lg flex flex-col shadow-2xl"
        style={{ maxHeight: '82vh' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="shrink-0 px-5 py-4 border-b border-ocean-depth flex items-center justify-between">
          <div>
            <h3 className="text-sea-foam font-semibold text-base">Sacolas Pendentes</h3>
            <p className="text-steel text-xs mt-0.5">
              {sacolas.length} sacola{sacolas.length !== 1 ? 's' : ''} aguardando atendimento
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-11 h-11 flex items-center justify-center text-steel hover:text-sea-foam text-2xl rounded-xl hover:bg-ocean-depth transition-colors"
          >×</button>
        </div>

        {/* Search */}
        <div className="shrink-0 p-4 border-b border-ocean-depth">
          <input
            ref={searchRef}
            type="text"
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="Filtrar por cliente ou vendedor..."
            className="w-full min-h-[48px] bg-midnight border border-ocean-depth rounded-xl px-4 text-sm text-sea-foam placeholder-steel/60 outline-none focus:border-electric-cyan"
          />
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-3">
          {carregando && (
            <div className="flex justify-center py-12">
              <div className="w-7 h-7 border-2 border-electric-cyan border-t-transparent rounded-full animate-spin" />
            </div>
          )}

          {!carregando && erro && (
            <div className="text-center py-8">
              <p className="text-red-400 text-sm">{erro}</p>
              <button
                onClick={() => { setErro(''); setCarregando(true); sacolasApi.list('aguardando').then(setSacolas).finally(() => setCarregando(false)) }}
                className="mt-3 text-electric-cyan text-xs hover:underline"
              >Tentar novamente</button>
            </div>
          )}

          {!carregando && !erro && filtradas.length === 0 && (
            <div className="flex flex-col items-center py-12 gap-3 opacity-50">
              <span className="text-4xl">🛍</span>
              <p className="text-steel text-sm">
                {q ? `Nenhuma sacola encontrada para "${q}"` : 'Nenhuma sacola pendente no momento'}
              </p>
            </div>
          )}

          {!carregando && filtradas.map(sacola => {
            const isLoading = loadingId === sacola.id
            const tot = total(sacola)
            const qtdItens = sacola.itens.reduce((s, i) => s + i.quantidade, 0)

            return (
              <div
                key={sacola.id}
                className="bg-midnight border border-ocean-depth rounded-2xl p-4 flex flex-col gap-3"
              >
                {/* Top row: customer + total */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sea-foam font-semibold text-sm truncate">
                      {sacola.cliente_nome ?? 'Cliente não identificado'}
                    </p>
                    <p className="text-steel text-xs mt-0.5">
                      {qtdItens} item{qtdItens !== 1 ? 'ns' : ''} · {fmtDt(sacola.criado_em)}
                    </p>
                  </div>
                  <p className="text-electric-cyan font-bold text-base shrink-0">{fmt(tot)}</p>
                </div>

                {/* Items preview */}
                <div className="flex flex-wrap gap-1.5">
                  {sacola.itens.slice(0, 4).map((item, idx) => {
                    const attrs = Object.values(item.atributos ?? {}).join('/')
                    return (
                      <span key={idx} className="text-xs text-steel bg-ocean-depth px-2 py-1 rounded-lg truncate max-w-[140px]">
                        {item.quantidade > 1 && <span className="text-sea-foam font-medium">{item.quantidade}× </span>}
                        {item.nome}{attrs ? ` ${attrs}` : ''}
                      </span>
                    )
                  })}
                  {sacola.itens.length > 4 && (
                    <span className="text-xs text-steel/60 px-2 py-1">+{sacola.itens.length - 4} mais</span>
                  )}
                </div>

                {/* Bottom row: salesperson + load button */}
                <div className="flex items-center justify-between gap-3">
                  <p className="text-steel text-xs truncate">
                    {sacola.nome_vendedor
                      ? `Vendedor: ${sacola.nome_vendedor}`
                      : 'Vendedor não informado'}
                    {sacola.observacao && <span className="ml-2 opacity-70">· {sacola.observacao}</span>}
                  </p>
                  <button
                    onClick={() => handleCarregar(sacola)}
                    disabled={!!loadingId}
                    className="shrink-0 min-h-[44px] px-5 bg-electric-cyan text-midnight rounded-xl text-sm font-bold disabled:opacity-40 active:scale-[0.98] transition-transform"
                  >
                    {isLoading ? '...' : 'Carregar'}
                  </button>
                </div>
              </div>
            )
          })}
        </div>

        {/* Footer */}
        <div className="shrink-0 px-4 pb-4 pt-2 border-t border-ocean-depth">
          <button
            onClick={onClose}
            className="w-full min-h-[48px] border border-ocean-depth text-steel rounded-xl text-sm hover:text-sea-foam transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  )
}
