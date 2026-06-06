'use client'

import { useEffect, useRef, useState } from 'react'
import { colaboradoresApi, type Colaborador } from '@/lib/api/colaboradores'

interface Props {
  open:     boolean
  onClose:  () => void
  onSelect: (colaborador: Colaborador) => void
}

export function SalespersonSearchModal({ open, onClose, onSelect }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)

  const [todos,      setTodos]      = useState<Colaborador[]>([])
  const [q,          setQ]          = useState('')
  const [carregando, setCarregando] = useState(false)

  // ── Load on open ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!open) return
    setQ('')
    setCarregando(true)
    colaboradoresApi.list()
      .then(cs => setTodos(cs.filter(c => c.ativo)))
      .catch(() => {})
      .finally(() => {
        setCarregando(false)
        setTimeout(() => inputRef.current?.focus(), 80)
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

  // ── Client-side filter ────────────────────────────────────────────────────
  const query     = q.toLowerCase().trim()
  const filtrados = query
    ? todos.filter(c =>
        c.nome.toLowerCase().includes(query) ||
        c.email.toLowerCase().includes(query) ||
        c.cargo?.toLowerCase().includes(query)
      )
    : todos

  const nivelLabel = (nivel: string) =>
    nivel === 'dono_loja' ? 'Dono / Gerente' : 'Vendedor'

  return (
    <div
      className="fixed inset-0 bg-midnight/85 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-deep-ocean border border-ocean-depth rounded-2xl w-full max-w-md flex flex-col shadow-2xl"
        style={{ maxHeight: '78vh' }}
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
          {carregando && (
            <div className="flex justify-center py-8">
              <div className="w-6 h-6 border-2 border-electric-cyan border-t-transparent rounded-full animate-spin" />
            </div>
          )}

          {!carregando && filtrados.length === 0 && (
            <div className="text-center py-10 text-steel text-sm">
              {q ? `Nenhum colaborador encontrado para "${q}"` : 'Nenhum colaborador ativo cadastrado.'}
            </div>
          )}

          {!carregando && filtrados.map(c => (
            <button
              key={c.id}
              onClick={() => onSelect(c)}
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
          <p className="text-steel text-xs text-center">{filtrados.length} colaborador{filtrados.length !== 1 ? 'es' : ''}</p>
        </div>
      </div>
    </div>
  )
}
