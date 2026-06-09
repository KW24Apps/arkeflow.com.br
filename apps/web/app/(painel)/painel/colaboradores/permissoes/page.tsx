'use client'

import { useEffect, useState } from 'react'
import { TopBar } from '@/components/layout/TopBar'
import { ConfirmModal } from '@/components/ui/ConfirmModal'
import { SeletorPermissoes } from '@/components/painel/SeletorPermissoes'
import { api } from '@/lib/api/client'

interface Modelo {
  id: string
  nome: string
  permissoes: string[]
}

const CARD = {
  background: 'rgba(8,18,30,0.48)',
  backdropFilter: 'blur(8px)',
  border: '0.5px solid rgba(255,255,255,0.09)',
  borderRadius: '10px',
}

const INPUT_STYLE = {
  background: 'rgba(8,18,30,0.5)',
  border: '0.5px solid rgba(255,255,255,0.12)',
  color: 'rgba(255,255,255,0.8)',
  borderRadius: '8px',
}

function focusIn(e: React.FocusEvent<HTMLInputElement>) {
  e.currentTarget.style.borderColor = 'rgba(0,239,255,0.4)'
}
function focusOut(e: React.FocusEvent<HTMLInputElement>) {
  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'
}

export default function ModelosPermissaoPage() {
  const [modelos,    setModelos]    = useState<Modelo[]>([])
  const [loading,    setLoading]    = useState(true)
  const [formAberto, setFormAberto] = useState(false)
  const [editandoId, setEditandoId] = useState<string | null>(null)
  const [salvando,   setSalvando]   = useState(false)
  const [modal, setModal] = useState<{ open: boolean; onConfirm: () => void }>({ open: false, onConfirm: () => {} })
  const [nome,       setNome]       = useState('')
  const [permissoes, setPermissoes] = useState<string[]>([])

  async function load() {
    setLoading(true)
    try { setModelos(await api.get<Modelo[]>('/modelos-permissao').then(r => r.data)) }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  function abrirNovo() {
    setNome(''); setPermissoes([]); setEditandoId(null); setFormAberto(true)
  }

  function abrirEdicao(m: Modelo) {
    setNome(m.nome); setPermissoes(m.permissoes); setEditandoId(m.id); setFormAberto(true)
  }

  async function handleSalvar() {
    if (!nome) return
    setSalvando(true)
    try {
      if (editandoId) {
        await api.put(`/modelos-permissao/${editandoId}`, { nome, permissoes })
      } else {
        await api.post('/modelos-permissao', { nome, permissoes })
      }
      await load(); setFormAberto(false)
    } finally { setSalvando(false) }
  }

  async function handleRemover(id: string) {
    setModal({
      open: true,
      onConfirm: async () => {
        await api.delete(`/modelos-permissao/${id}`)
        setModelos(m => m.filter(x => x.id !== id))
        setFormAberto(false)
      },
    })
  }

  const isEditing = formAberto && editandoId !== null

  return (
    <>
      <TopBar />
      <main className="flex-1 overflow-y-auto p-4 md:p-5 pb-20 flex flex-col gap-4">

        <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)' }}>
          Crie modelos de acesso (ex: "Caixa", "Estoque") e vincule aos colaboradores.
          Um colaborador pode usar um modelo ou ter permissões individuais.
        </p>

        {/* ── Edit panel — above the grid ──────────────────────────────────── */}
        {formAberto && (
          <div style={CARD} className="p-5 flex flex-col gap-4">
            <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.7)', fontWeight: 600 }}>
              {editandoId ? 'Editar modelo' : 'Novo modelo'}
            </p>

            <div className="flex flex-col gap-1.5">
              <label style={{ fontSize: '10px', color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                Nome do modelo
              </label>
              <input
                value={nome} onChange={e => setNome(e.target.value)}
                placeholder="Ex: Caixa, Estoque, Gerente..."
                onFocus={focusIn} onBlur={focusOut}
                className="min-h-[48px] px-4 outline-none w-full"
                style={INPUT_STYLE}
              />
            </div>

            <SeletorPermissoes value={permissoes} onChange={setPermissoes} />

            <div className="flex items-center justify-between gap-3">
              {editandoId ? (
                <button
                  onClick={() => handleRemover(editandoId)}
                  className="min-h-[40px] px-2 transition-colors"
                  style={{ fontSize: '12px', color: 'rgba(248,113,113,0.5)' }}
                  onMouseEnter={e => (e.currentTarget.style.color = 'rgba(248,113,113,0.85)')}
                  onMouseLeave={e => (e.currentTarget.style.color = 'rgba(248,113,113,0.5)')}
                >
                  Remover
                </button>
              ) : <span />}
              <div className="flex gap-3">
                <button
                  onClick={() => setFormAberto(false)}
                  className="min-h-[40px] px-5 rounded-lg text-sm transition-colors"
                  style={{ border: '0.5px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.4)', borderRadius: '8px' }}
                  onMouseEnter={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.7)')}
                  onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.4)')}
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSalvar}
                  disabled={salvando || !nome}
                  className="min-h-[40px] px-5 text-sm font-semibold rounded-lg disabled:opacity-40"
                  style={{ background: 'rgba(0,239,255,0.2)', border: '0.5px solid rgba(0,239,255,0.4)', color: '#0ef', borderRadius: '8px' }}
                >
                  {salvando ? 'Salvando...' : 'Salvar'}
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
        ) : modelos.length === 0 ? (
          <p className="text-center py-12" style={{ fontSize: '13px', color: 'rgba(255,255,255,0.25)' }}>
            Nenhum modelo cadastrado
          </p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '10px' }}>
            {modelos.map(m => {
              const isSelected = isEditing && m.id === editandoId
              const cardOpacity = isSelected ? 1 : isEditing ? 0.4 : 1
              return (
              <div
                key={m.id}
                onClick={() => abrirEdicao(m)}
                className="p-4 flex flex-col gap-2.5 cursor-pointer active:scale-[0.98] transition-all"
                style={{ ...CARD, opacity: cardOpacity, ...(isSelected && { background: 'rgba(0,239,255,0.06)', border: '1px solid rgba(0,239,255,0.5)' }) }}
                onMouseEnter={e => { if (!isSelected) e.currentTarget.style.borderColor = 'rgba(255,255,255,0.18)' }}
                onMouseLeave={e => { if (!isSelected) e.currentTarget.style.borderColor = 'rgba(255,255,255,0.09)' }}
              >
                <p style={{ color: 'rgba(255,255,255,0.85)', fontWeight: 500, fontSize: '14px' }}>
                  {m.nome}
                </p>
                <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '11px' }}>
                  {m.permissoes.length} {m.permissoes.length !== 1 ? 'permissões ativas' : 'permissão ativa'}
                </p>
                {m.permissoes.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {m.permissoes.slice(0, 4).map(p => (
                      <span
                        key={p}
                        className="truncate max-w-[120px]"
                        style={{
                          background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.3)',
                          fontSize: '9px', padding: '2px 7px', borderRadius: '9999px',
                        }}
                      >
                        {p}
                      </span>
                    ))}
                    {m.permissoes.length > 4 && (
                      <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: '9px', padding: '2px 4px' }}>
                        +{m.permissoes.length - 4}
                      </span>
                    )}
                  </div>
                )}
              </div>
              )
            })}
          </div>
        )}

        {/* FAB — new model */}
        <button
          onClick={abrirNovo}
          className="fixed bottom-6 right-6 flex items-center justify-center shadow-lg active:scale-95 transition-transform"
          style={{
            width: '48px', height: '48px',
            background: 'rgba(0,239,255,0.9)',
            borderRadius: '50%',
            color: '#0a1e2a',
            fontSize: '24px', fontWeight: 700,
          }}
        >
          +
        </button>
      </main>
      <ConfirmModal
        isOpen={modal.open}
        title="Remover modelo de permissão"
        message="Os colaboradores vinculados perderão as permissões deste modelo."
        confirmLabel="Remover"
        confirmStyle="danger"
        onConfirm={() => { setModal(m => ({ ...m, open: false })); modal.onConfirm() }}
        onCancel={() => setModal(m => ({ ...m, open: false }))}
      />
    </>
  )
}
