'use client'

import { PERMISSOES_MENU } from '@/lib/permissoes'

interface Props {
  value: string[]
  onChange: (slugs: string[]) => void
}

export function SeletorPermissoes({ value, onChange }: Props) {
  function toggle(slug: string) {
    onChange(value.includes(slug) ? value.filter(s => s !== slug) : [...value, slug])
  }

  function toggleAll() {
    onChange(value.length === PERMISSOES_MENU.length ? [] : PERMISSOES_MENU.map(p => p.slug))
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between mb-1">
        <label className="text-xs font-medium text-steel uppercase tracking-wider">Menus com acesso</label>
        <button type="button" onClick={toggleAll}
          className="text-xs text-electric-cyan/70 hover:text-electric-cyan">
          {value.length === PERMISSOES_MENU.length ? 'Desmarcar todos' : 'Marcar todos'}
        </button>
      </div>

      {PERMISSOES_MENU.map(p => {
        const ativo = value.includes(p.slug)
        return (
          <button key={p.slug} type="button" onClick={() => toggle(p.slug)}
            className={`min-h-[48px] px-4 flex items-center gap-3 rounded-xl border transition-colors text-left ${
              ativo ? 'border-electric-cyan bg-electric-cyan/10' : 'border-ocean-depth hover:border-teal-current'
            }`}>
            <span className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 ${
              ativo ? 'border-electric-cyan bg-electric-cyan' : 'border-steel'
            }`}>
              {ativo && <span className="text-midnight text-xs font-bold">✓</span>}
            </span>
            <span className={`text-sm font-medium ${ativo ? 'text-sea-foam' : 'text-steel'}`}>
              {p.label}
            </span>
          </button>
        )
      })}
    </div>
  )
}
