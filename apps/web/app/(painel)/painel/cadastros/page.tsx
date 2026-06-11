'use client'

import { useEffect, useState } from 'react'
import { Ruler, Palette, Tag, Layers, Maximize2 } from 'lucide-react'
import { TopBar } from '@/components/layout/TopBar'
import { catalogosApi, type ItemCatalogo, type TipoCatalogo } from '@/lib/api/catalogos'
import { ConfirmModal } from '@/components/ui/ConfirmModal'

// ── Constants ─────────────────────────────────────────────────────────────────

const ITEM_BOX = {
  background: 'rgba(8,18,30,0.35)',
  border: '0.5px solid rgba(255,255,255,0.06)',
  borderRadius: '6px',
  padding: '6px 8px',
  display: 'flex' as const,
  alignItems: 'center' as const,
  justifyContent: 'space-between' as const,
  gap: '4px',
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

// ── Remove button ─────────────────────────────────────────────────────────────

function RemoveBtn({ onClick, size = 11 }: { onClick: () => void; size?: number }) {
  return (
    <button
      onClick={onClick}
      style={{ color: 'rgba(255,255,255,0.18)', fontSize: `${size}px`, background: 'none', border: 'none', cursor: 'pointer', padding: '1px', lineHeight: 1, flexShrink: 0 }}
      onMouseEnter={e => (e.currentTarget.style.color = 'rgba(248,113,113,0.85)')}
      onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.18)')}
    >
      ×
    </button>
  )
}

// ── Per-section item renderers ─────────────────────────────────────────────────

function RenderTamanhos({ items, onRemove }: { items: ItemCatalogo[]; onRemove: (id: string) => void }) {
  const letters = items.filter(i => !/^\d/.test(i.nome))
  const numbers = [...items.filter(i => /^\d/.test(i.nome))].sort((a, b) => parseFloat(a.nome) - parseFloat(b.nome))

  const col = (list: ItemCatalogo[]) => (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '4px' }}>
      {list.map(item => (
        <div key={item.id} style={ITEM_BOX}>
          <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.nome}</span>
          <RemoveBtn onClick={() => onRemove(item.id)} />
        </div>
      ))}
    </div>
  )

  const showLeft  = letters.length > 0
  const showRight = numbers.length > 0
  if (!showLeft && !showRight) return null

  if (!showLeft || !showRight) {
    return col(showLeft ? letters : numbers)
  }

  return (
    <div className="flex gap-3">
      <div style={{ flex: 1 }}>
        <p style={{ fontSize: '8px', textTransform: 'uppercase', letterSpacing: '0.12em', color: 'rgba(255,255,255,0.2)', marginBottom: '6px' }}>Letras</p>
        {col(letters)}
      </div>
      <div style={{ width: '0.5px', background: 'rgba(255,255,255,0.06)', alignSelf: 'stretch' }} />
      <div style={{ flex: 1 }}>
        <p style={{ fontSize: '8px', textTransform: 'uppercase', letterSpacing: '0.12em', color: 'rgba(255,255,255,0.2)', marginBottom: '6px' }}>Números</p>
        {col(numbers)}
      </div>
    </div>
  )
}

function RenderCores({ items, onRemove }: { items: ItemCatalogo[]; onRemove: (id: string) => void }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '6px' }}>
      {items.map(item => (
        <div key={item.id} style={{ background: 'rgba(8,18,30,0.35)', border: '0.5px solid rgba(255,255,255,0.08)', borderRadius: '8px', padding: '8px', textAlign: 'center', position: 'relative' }}>
          <button
            onClick={() => onRemove(item.id)}
            style={{ position: 'absolute', top: '3px', right: '4px', fontSize: '9px', color: 'rgba(255,255,255,0.2)', background: 'none', border: 'none', cursor: 'pointer', lineHeight: 1, padding: '1px' }}
            onMouseEnter={e => (e.currentTarget.style.color = 'rgba(248,113,113,0.85)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.2)')}
          >×</button>
          <div style={{ width: '16px', height: '16px', borderRadius: '3px', background: item.hex_cor || 'rgba(255,255,255,0.2)', margin: '2px auto 5px', border: '0.5px solid rgba(255,255,255,0.15)' }} />
          <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.6)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.nome}</p>
        </div>
      ))}
    </div>
  )
}

function RenderDefault({ items, onRemove }: { items: ItemCatalogo[]; onRemove: (id: string) => void }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '4px' }}>
      {items.map(item => (
        <div key={item.id} style={ITEM_BOX}>
          <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.7)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, textAlign: 'center' }}>{item.nome}</span>
          <RemoveBtn onClick={() => onRemove(item.id)} />
        </div>
      ))}
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function CadastrosPage() {
  const [data,        setData]        = useState<Record<string, SecState>>(makeInitialData)
  const [openSection, setOpenSection] = useState<string | null>(null)
  const [modal, setModal] = useState<{ open: boolean; onConfirm: () => void }>({ open: false, onConfirm: () => {} })

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpenSection(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

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
    setModal({
      open: true,
      onConfirm: async () => {
        await catalogosApi.remove(tipo as TipoCatalogo, id)
        setData(prev => ({
          ...prev,
          [tipo]: { ...prev[tipo], items: prev[tipo].items.filter(i => i.id !== id) },
        }))
      },
    })
  }

  const openSec = openSection ? SECTIONS.find(s => s.tipo === openSection) ?? null : null

  return (
    <>
      <TopBar />
      <main className="flex-1 overflow-y-auto p-4 md:p-5 pb-10 flex flex-col gap-4">

        {/* ── Panel above the grid ─────────────────────────────────────── */}
        {openSection && openSec && (() => {
          const sec  = data[openSection]
          const tipo = openSection
          return (
            <div style={{
              background: 'rgba(8,18,30,0.55)',
              backdropFilter: 'blur(12px)',
              border: '0.5px solid rgba(255,255,255,0.09)',
              borderRadius: '12px',
              overflow: 'hidden',
            }}>
              <div className="flex items-center gap-2.5 px-5 py-3.5" style={{ borderBottom: '0.5px solid rgba(255,255,255,0.07)' }}>
                <openSec.Icon size={15} style={{ color: '#0ef', flexShrink: 0 }} />
                <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.45)', fontWeight: 500 }}>
                  {openSec.label}
                </span>
              </div>

              <div className="p-5 flex flex-col gap-4">
                {/* Add row */}
                <div className="flex gap-2 items-center flex-wrap">
                  {openSec.comCor && (
                    <input type="color" value={sec.novoHex}
                      onChange={e => patch(tipo, { novoHex: e.target.value })}
                      className="cursor-pointer shrink-0"
                      style={{ width: '34px', height: '34px', borderRadius: '8px', border: '0.5px solid rgba(255,255,255,0.12)', background: 'transparent', padding: '2px' }}
                    />
                  )}
                  <input
                    value={sec.novoNome}
                    onChange={e => patch(tipo, { novoNome: e.target.value })}
                    onKeyDown={e => e.key === 'Enter' && handleAdd(tipo)}
                    placeholder={`Novo ${openSec.singular}...`}
                    className="outline-none"
                    style={{
                      background: 'rgba(8,18,30,0.5)',
                      border: '0.5px solid rgba(255,255,255,0.12)',
                      borderRadius: '20px',
                      padding: '7px 14px',
                      fontSize: '12px',
                      color: 'rgba(255,255,255,0.7)',
                      width: 'auto',
                      flex: '0 1 200px',
                      minWidth: '110px',
                      maxWidth: '200px',
                    }}
                    onFocus={e => (e.currentTarget.style.borderColor = 'rgba(0,239,255,0.4)')}
                    onBlur={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)')}
                  />
                  <button
                    onClick={() => handleAdd(tipo)}
                    disabled={sec.saving || !sec.novoNome.trim()}
                    className="shrink-0 disabled:opacity-40 transition-opacity"
                    style={{
                      background: 'rgba(0,239,255,0.18)',
                      border: '0.5px solid rgba(0,239,255,0.35)',
                      color: '#0ef',
                      borderRadius: '20px',
                      padding: '7px 14px',
                      fontSize: '12px',
                      fontWeight: 500,
                      cursor: 'pointer',
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
                ) : tipo === 'tamanhos' ? (
                  <RenderTamanhos items={sec.items} onRemove={id => handleRemove(tipo, id)} />
                ) : tipo === 'cores' ? (
                  <RenderCores items={sec.items} onRemove={id => handleRemove(tipo, id)} />
                ) : (
                  <RenderDefault items={sec.items} onRemove={id => handleRemove(tipo, id)} />
                )}
              </div>
            </div>
          )
        })()}

        {/* ── Card grid ────────────────────────────────────────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '12px' }}>
          {SECTIONS.map(({ tipo, label, Icon }) => {
            const sel = openSection === tipo
            return (
              <button
                key={tipo}
                type="button"
                onClick={() => toggleSection(tipo)}
                className="flex flex-col items-center justify-center gap-2.5 active:scale-[0.97]"
                style={{
                  padding: '20px 12px',
                  minHeight: '110px',
                  background:     sel ? 'rgba(0,239,255,0.08)' : 'rgba(8,18,30,0.48)',
                  backdropFilter: 'blur(8px)',
                  border:         sel ? '0.5px solid rgba(0,239,255,0.5)' : '0.5px solid rgba(255,255,255,0.09)',
                  borderRadius:   '10px',
                  cursor: 'pointer',
                  outline: 'none',
                  transition: 'background 120ms, border-color 120ms, box-shadow 120ms, transform 100ms',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background  = sel ? 'rgba(0,239,255,0.12)' : 'rgba(255,255,255,0.04)'
                  e.currentTarget.style.borderColor = sel ? 'rgba(0,239,255,0.65)' : 'rgba(255,255,255,0.18)'
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background  = sel ? 'rgba(0,239,255,0.08)' : 'rgba(8,18,30,0.48)'
                  e.currentTarget.style.borderColor = sel ? 'rgba(0,239,255,0.5)'  : 'rgba(255,255,255,0.09)'
                }}
                onFocus={e => { e.currentTarget.style.boxShadow = '0 0 0 2px rgba(0,239,255,0.3)' }}
                onBlur={e => { e.currentTarget.style.boxShadow = 'none' }}
              >
                <Icon size={24} style={{ color: sel ? '#0ef' : 'rgba(255,255,255,0.35)' }} />
                <span style={{ fontSize: '12px', fontWeight: 500, color: sel ? '#0ef' : 'rgba(255,255,255,0.55)', textAlign: 'center', lineHeight: 1.3 }}>
                  {label}
                </span>
              </button>
            )
          })}
        </div>

      </main>
      <ConfirmModal
        isOpen={modal.open}
        title="Remover item"
        message="Esta ação não pode ser desfeita."
        confirmLabel="Remover"
        confirmStyle="danger"
        onConfirm={() => { setModal(m => ({ ...m, open: false })); modal.onConfirm() }}
        onCancel={() => setModal(m => ({ ...m, open: false }))}
      />
    </>
  )
}
