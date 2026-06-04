'use client'

import { useState } from 'react'
import { GRUPOS_PERMISSAO, slugsDoGrupo } from '@/lib/permissoes'

interface Props {
  value: string[]
  onChange: (slugs: string[]) => void
}

export function SeletorPermissoes({ value, onChange }: Props) {
  const [expandidos, setExpandidos] = useState<string[]>([])

  function toggleExpandido(slug: string) {
    setExpandidos(prev => prev.includes(slug) ? prev.filter(s => s !== slug) : [...prev, slug])
  }

  // Retorna o status do grupo: 'full' | 'partial' | 'none'
  function grupoStatus(g: typeof GRUPOS_PERMISSAO[0]): 'full' | 'partial' | 'none' {
    if (value.includes('*') || value.includes(g.slug)) return 'full'
    if (g.sub.length === 0) return 'none'
    const marcados = g.sub.filter(s => value.includes(s.slug)).length
    if (marcados === 0) return 'none'
    if (marcados === g.sub.length) return 'full'
    return 'partial'
  }

  function grupoAtivo(slug: string) {
    const g = GRUPOS_PERMISSAO.find(x => x.slug === slug)!
    return grupoStatus(g) !== 'none'
  }

  function subAtivo(sub: string) {
    return value.includes(sub) || value.includes(sub.split('/')[0]) || value.includes('*')
  }

  function toggleGrupo(g: typeof GRUPOS_PERMISSAO[0]) {
    const jaAtivo = grupoAtivo(g.slug)
    if (jaAtivo) {
      // Remove o grupo e todos os seus sub-itens
      onChange(value.filter(s => !slugsDoGrupo(g).includes(s)))
      setExpandidos(prev => prev.filter(s => s !== g.slug))
    } else {
      // Ativa o grupo principal (sub-itens herdam automaticamente)
      onChange([...value.filter(s => !slugsDoGrupo(g).includes(s)), g.slug])
      // Expande automaticamente se tiver sub-itens
      if (g.sub.length) setExpandidos(prev => [...prev, g.slug])
    }
  }

  function toggleSub(grupoSlug: string, subSlug: string) {
    const grupoEmPermissoes = value.includes(grupoSlug)

    if (grupoEmPermissoes) {
      // O grupo estava como "tudo" — explode em sub-itens individuais
      const subs = GRUPOS_PERMISSAO.find(g => g.slug === grupoSlug)!.sub.map(s => s.slug)
      const semGrupo = value.filter(s => s !== grupoSlug)
      // Adiciona todos exceto o que foi desmarcado
      onChange([...semGrupo, ...subs.filter(s => s !== subSlug)])
    } else {
      // Toggle normal do sub-item
      if (value.includes(subSlug)) {
        onChange(value.filter(s => s !== subSlug))
      } else {
        onChange([...value, subSlug])
      }
    }
  }

  function marcarTodos() {
    onChange(GRUPOS_PERMISSAO.map(g => g.slug))
  }
  function desmarcarTodos() { onChange([]) }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between mb-1">
        <label className="text-xs font-medium text-steel uppercase tracking-wider">Menus com acesso</label>
        <div className="flex gap-3">
          <button type="button" onClick={marcarTodos} className="text-xs text-electric-cyan/70 hover:text-electric-cyan">Todos</button>
          <button type="button" onClick={desmarcarTodos} className="text-xs text-steel hover:text-sea-foam">Nenhum</button>
        </div>
      </div>

      {GRUPOS_PERMISSAO.map(g => {
        const ativo    = grupoAtivo(g.slug)
        const aberto   = expandidos.includes(g.slug)
        const temSub   = g.sub.length > 0

        return (
          <div key={g.slug}>
            {/* Item principal */}
            <div className={`flex items-center gap-3 min-h-[48px] px-4 rounded-xl border transition-colors ${
              ativo ? 'border-electric-cyan bg-electric-cyan/10' : 'border-ocean-depth hover:border-teal-current'
            }`}>
              {/* Checkbox com três estados */}
              {(() => {
                const status = grupoStatus(g)
                return (
                  <button type="button" onClick={() => toggleGrupo(g)}
                    className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
                      status === 'full'    ? 'border-electric-cyan bg-electric-cyan' :
                      status === 'partial' ? 'border-electric-cyan bg-transparent' :
                                             'border-steel'
                    }`}>
                    {status === 'full'    && <span className="text-midnight text-xs font-bold leading-none">✓</span>}
                    {status === 'partial' && <span className="text-electric-cyan text-sm font-bold leading-none">—</span>}
                  </button>
                )
              })()}

              {/* Label */}
              <span className={`flex-1 text-sm font-medium ${ativo ? 'text-sea-foam' : 'text-steel'}`}>
                {g.label}
              </span>

              {/* Expandir se tiver sub-itens */}
              {temSub && (
                <button type="button" onClick={() => toggleExpandido(g.slug)}
                  className="text-steel hover:text-sea-foam text-xs px-2 min-h-[40px]">
                  {aberto ? '▲' : '▼'}
                </button>
              )}
            </div>

            {/* Sub-itens */}
            {temSub && aberto && (
              <div className="ml-8 mt-1 flex flex-col gap-1">
                {g.sub.map(s => {
                  const sAtivo = subAtivo(s.slug)
                  return (
                    <button key={s.slug} type="button" onClick={() => toggleSub(g.slug, s.slug)}
                      className={`flex items-center gap-3 min-h-[44px] px-4 rounded-xl border transition-colors text-left ${
                        sAtivo ? 'border-electric-cyan/50 bg-electric-cyan/5' : 'border-ocean-depth hover:border-teal-current'
                      }`}>
                      <span className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 ${
                        sAtivo ? 'border-electric-cyan bg-electric-cyan' : 'border-steel'
                      }`}>
                        {sAtivo && <span className="text-midnight text-[9px] font-bold">✓</span>}
                      </span>
                      <span className={`text-sm ${sAtivo ? 'text-sea-foam' : 'text-steel'}`}>{s.label}</span>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
