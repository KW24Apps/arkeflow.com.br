'use client'

import { useEffect, useState } from 'react'
import { catalogosApi, type ItemCatalogo } from '@/lib/api/catalogos'

export interface ItemComposicao {
  material: string
  percentual: number
}

interface Props {
  value: ItemComposicao[]
  onChange: (items: ItemComposicao[]) => void
}

export function ComposicaoForm({ value, onChange }: Props) {
  const [materiais, setMateriais] = useState<ItemCatalogo[]>([])

  useEffect(() => {
    catalogosApi.list('composicoes').then(setMateriais)
  }, [])

  // Guard: value pode vir como null/string de produtos antigos
  const items = Array.isArray(value) ? value : []
  const total = items.reduce((s, i) => s + Number(i.percentual), 0)

  function add() {
    onChange([...items, { material: '', percentual: 0 }])
  }

  function update(i: number, campo: keyof ItemComposicao, val: string) {
    onChange(items.map((item, idx) =>
      idx === i
        ? { ...item, [campo]: campo === 'percentual' ? parseInt(val) || 0 : val }
        : item
    ))
  }

  function remove(i: number) {
    onChange(items.filter((_, idx) => idx !== i))
  }

  function disponiveisParaItem(idx: number) {
    return materiais.filter(m =>
      m.nome === items[idx]?.material || !items.some(v => v.material === m.nome)
    )
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <label className="text-xs font-medium text-steel uppercase tracking-wider">Composição</label>
        {items.length > 0 && (
          <span className={`text-xs font-semibold ${
            total === 100 ? 'text-mint-green' : total > 100 ? 'text-red-400' : 'text-steel'
          }`}>
            Total: {total}%
            {total === 100 && ' ✓'}
            {total > 100 && ' — excede 100%'}
          </span>
        )}
      </div>

      {items.map((item, i) => (
        <div key={i} className="flex gap-2 items-center">
          <select
            value={item.material}
            onChange={e => update(i, 'material', e.target.value)}
            className="flex-1 min-h-[44px] bg-midnight border border-ocean-depth rounded-xl px-3 text-sm text-sea-foam outline-none focus:border-electric-cyan"
          >
            <option value="">Selecione...</option>
            {disponiveisParaItem(i).map(m => (
              <option key={m.id} value={m.nome}>{m.nome}</option>
            ))}
          </select>

          <div className="relative w-20 shrink-0">
            <input
              type="number" min="1" max="100"
              value={item.percentual || ''}
              onChange={e => update(i, 'percentual', e.target.value)}
              placeholder="0"
              className="w-full min-h-[44px] bg-midnight border border-ocean-depth rounded-xl px-3 pr-6 text-sm text-sea-foam text-center outline-none focus:border-electric-cyan"
            />
            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-steel text-xs">%</span>
          </div>

          <button
            onClick={() => remove(i)}
            className="min-h-[44px] min-w-[44px] text-steel hover:text-red-400 text-xl flex items-center justify-center"
          >×</button>
        </div>
      ))}

      {materiais.length > items.length && total < 100 && (
        <button
          type="button"
          onClick={add}
          className="text-xs text-electric-cyan/70 hover:text-electric-cyan self-start min-h-[36px]"
        >
          + Adicionar material
        </button>
      )}

      {items.length > 0 && total !== 100 && (
        <p className={`text-xs ${total > 100 ? 'text-red-400' : 'text-steel'}`}>
          {total > 100
            ? `Reduza ${total - 100}% para chegar a 100%.`
            : `Faltam ${100 - total}% para completar 100%.`
          }
        </p>
      )}
    </div>
  )
}
