'use client'

import { useEffect, useState } from 'react'
import { TopBar } from '@/components/layout/TopBar'
import { api } from '@/lib/api/client'

interface SistemaConfig {
  controle_estoque: boolean
  logo_url: string | null
  logo_url_loja: string | null
  link_loja: string | null
}

export default function ConfigSistemaPage() {
  const [cfg,      setCfg]      = useState<SistemaConfig | null>(null)
  const [loading,  setLoading]  = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [msg,      setMsg]      = useState('')

  const [controleEstoque, setControleEstoque] = useState(true)
  const [logoUrl,         setLogoUrl]         = useState('')

  useEffect(() => {
    api.get<SistemaConfig>('/dados-loja/sistema').then(r => {
      setCfg(r.data)
      setControleEstoque(r.data.controle_estoque)
      setLogoUrl(r.data.logo_url_loja ?? '')
    }).finally(() => setLoading(false))
  }, [])

  async function handleSalvar() {
    setSalvando(true); setMsg('')
    try {
      await api.put('/dados-loja/sistema', {
        controle_estoque: controleEstoque,
        logo_url: logoUrl || null,
      })
      setMsg('Configurações salvas.')
    } catch { setMsg('Erro ao salvar.') }
    finally { setSalvando(false) }
  }

  if (loading) return <><TopBar title="Configurações do Sistema" /><div className="flex justify-center py-16"><div className="w-8 h-8 border-2 border-electric-cyan border-t-transparent rounded-full animate-spin" /></div></>

  return (
    <>
      <TopBar title="Configurações do Sistema" />
      <main className="flex-1 overflow-y-auto p-4 md:p-6 pb-10">
        <div className="max-w-lg flex flex-col gap-5">

          {/* Logo */}
          <section className="bg-deep-ocean border border-ocean-depth rounded-2xl p-5 flex flex-col gap-4">
            <h3 className="text-sea-foam font-semibold text-xs uppercase tracking-wider">Logo da Loja</h3>
            <p className="text-steel text-xs">
              Quando configurada, a logo da loja aparece no topo do sistema no lugar do logotipo ARKEflow.
              ARKEflow fica discreto no rodapé da sidebar.
            </p>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-steel uppercase tracking-wider">URL da logo (PNG ou SVG)</label>
              <input value={logoUrl} onChange={e => setLogoUrl(e.target.value)}
                placeholder="https://..."
                className="min-h-[48px] bg-midnight border border-ocean-depth rounded-xl px-4 text-sm text-sea-foam placeholder-steel outline-none focus:border-electric-cyan" />
              <p className="text-steel text-xs">Upload direto em breve. Por enquanto, cole a URL da imagem.</p>
            </div>
            {logoUrl && (
              <div className="flex items-center gap-3 bg-midnight rounded-xl p-3">
                <img src={logoUrl} alt="Logo" className="h-10 object-contain" onError={e => (e.currentTarget.style.display = 'none')} />
                <p className="text-steel text-xs">Preview da logo</p>
              </div>
            )}
          </section>

          {/* Estoque */}
          <section className="bg-deep-ocean border border-ocean-depth rounded-2xl p-5 flex flex-col gap-4">
            <h3 className="text-sea-foam font-semibold text-xs uppercase tracking-wider">Estoque</h3>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sea-foam text-sm font-medium">Controle de estoque global</p>
                <p className="text-steel text-xs mt-1">
                  Desativado: nenhum produto controla quantidade — útil para lojas sem inventário.
                  Produtos individuais ainda podem sobrescrever.
                </p>
              </div>
              <button type="button" onClick={() => setControleEstoque(v => !v)}
                className={`w-12 h-6 rounded-full transition-colors relative shrink-0 mt-1 ${controleEstoque ? 'bg-electric-cyan' : 'bg-ocean-depth'}`}>
                <span className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${controleEstoque ? 'left-7' : 'left-1'}`} />
              </button>
            </div>
            {!controleEstoque && (
              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl px-4 py-3">
                <p className="text-yellow-400 text-xs">⚠️ Com estoque desativado, alertas e validações de quantidade ficam desabilitados.</p>
              </div>
            )}
          </section>

          {/* Futuro */}
          <section className="bg-deep-ocean border border-ocean-depth/50 rounded-2xl p-5 opacity-50">
            <h3 className="text-steel font-semibold text-xs uppercase tracking-wider mb-2">Em breve</h3>
            <div className="flex flex-col gap-2 text-steel text-sm">
              <p>🎨 Personalização de cores e tema</p>
              <p>🌐 Domínio personalizado</p>
              <p>📱 Configurações do portal do cliente</p>
              <p>🏢 Configurações de filiais</p>
            </div>
          </section>

          {msg && <p className={`text-sm text-center ${msg.includes('salvas') ? 'text-mint-green' : 'text-red-400'}`}>{msg}</p>}

          <button onClick={handleSalvar} disabled={salvando}
            className="min-h-[52px] bg-electric-cyan text-midnight rounded-2xl text-sm font-bold disabled:opacity-40">
            {salvando ? 'Salvando...' : 'Salvar Configurações'}
          </button>

        </div>
      </main>
    </>
  )
}
