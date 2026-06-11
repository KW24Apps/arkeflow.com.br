'use client'

import { useEffect, useState } from 'react'
import { catalogosApi, type ItemCatalogo, type TipoCatalogo } from '@/lib/api/catalogos'

interface Props {
  tipo:    TipoCatalogo
  titulo:  string
  comCor?: boolean
}

const INPUT_S: React.CSSProperties = {
  background: 'rgba(8,18,30,0.5)',
  border: '0.5px solid rgba(255,255,255,0.12)',
  borderRadius: '8px',
  padding: '8px 12px',
  fontSize: '13px',
  color: 'rgba(255,255,255,0.8)',
  outline: 'none',
  minHeight: '38px',
  width: '100%',
  transition: 'border-color 120ms',
}

const PANEL: React.CSSProperties = {
  background: 'rgba(8,18,30,0.55)',
  backdropFilter: 'blur(12px)',
  border: '0.5px solid rgba(255,255,255,0.09)',
  borderRadius: '12px',
  overflow: 'hidden',
}

const PANEL_HDR: React.CSSProperties = {
  padding: '9px 14px',
  borderBottom: '0.5px solid rgba(255,255,255,0.07)',
  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  fontSize: '9px', color: 'rgba(255,255,255,0.35)',
  textTransform: 'uppercase', letterSpacing: '0.1em',
}

const BTN_CANCEL: React.CSSProperties = {
  minHeight: '34px', padding: '6px 14px', borderRadius: '8px', fontSize: '13px', cursor: 'pointer',
  border: '0.5px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.55)',
  background: 'rgba(255,255,255,0.04)', outline: 'none',
  transition: 'background 120ms, border-color 120ms, box-shadow 120ms',
}

const BTN_PRIMARY: React.CSSProperties = {
  minHeight: '34px', padding: '6px 14px', borderRadius: '8px', fontSize: '13px', cursor: 'pointer',
  background: 'rgba(0,239,255,0.2)', border: '0.5px solid rgba(0,239,255,0.4)', color: '#0ef',
  fontWeight: 500, outline: 'none',
  transition: 'background 120ms, border-color 120ms, box-shadow 120ms',
}

export function CatalogoCRUD({ tipo, titulo, comCor }: Props) {
  const [items,     setItems]     = useState<ItemCatalogo[]>([])
  const [loading,   setLoading]   = useState(true)
  const [saving,    setSaving]    = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [addOpen,   setAddOpen]   = useState(false)

  // Add form
  const [novoNome, setNovoNome] = useState('')
  const [novoHex,  setNovoHex]  = useState('#5588ff')

  // Edit form
  const [editNome,  setEditNome]  = useState('')
  const [editHex,   setEditHex]   = useState('#5588ff')
  const [editSaved, setEditSaved] = useState(false)

  async function load() {
    setLoading(true)
    try { setItems(await catalogosApi.list(tipo)) }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [tipo])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key !== 'Escape') return
      setSelectedId(null)
      setAddOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  function openCard(item: ItemCatalogo) {
    if (selectedId === item.id) { setSelectedId(null); return }
    setSelectedId(item.id)
    setAddOpen(false)
    setEditNome(item.nome)
    setEditHex(item.hex_cor ?? '#5588ff')
    setEditSaved(false)
  }

  function openAdd() {
    const next = !addOpen
    setAddOpen(next)
    setSelectedId(null)
    if (next) { setNovoNome(''); setNovoHex('#5588ff') }
  }

  async function handleAdd() {
    if (!novoNome.trim()) return
    setSaving(true)
    try {
      await catalogosApi.create(tipo, { nome: novoNome.trim(), hex_cor: comCor ? novoHex : undefined })
      setAddOpen(false)
      await load()
    } finally { setSaving(false) }
  }

  async function handleSave() {
    if (!selectedId || !editNome.trim()) return
    setSaving(true)
    try {
      await catalogosApi.update(tipo, selectedId, { nome: editNome.trim(), hex_cor: comCor ? editHex : undefined })
      setItems(prev => prev.map(i =>
        i.id === selectedId ? { ...i, nome: editNome.trim(), hex_cor: comCor ? editHex : i.hex_cor } : i
      ))
      setEditSaved(true)
      setTimeout(() => setEditSaved(false), 2000)
    } finally { setSaving(false) }
  }

  async function handleRemove(id: string) {
    await catalogosApi.remove(tipo, id)
    setItems(prev => prev.filter(i => i.id !== id))
    setSelectedId(null)
  }

  const selectedItem = items.find(i => i.id === selectedId)

  return (
    <div className="flex flex-col gap-4">

      {/* ── Edit panel ───────────────────────────────────────────────────── */}
      {selectedItem && (
        <div style={PANEL}>
          <div style={PANEL_HDR}>
            <span>{selectedItem.nome}</span>
            {editSaved && (
              <span style={{ fontSize: '10px', color: 'rgba(100,220,160,0.8)', textTransform: 'none', letterSpacing: 'normal' }}>
                Salvo
              </span>
            )}
          </div>
          <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              {comCor && (
                <input
                  type="color"
                  value={editHex}
                  onChange={e => setEditHex(e.target.value)}
                  style={{ width: '38px', height: '38px', borderRadius: '8px', border: '0.5px solid rgba(255,255,255,0.15)', cursor: 'pointer', padding: 0, background: 'none', flexShrink: 0 }}
                />
              )}
              <input
                value={editNome}
                onChange={e => setEditNome(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSave()}
                placeholder={`Nome do ${titulo.toLowerCase()}`}
                style={{ ...INPUT_S, flex: 1 }}
                onFocus={e => { e.currentTarget.style.borderColor = 'rgba(0,239,255,0.4)' }}
                onBlur={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)' }}
              />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <button
                onClick={() => handleRemove(selectedId!)}
                style={{ fontSize: '12px', color: 'rgba(248,113,113,0.55)', background: 'none', border: 'none', cursor: 'pointer', padding: '6px 8px', outline: 'none', borderRadius: '6px' }}
                onMouseEnter={e => { e.currentTarget.style.color = 'rgba(248,113,113,0.9)' }}
                onMouseLeave={e => { e.currentTarget.style.color = 'rgba(248,113,113,0.55)' }}
                onFocus={e => { e.currentTarget.style.boxShadow = '0 0 0 2px rgba(240,100,100,0.3)' }}
                onBlur={e => { e.currentTarget.style.boxShadow = 'none' }}
              >
                Remover
              </button>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => setSelectedId(null)}
                  style={BTN_CANCEL}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.10)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.25)'; e.currentTarget.style.color = 'rgba(255,255,255,0.9)' }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'; e.currentTarget.style.color = 'rgba(255,255,255,0.55)' }}
                  onFocus={e => { e.currentTarget.style.boxShadow = '0 0 0 2px rgba(255,255,255,0.25)' }}
                  onBlur={e => { e.currentTarget.style.boxShadow = 'none' }}
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving || !editNome.trim()}
                  style={{ ...BTN_PRIMARY, opacity: saving || !editNome.trim() ? 0.45 : 1 }}
                  onMouseEnter={e => { if (!e.currentTarget.disabled) { e.currentTarget.style.background = 'rgba(0,239,255,0.32)'; e.currentTarget.style.borderColor = 'rgba(0,239,255,0.6)' } }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'rgba(0,239,255,0.2)'; e.currentTarget.style.borderColor = 'rgba(0,239,255,0.4)' }}
                  onFocus={e => { e.currentTarget.style.boxShadow = '0 0 0 2px rgba(0,239,255,0.3)' }}
                  onBlur={e => { e.currentTarget.style.boxShadow = 'none' }}
                >
                  {saving ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Add panel ────────────────────────────────────────────────────── */}
      {addOpen && (
        <div style={PANEL}>
          <div style={PANEL_HDR}>
            <span>Novo {titulo}</span>
          </div>
          <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              {comCor && (
                <input
                  type="color"
                  value={novoHex}
                  onChange={e => setNovoHex(e.target.value)}
                  style={{ width: '38px', height: '38px', borderRadius: '8px', border: '0.5px solid rgba(255,255,255,0.15)', cursor: 'pointer', padding: 0, background: 'none', flexShrink: 0 }}
                />
              )}
              <input
                value={novoNome}
                onChange={e => setNovoNome(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAdd()}
                placeholder={`Nome do ${titulo.toLowerCase()}...`}
                autoFocus
                style={{ ...INPUT_S, flex: 1 }}
                onFocus={e => { e.currentTarget.style.borderColor = 'rgba(0,239,255,0.4)' }}
                onBlur={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)' }}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button
                onClick={() => setAddOpen(false)}
                style={BTN_CANCEL}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.10)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.25)'; e.currentTarget.style.color = 'rgba(255,255,255,0.9)' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'; e.currentTarget.style.color = 'rgba(255,255,255,0.55)' }}
                onFocus={e => { e.currentTarget.style.boxShadow = '0 0 0 2px rgba(255,255,255,0.25)' }}
                onBlur={e => { e.currentTarget.style.boxShadow = 'none' }}
              >
                Cancelar
              </button>
              <button
                onClick={handleAdd}
                disabled={saving || !novoNome.trim()}
                style={{ ...BTN_PRIMARY, opacity: saving || !novoNome.trim() ? 0.45 : 1 }}
                onMouseEnter={e => { if (!e.currentTarget.disabled) { e.currentTarget.style.background = 'rgba(0,239,255,0.32)'; e.currentTarget.style.borderColor = 'rgba(0,239,255,0.6)' } }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(0,239,255,0.2)'; e.currentTarget.style.borderColor = 'rgba(0,239,255,0.4)' }}
                onFocus={e => { e.currentTarget.style.boxShadow = '0 0 0 2px rgba(0,239,255,0.3)' }}
                onBlur={e => { e.currentTarget.style.boxShadow = 'none' }}
              >
                {saving ? 'Salvando...' : 'Adicionar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Card grid ────────────────────────────────────────────────────── */}
      {loading ? (
        <div className="flex justify-center py-8">
          <div className="w-6 h-6 border-2 border-electric-cyan border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '12px' }}>

          {items.map(item => {
            const sel = selectedId === item.id
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => openCard(item)}
                className="flex flex-col items-center justify-center gap-2.5 active:scale-[0.97]"
                style={{
                  padding: '20px 12px',
                  minHeight: '110px',
                  background:   sel ? 'rgba(0,239,255,0.08)' : 'rgba(8,18,30,0.48)',
                  backdropFilter: 'blur(8px)',
                  border:        sel ? '0.5px solid rgba(0,239,255,0.5)' : '0.5px solid rgba(255,255,255,0.08)',
                  boxShadow:     sel ? '0 0 0 1px rgba(0,239,255,0.25)' : 'none',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  outline: 'none',
                  transition: 'background 120ms, border-color 120ms, box-shadow 120ms, transform 100ms',
                }}
                onMouseEnter={e => {
                  if (!sel) {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.04)'
                    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.18)'
                  }
                }}
                onMouseLeave={e => {
                  if (!sel) {
                    e.currentTarget.style.background = 'rgba(8,18,30,0.48)'
                    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'
                  }
                }}
                onFocus={e => { if (!sel) e.currentTarget.style.boxShadow = '0 0 0 2px rgba(0,239,255,0.2)' }}
                onBlur={e => { if (!sel) e.currentTarget.style.boxShadow = 'none' }}
              >
                {comCor && item.hex_cor && (
                  <span style={{
                    display: 'block', width: '32px', height: '32px', borderRadius: '50%',
                    background: item.hex_cor, flexShrink: 0,
                    border: '1.5px solid rgba(255,255,255,0.15)',
                  }} />
                )}
                <span style={{
                  fontSize: '12px', fontWeight: 500, textAlign: 'center', lineHeight: 1.3,
                  color: sel ? '#0ef' : 'rgba(255,255,255,0.65)',
                  wordBreak: 'break-word',
                }}>
                  {item.nome}
                </span>
              </button>
            )
          })}

          {/* "+" add card */}
          <button
            type="button"
            onClick={openAdd}
            className="flex flex-col items-center justify-center gap-2 active:scale-[0.97]"
            style={{
              padding: '20px 12px',
              minHeight: '110px',
              background:   addOpen ? 'rgba(0,239,255,0.06)' : 'transparent',
              border:       addOpen ? '1px dashed rgba(0,239,255,0.4)' : '1px dashed rgba(255,255,255,0.18)',
              borderRadius: '10px',
              cursor: 'pointer',
              outline: 'none',
              transition: 'background 120ms, border-color 120ms, box-shadow 120ms, transform 100ms',
            }}
            onMouseEnter={e => {
              if (!addOpen) {
                e.currentTarget.style.background = 'rgba(255,255,255,0.03)'
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.30)'
              }
            }}
            onMouseLeave={e => {
              if (!addOpen) {
                e.currentTarget.style.background = 'transparent'
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.18)'
              }
            }}
            onFocus={e => { e.currentTarget.style.boxShadow = '0 0 0 2px rgba(0,239,255,0.2)' }}
            onBlur={e => { e.currentTarget.style.boxShadow = 'none' }}
          >
            <span style={{ fontSize: '22px', lineHeight: 1, color: addOpen ? '#0ef' : 'rgba(255,255,255,0.3)' }}>+</span>
            <span style={{ fontSize: '11px', color: addOpen ? 'rgba(0,239,255,0.7)' : 'rgba(255,255,255,0.3)', textAlign: 'center' }}>
              Novo {titulo}
            </span>
          </button>

        </div>
      )}

    </div>
  )
}
