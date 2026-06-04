'use client'

import { useEffect, useRef, useState } from 'react'
import { TopBar } from '@/components/layout/TopBar'
import { api } from '@/lib/api/client'

interface SistemaConfig {
  controle_estoque: boolean
  logo_url_loja: string | null
}

// Redimensiona a imagem no browser antes de enviar (sem Sharp no servidor)
async function resizeImage(file: File, maxW = 400, maxH = 200): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      const ratio = Math.min(maxW / img.width, maxH / img.height, 1)
      const canvas = document.createElement('canvas')
      canvas.width  = Math.round(img.width  * ratio)
      canvas.height = Math.round(img.height * ratio)
      const ctx = canvas.getContext('2d')!
      // Fundo transparente para PNG/WebP
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      canvas.toBlob(blob => blob ? resolve(blob) : reject('Falha ao processar imagem'), 'image/webp', 0.9)
    }
    img.onerror = reject
    img.src = URL.createObjectURL(file)
  })
}

export default function ConfigSistemaPage() {
  const fileRef = useRef<HTMLInputElement>(null)

  const [cfg,           setCfg]           = useState<SistemaConfig | null>(null)
  const [loading,       setLoading]        = useState(true)
  const [salvando,      setSalvando]       = useState(false)
  const [enviandoLogo,  setEnviandoLogo]   = useState(false)
  const [msg,           setMsg]            = useState('')

  const [controleEstoque, setControleEstoque] = useState(true)
  const [preview,         setPreview]         = useState<string | null>(null)

  useEffect(() => {
    api.get<SistemaConfig>('/dados-loja/sistema').then(r => {
      setCfg(r.data)
      setControleEstoque(r.data.controle_estoque)
      if (r.data.logo_url_loja) setPreview(r.data.logo_url_loja)
    }).finally(() => setLoading(false))
  }, [])

  async function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    // Preview imediato no browser
    setPreview(URL.createObjectURL(file))
    setEnviandoLogo(true); setMsg('')
    try {
      // Redimensiona no browser (max 400×200, preserva proporção)
      const blob    = await resizeImage(file)
      const form    = new FormData()
      form.append('file', blob, 'logo.webp')
      const { data } = await api.post<{ logo_url: string }>('/dados-loja/logo', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setPreview(data.logo_url)
      setMsg('Logo enviada com sucesso.')
    } catch {
      setMsg('Erro ao enviar logo.')
      setPreview(cfg?.logo_url_loja ?? null)
    } finally {
      setEnviandoLogo(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  async function handleSalvar() {
    setSalvando(true); setMsg('')
    try {
      await api.put('/dados-loja/sistema', { controle_estoque: controleEstoque })
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
              Quando configurada, substitui o logotipo ARKEflow no topo do sistema.
              Formatos aceitos: PNG, JPG, SVG, WebP. Redimensionada automaticamente para 400×200px.
            </p>

            {/* Preview */}
            <div className="flex items-center gap-4">
              <div className={`w-40 h-16 rounded-xl border flex items-center justify-center overflow-hidden ${
                preview ? 'border-electric-cyan/30 bg-midnight' : 'border-ocean-depth bg-midnight'
              }`}>
                {preview ? (
                  <img
                    src={preview.startsWith('blob:') ? preview : preview + '?t=' + Date.now()}
                    alt="Logo da loja"
                    className="max-w-full max-h-full object-contain p-1"
                    onError={() => setPreview(null)}
                  />
                ) : (
                  <span className="text-steel text-xs text-center px-2">Sem logo</span>
                )}
              </div>
              <div className="flex flex-col gap-2">
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/png,image/jpeg,image/svg+xml,image/webp"
                  className="hidden"
                  onChange={handleLogoChange}
                />
                <button
                  onClick={() => fileRef.current?.click()}
                  disabled={enviandoLogo}
                  className="min-h-[44px] px-5 bg-electric-cyan text-midnight rounded-xl text-sm font-semibold disabled:opacity-40"
                >
                  {enviandoLogo ? 'Enviando...' : preview ? 'Trocar logo' : 'Enviar logo'}
                </button>
                {preview && (
                  <button
                    onClick={async () => {
                      await api.put('/dados-loja/sistema', { logo_url: null })
                      setPreview(null); setMsg('Logo removida.')
                    }}
                    className="text-xs text-red-400 hover:text-red-300 min-h-[36px]"
                  >
                    Remover logo
                  </button>
                )}
              </div>
            </div>
          </section>

          {/* Estoque */}
          <section className="bg-deep-ocean border border-ocean-depth rounded-2xl p-5 flex flex-col gap-4">
            <h3 className="text-sea-foam font-semibold text-xs uppercase tracking-wider">Estoque</h3>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sea-foam text-sm font-medium">Controle de estoque global</p>
                <p className="text-steel text-xs mt-1">
                  Desativado: nenhum produto controla quantidade.
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
                <p className="text-yellow-400 text-xs">⚠️ Alertas e validações de quantidade ficam desabilitados.</p>
              </div>
            )}
          </section>

          {/* Futuro */}
          <section className="bg-deep-ocean border border-ocean-depth/50 rounded-2xl p-5 opacity-50">
            <h3 className="text-steel font-semibold text-xs uppercase tracking-wider mb-2">Em breve</h3>
            <div className="flex flex-col gap-2 text-steel text-sm">
              <p>🎨 Personalização de cores e tema</p>
              <p>🌐 Domínio personalizado</p>
              <p>📱 Portal do cliente</p>
              <p>🏢 Configurações de filiais</p>
            </div>
          </section>

          {msg && <p className={`text-sm text-center ${msg.includes('sucesso') || msg.includes('salvas') ? 'text-mint-green' : 'text-red-400'}`}>{msg}</p>}

          <button onClick={handleSalvar} disabled={salvando}
            className="min-h-[52px] bg-electric-cyan text-midnight rounded-2xl text-sm font-bold disabled:opacity-40">
            {salvando ? 'Salvando...' : 'Salvar Configurações'}
          </button>

        </div>
      </main>
    </>
  )
}
