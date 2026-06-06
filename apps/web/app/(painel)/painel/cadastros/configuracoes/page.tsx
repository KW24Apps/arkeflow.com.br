'use client'

import { useEffect, useState } from 'react'
import { TopBar } from '@/components/layout/TopBar'
import { api } from '@/lib/api/client'

interface Config {
  controle_estoque: boolean
}

export default function ConfiguracoesLojaPage() {
  const [config,   setConfig]   = useState<Config | null>(null)
  const [salvando, setSalvando] = useState(false)
  const [msg,      setMsg]      = useState('')

  useEffect(() => {
    api.get<Config>('/configuracoes-loja').then(r => setConfig(r.data))
  }, [])

  async function handleSalvar() {
    if (!config) return
    setSalvando(true); setMsg('')
    try {
      const { data } = await api.put<Config>('/configuracoes-loja', config)
      setConfig(data); setMsg('Configurações salvas.')
    } catch { setMsg('Erro ao salvar.') }
    finally { setSalvando(false) }
  }

  if (!config) return (
    <>
      <TopBar />
      <div className="flex justify-center py-16"><div className="w-6 h-6 border-2 border-electric-cyan border-t-transparent rounded-full animate-spin" /></div>
    </>
  )

  return (
    <>
      <TopBar />
      <main className="flex-1 overflow-y-auto p-4 md:p-6 pb-10">
        <div className="max-w-lg flex flex-col gap-5">

          <section className="bg-deep-ocean border border-ocean-depth rounded-2xl p-5 flex flex-col gap-4">
            <h3 className="text-sea-foam font-semibold text-xs uppercase tracking-wider">Estoque</h3>

            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sea-foam text-sm font-medium">Controle de estoque global</p>
                <p className="text-steel text-xs mt-1">
                  Quando desativado, nenhum produto controla quantidade — útil para lojas
                  que não trabalham com inventário. Produtos individuais ainda podem
                  sobrescrever essa configuração.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setConfig(c => c ? { ...c, controle_estoque: !c.controle_estoque } : c)}
                className={`w-12 h-6 rounded-full transition-colors relative shrink-0 mt-1 ${
                  config.controle_estoque ? 'bg-electric-cyan' : 'bg-ocean-depth'
                }`}
              >
                <span className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${
                  config.controle_estoque ? 'left-7' : 'left-1'
                }`} />
              </button>
            </div>

            {!config.controle_estoque && (
              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl px-4 py-3">
                <p className="text-yellow-400 text-xs">
                  ⚠️ Com o estoque global desativado, alertas de estoque mínimo e
                  validação de quantidade no PDV ficam desabilitados.
                </p>
              </div>
            )}
          </section>

          {msg && (
            <p className={`text-sm text-center ${msg.includes('salvas') ? 'text-mint-green' : 'text-red-400'}`}>
              {msg}
            </p>
          )}

          <button
            onClick={handleSalvar}
            disabled={salvando}
            className="min-h-[52px] bg-electric-cyan text-midnight rounded-2xl text-sm font-semibold disabled:opacity-40"
          >
            {salvando ? 'Salvando...' : 'Salvar Configurações'}
          </button>
        </div>
      </main>
    </>
  )
}
