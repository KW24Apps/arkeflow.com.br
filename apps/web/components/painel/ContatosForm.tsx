'use client'

import { useState } from 'react'

export interface Contato {
  id?: string
  tipo: 'comercial' | 'financeiro' | 'socio'
  nome: string
  telefone?: string | null
  email?: string | null
}

const TIPOS: { value: Contato['tipo']; label: string }[] = [
  { value: 'comercial',  label: 'Comercial' },
  { value: 'financeiro', label: 'Financeiro' },
  { value: 'socio',      label: 'Sócio/Rep.' },
]

const INPUT_STYLE: React.CSSProperties = {
  background: 'rgba(8,18,30,0.5)',
  border: '0.5px solid rgba(255,255,255,0.12)',
  borderRadius: '8px',
  padding: '9px 12px',
  fontSize: '13px',
  color: 'rgba(255,255,255,0.75)',
  width: '100%',
  outline: 'none',
}

function GInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      style={{ ...INPUT_STYLE, ...props.style }}
      onFocus={e => { e.currentTarget.style.borderColor = 'rgba(0,239,255,0.4)'; props.onFocus?.(e) }}
      onBlur={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'; props.onBlur?.(e) }}
    />
  )
}

function Lbl({ children }: { children: React.ReactNode }) {
  return (
    <label style={{ display: 'block', fontSize: '9px', textTransform: 'uppercase' as const, letterSpacing: '0.1em', color: 'rgba(255,255,255,0.35)', marginBottom: '4px' }}>
      {children}
    </label>
  )
}

interface Props {
  contatos: Contato[]
  onAdd: (c: Omit<Contato, 'id'>) => Promise<void>
  onRemove: (id: string) => Promise<void>
  onUpdate?: (id: string, c: Omit<Contato, 'id'>) => Promise<void>
  salvando?: boolean
}

export function ContatosForm({ contatos, onAdd, onRemove, onUpdate }: Props) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [tipo,      setTipo]      = useState<Contato['tipo']>('comercial')
  const [nome,      setNome]      = useState('')
  const [telefone,  setTelefone]  = useState('')
  const [email,     setEmail]     = useState('')
  const [busy,      setBusy]      = useState(false)

  const isAdding = editingId === '__new__'

  function openAdd() {
    setEditingId('__new__')
    setTipo('comercial')
    setNome(''); setTelefone(''); setEmail('')
  }

  function openEdit(c: Contato) {
    if (!c.id) return
    if (editingId === c.id) { closeForm(); return }
    setEditingId(c.id)
    setTipo(c.tipo)
    setNome(c.nome)
    setTelefone(c.telefone ?? '')
    setEmail(c.email ?? '')
  }

  function closeForm() {
    setEditingId(null)
    setNome(''); setTelefone(''); setEmail('')
  }

  async function handleAdd() {
    if (!nome.trim()) return
    setBusy(true)
    try {
      await onAdd({ tipo, nome, telefone: telefone || null, email: email || null })
      closeForm()
    } finally { setBusy(false) }
  }

  async function handleSave() {
    if (!editingId || isAdding || !onUpdate || !nome.trim()) return
    setBusy(true)
    try {
      await onUpdate(editingId, { tipo, nome, telefone: telefone || null, email: email || null })
      closeForm()
    } finally { setBusy(false) }
  }

  async function handleRemove() {
    if (!editingId || isAdding) return
    setBusy(true)
    try {
      await onRemove(editingId)
      closeForm()
    } finally { setBusy(false) }
  }

  const porTipo: Record<Contato['tipo'], Contato[]> = {
    comercial:  contatos.filter(c => c.tipo === 'comercial'),
    financeiro: contatos.filter(c => c.tipo === 'financeiro'),
    socio:      contatos.filter(c => c.tipo === 'socio'),
  }

  function InlineForm({ mode }: { mode: 'add' | 'edit' }) {
    return (
      <div style={{ background: 'rgba(8,18,30,0.5)', border: '0.5px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '14px', marginTop: '10px' }}>

        {/* Type pill tabs */}
        <div style={{ background: 'rgba(8,18,30,0.4)', borderRadius: '8px', padding: '3px', display: 'flex', gap: '2px', marginBottom: '12px' }}>
          {TIPOS.map(t => (
            <button
              key={t.value}
              type="button"
              onClick={() => setTipo(t.value)}
              style={{
                flex: 1,
                padding: '6px 8px',
                fontSize: '12px',
                borderRadius: '6px',
                border: 'none',
                cursor: 'pointer',
                background: tipo === t.value ? 'rgba(0,239,255,0.15)' : 'transparent',
                color: tipo === t.value ? '#0ef' : 'rgba(255,255,255,0.4)',
                fontWeight: tipo === t.value ? 500 : 400,
                transition: 'all 0.15s',
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Nome */}
        <div style={{ marginBottom: '10px' }}>
          <Lbl>Nome *</Lbl>
          <GInput value={nome} onChange={e => setNome(e.target.value)} placeholder="Nome do contato" />
        </div>

        {/* Telefone + E-mail */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
          <div>
            <Lbl>Telefone</Lbl>
            <GInput type="tel" value={telefone} onChange={e => setTelefone(e.target.value)} placeholder="(00) 00000-0000" />
          </div>
          <div>
            <Lbl>E-mail</Lbl>
            <GInput type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="email@ex.com" />
          </div>
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', gap: '8px' }}>
          {mode === 'edit' ? (
            <>
              <button
                type="button"
                onClick={handleRemove}
                disabled={busy}
                style={{ flex: 1, minHeight: '40px', background: 'rgba(240,100,100,0.08)', border: '0.5px solid rgba(240,100,100,0.25)', borderRadius: '8px', color: 'rgba(240,130,130,0.75)', fontSize: '13px', cursor: 'pointer', opacity: busy ? 0.4 : 1 }}
              >
                Remover
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={busy || !nome.trim() || !onUpdate}
                style={{ flex: 2, minHeight: '40px', background: 'rgba(0,239,255,0.85)', borderRadius: '8px', color: '#0a0a1a', fontSize: '13px', fontWeight: 600, border: 'none', cursor: 'pointer', opacity: busy || !nome.trim() || !onUpdate ? 0.4 : 1 }}
              >
                {busy ? 'Salvando...' : 'Salvar'}
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={closeForm}
                style={{ background: 'rgba(255,255,255,0.06)', border: '0.5px solid rgba(255,255,255,0.12)', borderRadius: '8px', color: 'rgba(255,255,255,0.5)', fontSize: '13px', padding: '0 20px', minHeight: '40px', cursor: 'pointer' }}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleAdd}
                disabled={busy || !nome.trim()}
                style={{ flex: 2, minHeight: '40px', background: 'rgba(0,239,255,0.85)', borderRadius: '8px', color: '#0a0a1a', fontSize: '13px', fontWeight: 600, border: 'none', cursor: 'pointer', opacity: busy || !nome.trim() ? 0.4 : 1 }}
              >
                {busy ? 'Adicionando...' : 'Adicionar'}
              </button>
            </>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-1">

      {TIPOS.map((t, idx) => {
        const lista = porTipo[t.value]
        return (
          <div key={t.value}>
            {idx > 0 && (
              <div style={{ borderTop: '0.5px solid rgba(255,255,255,0.06)', margin: '8px 0' }} />
            )}

            <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px' }}>
              {t.label}
            </p>

            {lista.length === 0 ? (
              <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.2)' }}>Nenhum contato</p>
            ) : (
              <div className="flex flex-col gap-2">
                {lista.map(c => (
                  <div key={c.id}>
                    <ContactRow
                      contato={c}
                      active={editingId === c.id}
                      onClick={() => openEdit(c)}
                    />
                    {editingId === c.id && <InlineForm mode="edit" />}
                  </div>
                ))}
              </div>
            )}
          </div>
        )
      })}

      {/* Add form or button */}
      {isAdding ? (
        <div style={{ marginTop: '4px' }}>
          <InlineForm mode="add" />
        </div>
      ) : (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '4px' }}>
          <button
            type="button"
            onClick={openAdd}
            style={{ fontSize: '12px', color: 'rgba(0,239,255,0.65)', background: 'none', border: 'none', cursor: 'pointer', padding: '4px 0' }}
          >
            + Adicionar contato
          </button>
        </div>
      )}

    </div>
  )
}

function ContactRow({ contato, active, onClick }: { contato: Contato; active: boolean; onClick: () => void }) {
  const [hovered, setHovered] = useState(false)
  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: active ? 'rgba(0,239,255,0.06)' : 'rgba(8,18,30,0.35)',
        border: `0.5px solid ${active ? 'rgba(0,239,255,0.2)' : hovered ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.07)'}`,
        borderRadius: '8px',
        padding: '10px 12px',
        width: '100%',
        textAlign: 'left',
        cursor: 'pointer',
        transition: 'border-color 0.15s',
      }}
    >
      <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.75)', fontWeight: 500, margin: 0 }}>{contato.nome}</p>
      {contato.telefone && <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)', marginTop: '2px', marginBottom: 0 }}>{contato.telefone}</p>}
      {contato.email    && <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)', marginTop: '1px', marginBottom: 0 }}>{contato.email}</p>}
    </button>
  )
}
