'use client'

import { useState } from 'react'
import { Ruler, Palette, Tag, Layers, Maximize2, ChevronDown, ChevronRight, X } from 'lucide-react'
import { TopBar } from '@/components/layout/TopBar'
import { catalogosApi, type ItemCatalogo, type TipoCatalogo } from '@/lib/api/catalogos'

// ── Constants ─────────────────────────────────────────────────────────────────

const CARD = {
  background: 'rgba(8,18,30,0.48)',
  backdropFilter: 'blur(8px)',
  border: '0.5px solid rgba(255,255,255,0.09)',
  borderRadius: '10px',
}

const CHIP_BASE = {
  background: 'rgba(8,18,30,0.45)',
  border: '0.5px solid rgba(255,255,255,0.12)',
  borderRadius: '20px',
  display: 'inline-flex' as const,
  alignItems: 'center' as const,
  gap: '5px',
  padding: '4px 10px',
}

const SECTIONS = [
  { tipo: 'tamanhos'      as TipoCatalogo, label: 'Tamanhos',   singular: 'tamanho',    Icon: Ruler,     comCor: false },
  { tipo: 'cores'         as TipoCatalogo, label: 'Cores',       singular: 'cor',        Icon: Palette,   comCor: true  },
  { tipo: 'tipos_produto' as TipoCatalogo, label: 'Tipos',       singular: 'tipo',       Icon: Tag,       comCor: false },
  { tipo: 'composicoes'   as TipoCatalogo, label: 'Composições', singular: 'composição', Icon: Layers,    comCor: false },
  { tipo: 'medidas'       as TipoCatalogo, label: 'Medidas',     singular: 'medida',     Icon: Maximize2, comCor: false },
]

// ── State shape ───────────────────────────────────────────────────────────────

interface SecState {
  items:    ItemCatalogo[]
  loaded:   boolean
  loading:  boolean
  novoNome: string
  novoHex:  string
  saving:   boolean
}

function makeInitialData(): Record<string, SecState> {
  return Object.fromEntries(
    SECTIONS.map(s => [s.tipo, { items: [], loaded: false, loading: false, novoNome: '', novoHex: '#888888', saving: false }])
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function CadastrosPage() {
  const [data,        setData]        = useState<Record<string, SecState>>(makeInitialData)
  const [openSection, setOpenSection] = useState<string | null>(null)

  function patch(tipo: string, partial: Partial<SecState>) {
    setData(prev => ({ ...prev, [tipo]: { ...prev[tipo], ...partial } }))
  }

  async function loadSection(tipo: string) {
    if (data[tipo].loaded) return
    patch(tipo, { loading: true })
    try {
      const items = await catalogosApi.list(tipo as TipoCatalogo)
      patch(tipo, { items, loaded: true })
    } finally {
      patch(tipo, { loading: false })
    }
  }

  function toggleSection(tipo: string) {
    if (openSection === tipo) {
      setOpenSection(null)
    } else {
      setOpenSection(tipo)
      loadSection(tipo)
    }
  }

  async function handleAdd(tipo: string) {
    const sec    = data[tipo]
    const comCor = SECTIONS.find(s => s.tipo === tipo)?.comCor
    if (!sec.novoNome.trim()) return
    patch(tipo, { saving: true })
    try {
      await catalogosApi.create(tipo as TipoCatalogo, {
        nome:    sec.novoNome.trim(),
        hex_cor: comCor ? sec.novoHex : undefined,
      })
      patch(tipo, { novoNome: '', loading: true, loaded: false })
      const items = await catalogosApi.list(tipo as TipoCatalogo)
      patch(tipo, { items, loaded: true, loading: false })
    } finally {
      patch(tipo, { saving: false })
    }
  }

  async function handleRemove(tipo: string, id: string) {
    if (!confirm('Remover este item?')) return
    await catalogosApi.remove(tipo as TipoCatalogo, id)
    setData(prev => ({
      ...prev,
      [tipo]: { ...prev[tipo], items: prev[tipo].items.filter(i => i.id !== id) },
    }))
  }

  return (
    <>
      <TopBar />
      <main className="flex-1 overflow-y-auto p-4 md:p-5 pb-10 flex flex-col gap-2.5">

        {SECTIONS.map(({ tipo, label, singular, Icon, comCor }) => {
          const sec    = data[tipo]
          const isOpen = openSection === tipo

          return (
            <div key={tipo} style={CARD}>

              {/* ── Section header ──────────────────────────────────────── */}
              <button
                onClick={() => toggleSection(tipo)}
                className="w-full flex items-center gap-3 p-4"
              >
                <div
                  className="flex items-center justify-center shrink-0"
                  style={{ width: '32px', height: '32px', background: 'rgba(0,239,255,0.1)', borderRadius: '8px' }}
                >
                  <Icon size={15} strokeWidth={1.5} style={{ color: 'rgba(0,239,255,0.7)' }} />
                </div>

                <span style={{ flex: 1, textAlign: 'left', fontSize: '13px', fontWeight: 500, color: 'rgba(255,255,255,0.8)' }}>
                  {label}
                </span>

                {sec.loaded && (
                  <span style={{ fontSize: '10px', background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.4)', borderRadius: '9999px', padding: '2px 8px' }}>
                    {sec.items.length}
                  </span>
                )}

                {isOpen
                  ? <ChevronDown  size={14} strokeWidth={1.5} style={{ color: 'rgba(255,255,255,0.35)', flexShrink: 0 }} />
                  : <ChevronRight size={14} strokeWidth={1.5} style={{ color: 'rgba(255,255,255,0.25)', flexShrink: 0 }} />
                }
              </button>

              {/* ── Section body ────────────────────────────────────────── */}
              {isOpen && (
                <div
                  className="px-4 pb-4 flex flex-col gap-4"
                  style={{ borderTop: '0.5px solid rgba(255,255,255,0.07)' }}
                >
                  {/* Add row */}
                  <div className="flex gap-2 pt-4 items-center">
                    {comCor && (
                      <input
                        type="color"
                        value={sec.novoHex}
                        onChange={e => patch(tipo, { novoHex: e.target.value })}
                        className="cursor-pointer shrink-0"
                        style={{ width: '38px', height: '38px', borderRadius: '8px', border: '0.5px solid rgba(255,255,255,0.12)', background: 'transparent', padding: '2px' }}
                      />
                    )}
                    <input
                      value={sec.novoNome}
                      onChange={e => patch(tipo, { novoNome: e.target.value })}
                      onKeyDown={e => e.key === 'Enter' && handleAdd(tipo)}
                      placeholder={`Novo ${singular}...`}
                      className="flex-1 outline-none"
                      style={{
                        background: 'rgba(8,18,30,0.5)',
                        border: '0.5px solid rgba(255,255,255,0.12)',
                        borderRadius: '20px',
                        padding: '9px 14px',
                        fontSize: '13px',
                        color: 'rgba(255,255,255,0.7)',
                      }}
                      onFocus={e => (e.currentTarget.style.borderColor = 'rgba(0,239,255,0.4)')}
                      onBlur={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)')}
                    />
                    <button
                      onClick={() => handleAdd(tipo)}
                      disabled={sec.saving || !sec.novoNome.trim()}
                      className="shrink-0 disabled:opacity-40 transition-opacity"
                      style={{
                        background: 'rgba(0,239,255,0.2)',
                        border: '0.5px solid rgba(0,239,255,0.4)',
                        color: '#0ef',
                        borderRadius: '20px',
                        padding: '9px 16px',
                        fontSize: '13px',
                        fontWeight: 500,
                      }}
                    >
                      {sec.saving ? '...' : 'Adicionar'}
                    </button>
                  </div>

                  {/* Items */}
                  {sec.loading ? (
                    <div className="flex justify-center py-3">
                      <div className="w-5 h-5 border-2 border-electric-cyan border-t-transparent rounded-full animate-spin" />
                    </div>
                  ) : sec.items.length === 0 ? (
                    <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.25)', textAlign: 'center', padding: '4px 0 8px' }}>
                      Nenhum item cadastrado
                    </p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {sec.items.map(item => (
                        <div key={item.id} style={CHIP_BASE}>
                          {comCor && item.hex_cor && (
                            <span
                              style={{ width: '10px', height: '10px', borderRadius: '50%', background: item.hex_cor, border: '0.5px solid rgba(255,255,255,0.2)', flexShrink: 0 }}
                            />
                          )}
                          <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.75)' }}>{item.nome}</span>
                          <button
                            onClick={() => handleRemove(tipo, item.id)}
                            className="flex items-center justify-center transition-colors"
                            style={{ color: 'rgba(255,255,255,0.3)', padding: '1px' }}
                            onMouseEnter={e => (e.currentTarget.style.color = 'rgba(248,113,113,0.8)')}
                            onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.3)')}
                          >
                            <X size={11} strokeWidth={2} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}

      </main>
    </>
  )
}
