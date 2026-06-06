'use client'

import { useEffect, useState } from 'react'
import { TopBar } from '@/components/layout/TopBar'
import { SeletorPermissoes } from '@/components/painel/SeletorPermissoes'
import { api } from '@/lib/api/client'

interface Modelo {
  id: string
  nome: string
  permissoes: string[]
}

export default function ModelosPermissaoPage() {
  const [modelos,    setModelos]    = useState<Modelo[]>([])
  const [loading,    setLoading]    = useState(true)
  const [formAberto, setFormAberto] = useState(false)
  const [editandoId, setEditandoId] = useState<string | null>(null)
  const [salvando,   setSalvando]   = useState(false)
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
    if (!confirm('Remover este modelo? Os colaboradores vinculados perderão as permissões.')) return
    await api.delete(`/modelos-permissao/${id}`)
    setModelos(m => m.filter(x => x.id !== id))
  }

  return (
    <>
      <TopBar />
      <main className="flex-1 overflow-y-auto p-4 md:p-6 pb-10">
        <div className="max-w-lg flex flex-col gap-4">

          <p className="text-steel text-sm">
            Crie modelos de acesso (ex: "Caixa", "Estoque") e vincule aos colaboradores.
            Um colaborador pode usar um modelo ou ter permissões individuais.
          </p>

          {/* Formulário */}
          {formAberto && (
            <div className="bg-deep-ocean border border-electric-cyan/30 rounded-2xl p-5 flex flex-col gap-4">
              <p className="text-sea-foam font-semibold text-sm">{editandoId ? 'Editar modelo' : 'Novo modelo'}</p>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-steel uppercase tracking-wider">Nome do modelo</label>
                <input value={nome} onChange={e => setNome(e.target.value)} placeholder="Ex: Caixa, Estoque, Gerente..."
                  className="min-h-[48px] bg-midnight border border-ocean-depth rounded-xl px-4 text-sm text-sea-foam outline-none focus:border-electric-cyan" />
              </div>

              <SeletorPermissoes value={permissoes} onChange={setPermissoes} />

              <div className="flex gap-3">
                <button onClick={() => setFormAberto(false)}
                  className="flex-1 min-h-[48px] border border-ocean-depth text-steel rounded-xl text-sm">
                  Cancelar
                </button>
                <button onClick={handleSalvar} disabled={salvando || !nome}
                  className="flex-1 min-h-[48px] bg-electric-cyan text-midnight rounded-xl text-sm font-semibold disabled:opacity-40">
                  {salvando ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </div>
          )}

          {/* Lista */}
          {loading ? (
            <div className="flex justify-center py-8"><div className="w-6 h-6 border-2 border-electric-cyan border-t-transparent rounded-full animate-spin" /></div>
          ) : (
            <div className="flex flex-col gap-2">
              {modelos.map(m => (
                <div key={m.id} className="bg-deep-ocean border border-ocean-depth rounded-2xl px-5 py-4 flex items-center justify-between">
                  <div>
                    <p className="text-sea-foam font-medium text-sm">{m.nome}</p>
                    <p className="text-steel text-xs mt-0.5">{m.permissoes.length} menu(s) liberado(s)</p>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {m.permissoes.map(p => (
                        <span key={p} className="bg-ocean-depth text-teal-current text-[10px] px-2 py-0.5 rounded-full">{p}</span>
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-1 ml-3 shrink-0">
                    <button onClick={() => abrirEdicao(m)}
                      className="min-h-[40px] min-w-[40px] text-steel hover:text-electric-cyan rounded-lg hover:bg-ocean-depth transition-colors flex items-center justify-center">✏️</button>
                    <button onClick={() => handleRemover(m.id)}
                      className="min-h-[40px] min-w-[40px] text-steel hover:text-red-400 rounded-lg hover:bg-ocean-depth transition-colors flex items-center justify-center">🗑️</button>
                  </div>
                </div>
              ))}
              {modelos.length === 0 && <p className="text-center text-steel text-sm py-6">Nenhum modelo cadastrado</p>}
            </div>
          )}

          {!formAberto && (
            <button onClick={abrirNovo}
              className="min-h-[52px] bg-electric-cyan text-midnight rounded-2xl text-sm font-semibold">
              + Novo Modelo de Permissão
            </button>
          )}
        </div>
      </main>
    </>
  )
}
