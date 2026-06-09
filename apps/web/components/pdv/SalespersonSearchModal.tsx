'use client'

import { useEffect, useRef, useState } from 'react'
import { colaboradoresApi, type Colaborador } from '@/lib/api/colaboradores'
import { usePDVStore } from '@/store/pdv.store'

interface Props {
  open:     boolean
  onClose:  () => void
  onSelect: (colaborador: Colaborador) => void
}

export function SalespersonSearchModal({ open, onClose, onSelect }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const todosRef = useRef<Colaborador[]>([])

  const [q,         setQ]         = useState('')
  const [filtrados, setFiltrados] = useState<Colaborador[]>([])

  // ── Load all into ref on open (silent, no spinner) ────────────────────────
  useEffect(() => {
    if (!open) return
    setQ('')
    setFiltrados([])
    setTimeout(() => inputRef.current?.focus(), 80)
    colaboradoresApi.list()
      .then(cs => { todosRef.current = cs.filter(c => c.ativo) })
      .catch(() => {})
  }, [open])

  // ── Debounced client-side filter ──────────────────────────────────────────
  useEffect(() => {
    if (!q.trim()) { setFiltrados([]); return }
    const t = setTimeout(() => {
      const query = q.toLowerCase().trim()
      setFiltrados(
        todosRef.current.filter(c =>
          c.nome.toLowerCase().includes(query) ||
          c.email.toLowerCase().includes(query) ||
          c.cargo?.toLowerCase().includes(query)
        )
      )
    }, 280)
    return () => clearTimeout(t)
  }, [q])

  // ── ESC to close ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  const nivelLabel = (nivel: string) =>
    nivel === 'dono_loja' ? 'Dono / Gerente' : 'Vendedor'

  return (
    <div
      className="fixed inset-0 bg-midnight/85 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-deep-ocean border border-ocean-depth rounded-2xl w-full max-w-lg flex flex-col shadow-2xl"
        style={{ maxHeight: '88vh' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="shrink-0 px-5 py-4 border-b border-ocean-depth flex items-center justify-between">
          <h3 className="text-sea-foam font-semibold">Atribuir Vendedor</h3>
          <button
            onClick={onClose}
            className="w-10 h-10 flex items-center justify-center text-steel hover:text-sea-foam text-xl rounded-xl hover:bg-ocean-depth transition-colors"
          >×</button>
        </div>

        {/* Search */}
        <div className="shrink-0 p-4 border-b border-ocean-depth">
          <input
            ref={inputRef}
            type="text"
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="Buscar por nome, cargo ou e-mail..."
            className="w-full min-h-[48px] bg-midnight border border-ocean-depth rounded-xl px-4 text-sm text-sea-foam placeholder-steel/60 outline-none focus:border-electric-cyan"
          />
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2">
          {!q.trim() && (
            <div className="flex flex-col items-center py-8 gap-2 opacity-40">
              <span className="text-4xl">🔍</span>
              <p className="text-steel text-sm">Digite para buscar</p>
            </div>
          )}

          {q.trim() && filtrados.length === 0 && (
            <div className="text-center py-10 text-steel text-sm">
              Nenhum colaborador encontrado para "{q}"
            </div>
          )}

          {filtrados.map(c => (
            <button
              key={c.id}
              onClick={() => { usePDVStore.getState().setVendedor(c.id, c.nome); onSelect(c) }}
              className="flex items-center gap-3 p-4 bg-midnight border border-ocean-depth rounded-2xl text-left hover:border-electric-cyan active:bg-ocean-depth transition-colors"
            >
              <div className="w-10 h-10 rounded-full bg-ocean-depth flex items-center justify-center shrink-0">
                <span className="text-sea-foam font-semibold text-sm">{c.nome.charAt(0).toUpperCase()}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sea-foam font-medium text-sm truncate">{c.nome}</p>
                <p className="text-steel text-xs">{c.cargo || nivelLabel(c.nivel)}</p>
              </div>
              <span className={`shrink-0 text-xs px-2 py-0.5 rounded-lg ${
                c.nivel === 'dono_loja'
                  ? 'bg-electric-cyan/10 text-electric-cyan'
                  : 'bg-ocean-depth text-steel'
              }`}>
                {nivelLabel(c.nivel)}
              </span>
            </button>
          ))}
        </div>

        <div className="shrink-0 px-5 py-3 border-t border-ocean-depth">
          <p className="text-steel text-xs text-center">
            {q.trim()
              ? `${filtrados.length} resultado${filtrados.length !== 1 ? 's' : ''}`
              : 'Digite para filtrar colaboradores'}
          </p>
        </div>
      </div>
    </div>
  )
}
