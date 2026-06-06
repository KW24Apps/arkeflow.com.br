'use client'

import { useEffect, useRef, useState } from 'react'
import { TopBar } from '@/components/layout/TopBar'
import { api } from '@/lib/api/client'

interface SistemaConfig {
  controle_estoque: boolean
  logo_url_loja: string | null
}

async function resizeImage(file: File, maxW = 400, maxH = 200): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      const ratio = Math.min(maxW / img.width, maxH / img.height, 1)
      const canvas = document.createElement('canvas')
      canvas.width  = Math.round(img.width  * ratio)
      canvas.height = Math.round(img.height * ratio)
      const ctx = canvas.getContext('2d')!
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      canvas.toBlob(blob => blob ? resolve(blob) : reject('Falha ao processar imagem'), 'image/webp', 0.9)
    }
    img.onerror = reject
    img.src = URL.createObjectURL(file)
  })
}

// ── Glass constants ───────────────────────────────────────────────────────────

const CARD: React.CSSProperties = {
  background: 'rgba(8,18,30,0.48)',
  backdropFilter: 'blur(8px)',
  border: '0.5px solid rgba(255,255,255,0.09)',
  borderRadius: '10px',
  padding: '16px',
}

export default function ConfigSistemaPage() {
  const fileRef = useRef<HTMLInputElement>(null)

  const [cfg,          setCfg]          = useState<SistemaConfig | null>(null)
  const [loading,      setLoading]      = useState(true)
  const [enviandoLogo, setEnviandoLogo] = useState(false)
  const [logoMsg,      setLogoMsg]      = useState('')
  const [toggleSaved,  setToggleSaved]  = useState(false)

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
    setPreview(URL.createObjectURL(file))
    setEnviandoLogo(true); setLogoMsg('')
    try {
      const blob    = await resizeImage(file)
      const form    = new FormData()
      form.append('file', blob, 'logo.webp')
      const { data } = await api.post<{ logo_url: string }>('/dados-loja/logo', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      setPreview(data.logo_url)
      setLogoMsg('Logo enviada com sucesso.')
    } catch {
      setLogoMsg('Erro ao enviar logo.')
      setPreview(cfg?.logo_url_loja ?? null)
    } finally {
      setEnviandoLogo(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  async function handleToggleEstoque() {
    const novoValor = !controleEstoque
    setControleEstoque(novoValor)
    try {
      await api.put('/dados-loja/sistema', { controle_estoque: novoValor })
      setToggleSaved(true)
      setTimeout(() => setToggleSaved(false), 2000)
    } catch { setControleEstoque(!novoValor) }
  }

  if (loading) return (
    <><TopBar /><div className="flex justify-center py-16"><div className="w-8 h-8 border-2 border-electric-cyan border-t-transparent rounded-full animate-spin" /></div></>
  )

  return (
    <>
      <TopBar />
      <main className="flex-1 overflow-y-auto p-4 md:p-5 pb-10">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-start">

          {/* ── LEFT: Logo ──────────────────────────────────────────── */}
          <div style={CARD} className="flex flex-col gap-4">
            <p style={{ fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.3)' }}>Logo da Loja</p>
            <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.25)' }}>
              Quando configurada, substitui o logotipo ARKEflow. Formatos: PNG, JPG, SVG, WebP. Redimensionada para 400×200px.
            </p>

            {/* Preview centered */}
            <div className="flex flex-col items-center gap-3">
              <div
                className="flex items-center justify-center overflow-hidden"
                style={{ width: '100%', height: '80px', background: 'rgba(255,255,255,0.03)', border: '0.5px solid rgba(255,255,255,0.07)', borderRadius: '8px' }}
              >
                {preview ? (
                  <img
                    src={preview.startsWith('blob:') ? preview : preview + '?t=' + Date.now()}
                    alt="Logo da loja"
                    style={{ maxHeight: '80px', maxWidth: '100%', objectFit: 'contain', mixBlendMode: 'screen' }}
                    onError={() => setPreview(null)}
                  />
                ) : (
                  <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.2)' }}>Sem logo</span>
                )}
              </div>

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
                className="w-full min-h-[40px] disabled:opacity-40 transition-opacity"
                style={{ background: 'rgba(0,239,255,0.2)', border: '0.5px solid rgba(0,239,255,0.4)', color: '#0ef', borderRadius: '8px', fontSize: '13px', fontWeight: 500 }}
              >
                {enviandoLogo ? 'Enviando...' : preview ? 'Trocar logo' : 'Enviar logo'}
              </button>

              {preview && (
                <button
                  onClick={async () => {
                    await api.put('/dados-loja/sistema', { logo_url: null })
                    setPreview(null); setLogoMsg('Logo removida.')
                  }}
                  style={{ fontSize: '12px', color: 'rgba(240,100,100,0.6)', background: 'none', border: 'none', cursor: 'pointer', padding: '2px 0' }}
                >
                  Remover logo
                </button>
              )}

              {logoMsg && (
                <p style={{ fontSize: '11px', color: logoMsg.includes('sucesso') ? 'rgba(100,220,160,0.85)' : 'rgba(248,113,113,0.85)', textAlign: 'center' }}>
                  {logoMsg}
                </p>
              )}
            </div>
          </div>

          {/* ── RIGHT: Estoque ──────────────────────────────────────── */}
          <div style={CARD} className="flex flex-col gap-4">
            <p style={{ fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.3)' }}>Estoque</p>

            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <p style={{ fontSize: '13px', fontWeight: 500, color: 'rgba(255,255,255,0.75)' }}>Controle de estoque global</p>
                <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', marginTop: '3px' }}>
                  Desativado: nenhum produto controla quantidade. Produtos individuais ainda podem sobrescrever.
                </p>
              </div>
              <div className="flex flex-col items-end gap-1 shrink-0">
                <button
                  type="button"
                  onClick={handleToggleEstoque}
                  className="relative transition-colors"
                  style={{ width: '40px', height: '22px', borderRadius: '9999px', border: 'none', background: controleEstoque ? 'rgba(0,212,212,0.7)' : 'rgba(255,255,255,0.1)' }}
                >
                  <span
                    className="absolute top-[3px] w-[16px] h-[16px] bg-white rounded-full transition-all"
                    style={{ left: controleEstoque ? '21px' : '3px' }}
                  />
                </button>
                {toggleSaved && (
                  <span style={{ fontSize: '10px', color: 'rgba(100,220,160,0.8)' }}>Salvo</span>
                )}
              </div>
            </div>

            {!controleEstoque && (
              <div style={{ background: 'rgba(234,179,8,0.08)', border: '0.5px solid rgba(234,179,8,0.25)', borderRadius: '8px', padding: '10px 12px' }}>
                <p style={{ fontSize: '11px', color: 'rgba(234,179,8,0.8)' }}>⚠️ Alertas e validações de quantidade ficam desabilitados.</p>
              </div>
            )}
          </div>

        </div>
      </main>
    </>
  )
}
