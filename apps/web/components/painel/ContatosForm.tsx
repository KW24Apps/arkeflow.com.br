'use client'

import { useState } from 'react'
import { Input } from '@/components/ui/Input'

export interface Contato {
  id?: string
  tipo: 'comercial' | 'financeiro' | 'socio'
  nome: string
  telefone?: string | null
  email?: string | null
}

const TIPO_LABEL = {
  comercial:  { label: 'Comercial',   icon: '💼', cor: 'text-electric-cyan' },
  financeiro: { label: 'Financeiro',  icon: '💰', cor: 'text-mint-green' },
  socio:      { label: 'Sócio/Rep.',  icon: '👤', cor: 'text-teal-current' },
}

interface Props {
  contatos:  Contato[]
  onAdd:     (c: Omit<Contato, 'id'>) => Promise<void>
  onRemove:  (id: string) => Promise<void>
  salvando?: boolean
}

export function ContatosForm({ contatos, onAdd, onRemove, salvando }: Props) {
  const [formAberto, setFormAberto] = useState(false)
  const [tipo,       setTipo]       = useState<Contato['tipo']>('comercial')
  const [nome,       setNome]       = useState('')
  const [telefone,   setTelefone]   = useState('')
  const [email,      setEmail]      = useState('')
  const [adding,     setAdding]     = useState(false)

  async function handleAdd() {
    if (!nome.trim()) return
    setAdding(true)
    try {
      await onAdd({ tipo, nome, telefone: telefone || null, email: email || null })
      setNome(''); setTelefone(''); setEmail('')
      setFormAberto(false)
    } finally { setAdding(false) }
  }

  const porTipo = {
    comercial:  contatos.filter(c => c.tipo === 'comercial'),
    financeiro: contatos.filter(c => c.tipo === 'financeiro'),
    socio:      contatos.filter(c => c.tipo === 'socio'),
  }

  return (
    <div className="flex flex-col gap-4">

      {/* Contatos agrupados por tipo */}
      {(Object.entries(porTipo) as [Contato['tipo'], Contato[]][]).map(([t, lista]) => (
        <div key={t}>
          <p className={`text-xs font-semibold uppercase tracking-wider mb-2 ${TIPO_LABEL[t].cor}`}>
            {TIPO_LABEL[t].icon} {TIPO_LABEL[t].label}
          </p>
          {lista.length === 0 ? (
            <p className="text-steel text-xs px-1">Nenhum contato cadastrado</p>
          ) : (
            <div className="flex flex-col gap-2">
              {lista.map(c => (
                <div key={c.id} className="flex items-start justify-between bg-midnight rounded-xl px-4 py-3 gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sea-foam text-sm font-medium">{c.nome}</p>
                    {c.telefone && <p className="text-steel text-xs">📞 {c.telefone}</p>}
                    {c.email    && <p className="text-steel text-xs">✉️ {c.email}</p>}
                  </div>
                  <button onClick={() => c.id && onRemove(c.id)}
                    className="text-steel hover:text-red-400 text-xl min-h-[40px] min-w-[40px] flex items-center justify-center shrink-0">×</button>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}

      {/* Formulário de novo contato */}
      {formAberto ? (
        <div className="bg-midnight rounded-2xl p-4 flex flex-col gap-3">
          <p className="text-sea-foam text-sm font-medium">Novo contato</p>

          <div className="flex gap-2">
            {(['comercial','financeiro','socio'] as const).map(t => (
              <button key={t} type="button" onClick={() => setTipo(t)}
                className={`flex-1 min-h-[40px] rounded-xl text-xs font-medium border transition-colors ${
                  tipo === t ? 'bg-electric-cyan text-midnight border-electric-cyan' : 'border-ocean-depth text-steel'
                }`}>
                {TIPO_LABEL[t].label}
              </button>
            ))}
          </div>

          <Input label="Nome *" value={nome} onChange={e => setNome(e.target.value)} placeholder="Nome do contato" />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Telefone" type="tel" value={telefone} onChange={e => setTelefone(e.target.value)} placeholder="(00) 00000-0000" />
            <Input label="Email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="email@ex.com" />
          </div>

          <div className="flex gap-3">
            <button onClick={() => { setFormAberto(false); setNome(''); setTelefone(''); setEmail('') }}
              className="flex-1 min-h-[44px] border border-ocean-depth text-steel rounded-xl text-sm">
              Cancelar
            </button>
            <button onClick={handleAdd} disabled={adding || !nome.trim()}
              className="flex-1 min-h-[44px] bg-electric-cyan text-midnight rounded-xl text-sm font-semibold disabled:opacity-40">
              {adding ? 'Adicionando...' : 'Adicionar'}
            </button>
          </div>
        </div>
      ) : (
        <button onClick={() => setFormAberto(true)}
          className="text-xs text-electric-cyan/70 hover:text-electric-cyan self-start min-h-[36px]">
          + Adicionar contato
        </button>
      )}
    </div>
  )
}
