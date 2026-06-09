'use client'

import { useEffect, useRef, useState } from 'react'
import { TopBar } from '@/components/layout/TopBar'
import { api } from '@/lib/api/client'
import { CurrencyInput } from '@/components/ui/CurrencyInput'
import { financeiroApi, type FormaPagamento } from '@/lib/api/financeiro'
import { colaboradoresApi, type Colaborador } from '@/lib/api/colaboradores'

interface SistemaConfig {
  controle_estoque: boolean
  logo_url_loja: string | null
  desconto_max_percentual: string | number
  desconto_max_valor: string | number
  promocao_aceita_desconto: boolean
  desconto_restringe_formas: boolean
  supervisao_habilitada:    boolean
  senha_mestra_habilitada:  boolean
  senha_mestra_definida:    boolean
  exige_auth_fechar_falta:  boolean
  exige_auth_fechar_sobra:  boolean
  exige_auth_cancelar_item: boolean
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

const LBL9: React.CSSProperties = {
  fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.3)',
}

const DIV_HR: React.CSSProperties = { height: '0.5px', background: 'rgba(255,255,255,0.07)' }

export default function ConfigSistemaPage() {
  const fileRef = useRef<HTMLInputElement>(null)

  const [cfg,          setCfg]          = useState<SistemaConfig | null>(null)
  const [loading,      setLoading]      = useState(true)
  const [enviandoLogo, setEnviandoLogo] = useState(false)
  const [logoMsg,      setLogoMsg]      = useState('')
  const [toggleSaved,  setToggleSaved]  = useState(false)

  const [controleEstoque, setControleEstoque] = useState(true)
  const [preview,         setPreview]         = useState<string | null>(null)

  const [descontoMaxPct,          setDescontoMaxPct]          = useState(0)
  const [descontoMaxValorCents,   setDescontoMaxValorCents]   = useState(0)
  const [promocaoAceitaDesconto,  setPromocaoAceitaDesconto]  = useState(false)
  const [descontoRestringeFormas, setDescontoRestringeFormas] = useState(false)
  const [formas,                  setFormas]                  = useState<FormaPagamento[]>([])
  const [descontoSaved,           setDescontoSaved]           = useState(false)

  // ── Supervisão state ──────────────────────────────────────────────────────
  const [colaboradores,         setColaboradores]         = useState<Colaborador[]>([])
  const [supervisaoHabilitada,  setSupervisaoHabilitada]  = useState(false)
  const [senhaMestraHabilitada, setSenhaMestraHabilitada] = useState(false)
  const [senhaMestraDefinida,   setSenhaMestraDefinida]   = useState(false)
  const [senhaMestraInput,      setSenhaMestraInput]      = useState('')
  const [senhaMestraSalva,      setSenhaMestraSalva]      = useState(false)
  const [exigeAuthFecharFalta,  setExigeAuthFecharFalta]  = useState(false)
  const [exigeAuthFecharSobra,  setExigeAuthFecharSobra]  = useState(false)
  const [exigeAuthCancelarItem, setExigeAuthCancelarItem] = useState(false)
  const [supervisaoSaved,       setSupervisaoSaved]       = useState(false)
  const [modalSupervisores,     setModalSupervisores]     = useState(false)
  const [supervisoresQ,         setSupervisoresQ]         = useState('')

  useEffect(() => {
    Promise.all([
      api.get<SistemaConfig>('/dados-loja/sistema'),
      financeiroApi.formasPagamento(true),
      colaboradoresApi.list(),
    ]).then(([sysRes, fs, cols]) => {
      const d = sysRes.data
      setCfg(d)
      setControleEstoque(d.controle_estoque)
      if (d.logo_url_loja) setPreview(d.logo_url_loja)
      setDescontoMaxPct(Number(d.desconto_max_percentual ?? 0))
      setDescontoMaxValorCents(Math.round(Number(d.desconto_max_valor ?? 0) * 100))
      setPromocaoAceitaDesconto(d.promocao_aceita_desconto ?? false)
      setDescontoRestringeFormas(d.desconto_restringe_formas ?? false)
      setFormas(fs)
      setColaboradores(cols)
      setSupervisaoHabilitada(d.supervisao_habilitada ?? false)
      setSenhaMestraHabilitada(d.senha_mestra_habilitada ?? false)
      setSenhaMestraDefinida(d.senha_mestra_definida ?? false)
      setExigeAuthFecharFalta(d.exige_auth_fechar_falta ?? false)
      setExigeAuthFecharSobra(d.exige_auth_fechar_sobra ?? false)
      setExigeAuthCancelarItem(d.exige_auth_cancelar_item ?? false)
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

  async function handleSaveDesconto(fields: Record<string, any>) {
    try {
      await api.put('/dados-loja/sistema', fields)
      setDescontoSaved(true)
      setTimeout(() => setDescontoSaved(false), 2000)
    } catch {}
  }

  async function handleTogglePromocao() {
    const novoValor = !promocaoAceitaDesconto
    setPromocaoAceitaDesconto(novoValor)
    try {
      await api.put('/dados-loja/sistema', { promocao_aceita_desconto: novoValor })
      setDescontoSaved(true)
      setTimeout(() => setDescontoSaved(false), 2000)
    } catch { setPromocaoAceitaDesconto(!novoValor) }
  }

  async function handleToggleRestringeFormas() {
    const novoValor = !descontoRestringeFormas
    setDescontoRestringeFormas(novoValor)
    try {
      await api.put('/dados-loja/sistema', { desconto_restringe_formas: novoValor })
      setDescontoSaved(true)
      setTimeout(() => setDescontoSaved(false), 2000)
    } catch { setDescontoRestringeFormas(!novoValor) }
  }

  async function handleToggleFormaDesconto(forma: FormaPagamento) {
    const novoValor = !(forma.aceita_desconto !== false)
    setFormas(prev => prev.map(f => f.id === forma.id ? { ...f, aceita_desconto: novoValor } : f))
    try {
      await financeiroApi.atualizarFormaPagamento(forma.id, { aceita_desconto: novoValor } as any)
    } catch {
      setFormas(prev => prev.map(f => f.id === forma.id ? { ...f, aceita_desconto: forma.aceita_desconto } : f))
    }
  }

  // ── Supervisão handlers ───────────────────────────────────────────────────

  async function handleToggleSupervisao() {
    const v = !supervisaoHabilitada
    setSupervisaoHabilitada(v)
    try {
      await api.put('/dados-loja/sistema', { supervisao_habilitada: v })
      setSupervisaoSaved(true); setTimeout(() => setSupervisaoSaved(false), 2000)
    } catch { setSupervisaoHabilitada(!v) }
  }

  async function handleToggleSenhaMestra() {
    const v = !senhaMestraHabilitada
    setSenhaMestraHabilitada(v)
    try {
      await api.put('/dados-loja/sistema', { senha_mestra_habilitada: v })
      setSupervisaoSaved(true); setTimeout(() => setSupervisaoSaved(false), 2000)
    } catch { setSenhaMestraHabilitada(!v) }
  }

  async function handleSenhaMestraBlur() {
    if (!senhaMestraInput.trim()) return
    try {
      await api.put('/dados-loja/sistema', { senha_mestra: senhaMestraInput })
      setSenhaMestraInput('')
      setSenhaMestraDefinida(true)
      setSenhaMestraSalva(true)
      setTimeout(() => setSenhaMestraSalva(false), 2000)
    } catch {}
  }

  async function handleToggleFecharFalta() {
    const v = !exigeAuthFecharFalta
    setExigeAuthFecharFalta(v)
    try {
      await api.put('/dados-loja/sistema', { exige_auth_fechar_falta: v })
      setSupervisaoSaved(true); setTimeout(() => setSupervisaoSaved(false), 2000)
    } catch { setExigeAuthFecharFalta(!v) }
  }

  async function handleToggleFecharSobra() {
    const v = !exigeAuthFecharSobra
    setExigeAuthFecharSobra(v)
    try {
      await api.put('/dados-loja/sistema', { exige_auth_fechar_sobra: v })
      setSupervisaoSaved(true); setTimeout(() => setSupervisaoSaved(false), 2000)
    } catch { setExigeAuthFecharSobra(!v) }
  }

  async function handleToggleCancelarItem() {
    const v = !exigeAuthCancelarItem
    setExigeAuthCancelarItem(v)
    try {
      await api.put('/dados-loja/sistema', { exige_auth_cancelar_item: v })
      setSupervisaoSaved(true); setTimeout(() => setSupervisaoSaved(false), 2000)
    } catch { setExigeAuthCancelarItem(!v) }
  }

  async function handleToggleSupervisor(col: Colaborador) {
    const novoVal = !(col.is_supervisor ?? false)
    setColaboradores(prev => prev.map(c => c.id === col.id ? { ...c, is_supervisor: novoVal } : c))
    try {
      await colaboradoresApi.setSupervisor(col.id, novoVal)
    } catch {
      setColaboradores(prev => prev.map(c => c.id === col.id ? { ...c, is_supervisor: col.is_supervisor } : c))
    }
  }

  if (loading) return (
    <><TopBar /><div className="flex justify-center py-16"><div className="w-8 h-8 border-2 border-electric-cyan border-t-transparent rounded-full animate-spin" /></div></>
  )

  const supervisores = colaboradores.filter(c => c.is_supervisor)
  const semMetodoAuth = supervisaoHabilitada && !senhaMestraDefinida && supervisores.length === 0

  return (
    <>
      <TopBar />
      <main className="flex-1 overflow-y-auto p-4 md:p-5 pb-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 items-start">

          {/* ── Logo ──────────────────────────────────────────── */}
          <div style={CARD} className="flex flex-col gap-3">
            <p style={{ fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.3)' }}>Logo da Loja</p>
            <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.25)' }}>
              Substitui o logotipo ARKEflow. PNG, JPG, SVG ou WebP — redimensionado para 400×200px.
            </p>

            <div className="flex flex-col items-center gap-2">
              <div
                className="flex items-center justify-center overflow-hidden"
                style={{ width: '100%', height: '52px', background: 'rgba(255,255,255,0.03)', border: '0.5px solid rgba(255,255,255,0.07)', borderRadius: '8px' }}
              >
                {preview ? (
                  <img
                    src={preview.startsWith('blob:') ? preview : preview + '?t=' + Date.now()}
                    alt="Logo da loja"
                    style={{ maxHeight: '52px', maxWidth: '100%', objectFit: 'contain', mixBlendMode: 'screen' }}
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
                className="w-full min-h-[36px] disabled:opacity-40 transition-opacity"
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

          {/* ── Estoque ──────────────────────────────────────────── */}
          <div style={CARD} className="flex flex-col gap-3">
            <p style={{ fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.3)' }}>Estoque</p>

            <div className="flex items-start justify-between gap-3">
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

          {/* ── Desconto ────────────────────────────────────────────── */}
          <div style={CARD} className="flex flex-col gap-3">
            <p style={{ fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.3)' }}>Desconto</p>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label style={{ fontSize: '10px', color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Percentual máximo</label>
                <div className="relative">
                  <input
                    type="number" min="0" max="100" step="0.1"
                    value={descontoMaxPct}
                    onChange={e => setDescontoMaxPct(parseFloat(e.target.value) || 0)}
                    onFocus={e => { e.currentTarget.style.borderColor = 'rgba(0,239,255,0.4)' }}
                    onBlur={e => {
                      e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'
                      handleSaveDesconto({ desconto_max_percentual: descontoMaxPct })
                    }}
                    className="w-full min-h-[38px] px-3 pr-7 outline-none"
                    style={{ background: 'rgba(8,18,30,0.5)', border: '0.5px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.8)', borderRadius: '8px', fontSize: '13px' }}
                  />
                  <span style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', fontSize: '12px', color: 'rgba(255,255,255,0.35)', pointerEvents: 'none' }}>%</span>
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <label style={{ fontSize: '10px', color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Teto em R$</label>
                <CurrencyInput
                  value={descontoMaxValorCents}
                  onChange={setDescontoMaxValorCents}
                  onBlur={() => handleSaveDesconto({ desconto_max_valor: descontoMaxValorCents / 100 })}
                  className="w-full min-h-[38px] px-3 outline-none"
                  style={{ background: 'rgba(8,18,30,0.5)', border: '0.5px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.8)', borderRadius: '8px', fontSize: '13px' }}
                />
              </div>
            </div>

            <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.25)', marginTop: '-4px' }}>
              Trava no primeiro limite atingido. 0 = sem limite.
            </p>

            <div style={{ height: '0.5px', background: 'rgba(255,255,255,0.07)' }} />

            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <p style={{ fontSize: '13px', fontWeight: 500, color: 'rgba(255,255,255,0.75)' }}>Produtos em promoção aceitam desconto adicional</p>
                <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', marginTop: '3px' }}>
                  Desativado: itens já em promoção não recebem o desconto do caixa por cima.
                </p>
              </div>
              <div className="flex flex-col items-end gap-1 shrink-0">
                <button
                  type="button"
                  onClick={handleTogglePromocao}
                  className="relative transition-colors"
                  style={{ width: '40px', height: '22px', borderRadius: '9999px', border: 'none', background: promocaoAceitaDesconto ? 'rgba(0,212,212,0.7)' : 'rgba(255,255,255,0.1)' }}
                >
                  <span
                    className="absolute top-[3px] w-[16px] h-[16px] bg-white rounded-full transition-all"
                    style={{ left: promocaoAceitaDesconto ? '21px' : '3px' }}
                  />
                </button>
                {descontoSaved && (
                  <span style={{ fontSize: '10px', color: 'rgba(100,220,160,0.8)' }}>Salvo</span>
                )}
              </div>
            </div>

            <div style={{ height: '0.5px', background: 'rgba(255,255,255,0.07)' }} />

            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <p style={{ fontSize: '13px', fontWeight: 500, color: 'rgba(255,255,255,0.75)' }}>Restringir formas quando há desconto</p>
                <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', marginTop: '3px' }}>
                  Ativado: somente formas marcadas abaixo ficam disponíveis no checkout com desconto.
                </p>
              </div>
              <div className="flex flex-col items-end gap-1 shrink-0">
                <button
                  type="button"
                  onClick={handleToggleRestringeFormas}
                  className="relative transition-colors"
                  style={{ width: '40px', height: '22px', borderRadius: '9999px', border: 'none', background: descontoRestringeFormas ? 'rgba(0,212,212,0.7)' : 'rgba(255,255,255,0.1)' }}
                >
                  <span
                    className="absolute top-[3px] w-[16px] h-[16px] bg-white rounded-full transition-all"
                    style={{ left: descontoRestringeFormas ? '21px' : '3px' }}
                  />
                </button>
              </div>
            </div>

            {formas.filter(f => f.ativo).length > 0 && (
              <>
                <div style={{ height: '0.5px', background: 'rgba(255,255,255,0.07)' }} />
                <p style={{ fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.25)' }}>
                  Formas que aceitam desconto
                </p>
                <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)', marginTop: '-6px' }}>
                  Clique sobre a forma para ativar ou desativar o desconto.
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {formas.filter(f => f.ativo).map(f => {
                    const aceita = f.aceita_desconto !== false
                    return (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => handleToggleFormaDesconto(f)}
                        style={{
                          minHeight: '38px',
                          padding: '8px 15px',
                          borderRadius: '9px',
                          fontSize: '13px',
                          cursor: 'pointer',
                          border: aceita ? '0.5px solid rgba(0,239,255,0.4)' : '0.5px solid rgba(255,255,255,0.1)',
                          background: aceita ? 'rgba(0,239,255,0.1)' : 'rgba(255,255,255,0.03)',
                          color: aceita ? '#0ef' : 'rgba(255,255,255,0.35)',
                        }}
                      >
                        {f.nome}{aceita ? ' ✓' : ''}
                      </button>
                    )
                  })}
                </div>
              </>
            )}
          </div>

          {/* ── Supervisão ───────────────────────────────────────────── */}
          <div style={CARD} className="flex flex-col gap-3">
            <p style={LBL9}>Supervisão</p>

            {/* a) Toggle-mãe */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <p style={{ fontSize: '13px', fontWeight: 600, color: supervisaoHabilitada ? 'rgba(0,239,255,0.9)' : 'rgba(255,255,255,0.75)' }}>
                  Habilitar supervisão
                </p>
                <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', marginTop: '3px' }}>
                  Exige autorização de supervisor ou senha mestra em ações sensíveis.
                </p>
              </div>
              <div className="flex flex-col items-end gap-1 shrink-0">
                <button
                  type="button"
                  onClick={handleToggleSupervisao}
                  className="relative transition-colors"
                  style={{ width: '40px', height: '22px', borderRadius: '9999px', border: 'none', background: supervisaoHabilitada ? 'rgba(0,212,212,0.85)' : 'rgba(255,255,255,0.1)', cursor: 'pointer' }}
                >
                  <span
                    className="absolute top-[3px] w-[16px] h-[16px] bg-white rounded-full transition-all"
                    style={{ left: supervisaoHabilitada ? '21px' : '3px' }}
                  />
                </button>
                {supervisaoSaved && (
                  <span style={{ fontSize: '10px', color: 'rgba(100,220,160,0.8)' }}>Salvo</span>
                )}
              </div>
            </div>

            {/* Sub-controls — dimmed when supervision off */}
            <div style={{ opacity: supervisaoHabilitada ? 1 : 0.38, pointerEvents: supervisaoHabilitada ? 'auto' : 'none', transition: 'opacity 0.2s', display: 'flex', flexDirection: 'column', gap: '12px' }}>

              <div style={DIV_HR} />

              {/* b) Senha mestra */}
              <div className="flex flex-col gap-2">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <p style={{ fontSize: '13px', fontWeight: 500, color: 'rgba(255,255,255,0.75)' }}>Senha mestra da loja</p>
                    <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', marginTop: '2px' }}>
                      Opcional — autoriza sem escolher supervisor.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleToggleSenhaMestra}
                    className="relative transition-colors shrink-0"
                    style={{ width: '40px', height: '22px', borderRadius: '9999px', border: 'none', background: senhaMestraHabilitada ? 'rgba(0,212,212,0.7)' : 'rgba(255,255,255,0.1)', cursor: 'pointer', marginTop: '2px' }}
                  >
                    <span
                      className="absolute top-[3px] w-[16px] h-[16px] bg-white rounded-full transition-all"
                      style={{ left: senhaMestraHabilitada ? '21px' : '3px' }}
                    />
                  </button>
                </div>

                {senhaMestraHabilitada && (
                  <div className="flex items-center gap-2">
                    <input
                      type="password"
                      value={senhaMestraInput}
                      onChange={e => setSenhaMestraInput(e.target.value)}
                      onBlur={handleSenhaMestraBlur}
                      onKeyDown={e => { if (e.key === 'Enter') { e.currentTarget.blur() } }}
                      placeholder={senhaMestraDefinida ? '••••••••' : 'Definir senha mestra...'}
                      className="flex-1 outline-none"
                      style={{ background: 'rgba(2,8,16,0.6)', border: '0.5px solid rgba(255,255,255,0.12)', borderRadius: '8px', padding: '8px 12px', fontSize: '13px', color: 'rgba(255,255,255,0.8)' }}
                      onFocus={e => { e.currentTarget.style.borderColor = 'rgba(0,239,255,0.4)' }}
                      onBlurCapture={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)' }}
                    />
                    {senhaMestraSalva && (
                      <span style={{ fontSize: '10px', color: 'rgba(100,220,160,0.8)', whiteSpace: 'nowrap' }}>Salvo</span>
                    )}
                    {senhaMestraDefinida && !senhaMestraInput && (
                      <span style={{ fontSize: '10px', color: 'rgba(100,220,160,0.6)', whiteSpace: 'nowrap' }}>definida</span>
                    )}
                  </div>
                )}
              </div>

              <div style={DIV_HR} />

              {/* c) Supervisores chips */}
              <div className="flex flex-col gap-2">
                <p style={LBL9}>Supervisores</p>
                {supervisores.length > 0 ? (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {supervisores.map(c => (
                      <span
                        key={c.id}
                        style={{
                          display: 'inline-flex', alignItems: 'center', gap: '5px',
                          padding: '3px 10px 3px 6px',
                          borderRadius: '999px',
                          background: 'rgba(0,239,255,0.08)',
                          border: '0.5px solid rgba(0,239,255,0.25)',
                          fontSize: '12px', color: 'rgba(0,239,255,0.85)',
                        }}
                      >
                        <span style={{
                          width: '18px', height: '18px', borderRadius: '50%',
                          background: 'rgba(0,239,255,0.15)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '9px', fontWeight: 700, color: '#0ef', flexShrink: 0,
                        }}>
                          {c.nome.charAt(0).toUpperCase()}
                        </span>
                        {c.nome.split(' ')[0]}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.2)' }}>Nenhum supervisor definido.</p>
                )}
                <button
                  type="button"
                  onClick={() => { setSupervisoresQ(''); setModalSupervisores(true) }}
                  style={{
                    alignSelf: 'flex-start',
                    background: 'none',
                    border: '0.5px solid rgba(0,239,255,0.25)',
                    borderRadius: '8px',
                    color: 'rgba(0,239,255,0.7)',
                    fontSize: '12px',
                    padding: '5px 12px',
                    cursor: 'pointer',
                  }}
                >
                  Gerenciar supervisores
                </button>
              </div>

              <div style={DIV_HR} />

              {/* d) Ações que exigem autorização */}
              <div className="flex flex-col gap-3">
                <p style={LBL9}>Ações que exigem autorização</p>

                <div className="flex items-start justify-between gap-3">
                  <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.7)', flex: 1 }}>Fechar caixa com valor a menos</p>
                  <button
                    type="button"
                    onClick={handleToggleFecharFalta}
                    className="relative transition-colors shrink-0"
                    style={{ width: '40px', height: '22px', borderRadius: '9999px', border: 'none', background: exigeAuthFecharFalta ? 'rgba(0,212,212,0.7)' : 'rgba(255,255,255,0.1)', cursor: 'pointer' }}
                  >
                    <span
                      className="absolute top-[3px] w-[16px] h-[16px] bg-white rounded-full transition-all"
                      style={{ left: exigeAuthFecharFalta ? '21px' : '3px' }}
                    />
                  </button>
                </div>

                <div className="flex items-start justify-between gap-3">
                  <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.7)', flex: 1 }}>Fechar caixa com valor a mais</p>
                  <button
                    type="button"
                    onClick={handleToggleFecharSobra}
                    className="relative transition-colors shrink-0"
                    style={{ width: '40px', height: '22px', borderRadius: '9999px', border: 'none', background: exigeAuthFecharSobra ? 'rgba(0,212,212,0.7)' : 'rgba(255,255,255,0.1)', cursor: 'pointer' }}
                  >
                    <span
                      className="absolute top-[3px] w-[16px] h-[16px] bg-white rounded-full transition-all"
                      style={{ left: exigeAuthFecharSobra ? '21px' : '3px' }}
                    />
                  </button>
                </div>

                <div className="flex items-start justify-between gap-3">
                  <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.7)', flex: 1 }}>Cancelar item do caixa</p>
                  <button
                    type="button"
                    onClick={handleToggleCancelarItem}
                    className="relative transition-colors shrink-0"
                    style={{ width: '40px', height: '22px', borderRadius: '9999px', border: 'none', background: exigeAuthCancelarItem ? 'rgba(0,212,212,0.7)' : 'rgba(255,255,255,0.1)', cursor: 'pointer' }}
                  >
                    <span
                      className="absolute top-[3px] w-[16px] h-[16px] bg-white rounded-full transition-all"
                      style={{ left: exigeAuthCancelarItem ? '21px' : '3px' }}
                    />
                  </button>
                </div>
              </div>
            </div>

            {/* e) Amber warning — no auth method configured */}
            {semMetodoAuth && (
              <div style={{ background: 'rgba(234,179,8,0.08)', border: '0.5px solid rgba(234,179,8,0.25)', borderRadius: '8px', padding: '10px 12px' }}>
                <p style={{ fontSize: '11px', color: 'rgba(234,179,8,0.8)' }}>
                  ⚠️ Habilite a senha mestra ou marque ao menos um supervisor.
                </p>
              </div>
            )}
          </div>

        </div>
      </main>

      {/* ── Gerenciar supervisores modal ─────────────────────────────────── */}
      {modalSupervisores && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(2,8,16,0.82)' }}
          onClick={() => setModalSupervisores(false)}
        >
          <div
            className="flex flex-col w-full"
            style={{
              maxWidth: '420px',
              maxHeight: '88vh',
              background: 'rgba(8,18,30,0.98)',
              border: '0.5px solid rgba(255,255,255,0.12)',
              borderRadius: '16px',
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="shrink-0 flex items-start justify-between gap-3 px-5 py-4" style={{ borderBottom: '0.5px solid rgba(255,255,255,0.07)' }}>
              <div>
                <h3 style={{ fontSize: '15px', fontWeight: 600, color: 'rgba(255,255,255,0.88)' }}>Gerenciar supervisores</h3>
                <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)', marginTop: '3px' }}>Marque quem pode autorizar ações sensíveis</p>
              </div>
              <button
                onClick={() => setModalSupervisores(false)}
                style={{ width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', fontSize: '20px', cursor: 'pointer', borderRadius: '8px', flexShrink: 0 }}
              >×</button>
            </div>

            {/* Search */}
            <div className="shrink-0 p-4" style={{ borderBottom: '0.5px solid rgba(255,255,255,0.07)' }}>
              <input
                type="text"
                value={supervisoresQ}
                onChange={e => setSupervisoresQ(e.target.value)}
                placeholder="Buscar colaborador..."
                className="outline-none"
                style={{
                  width: '100%', minHeight: '40px', boxSizing: 'border-box',
                  background: 'rgba(2,8,16,0.6)',
                  border: '0.5px solid rgba(255,255,255,0.12)',
                  borderRadius: '8px',
                  padding: '0 12px',
                  fontSize: '13px',
                  color: 'rgba(255,255,255,0.75)',
                }}
                onFocus={e => { e.currentTarget.style.borderColor = 'rgba(0,239,255,0.4)' }}
                onBlur={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)' }}
              />
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-1.5">
              {colaboradores
                .filter(c => {
                  if (!supervisoresQ.trim()) return true
                  const q = supervisoresQ.toLowerCase()
                  return (
                    c.nome.toLowerCase().includes(q) ||
                    (c.cargo ?? '').toLowerCase().includes(q) ||
                    c.email.toLowerCase().includes(q)
                  )
                })
                .map(col => {
                  const sup = col.is_supervisor ?? false
                  return (
                    <button
                      key={col.id}
                      type="button"
                      onClick={() => handleToggleSupervisor(col)}
                      className="flex items-center gap-3 w-full text-left"
                      style={{
                        padding: '10px 12px',
                        borderRadius: '10px',
                        border: sup ? '0.5px solid rgba(0,239,255,0.3)' : '0.5px solid rgba(255,255,255,0.06)',
                        background: sup ? 'rgba(0,239,255,0.06)' : 'rgba(255,255,255,0.02)',
                        cursor: 'pointer',
                      }}
                    >
                      <div style={{
                        width: '36px', height: '36px', borderRadius: '50%', flexShrink: 0,
                        background: sup ? 'rgba(0,239,255,0.12)' : 'rgba(255,255,255,0.06)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '14px', fontWeight: 600,
                        color: sup ? '#0ef' : 'rgba(255,255,255,0.45)',
                      }}>
                        {col.nome.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p style={{ fontSize: '13px', color: sup ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.62)', fontWeight: sup ? 500 : 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {col.nome}
                        </p>
                        <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.28)' }}>
                          {col.cargo ?? (col.nivel === 'dono_loja' ? 'Dono / Gerente' : 'Vendedor')}
                        </p>
                      </div>
                      <div style={{
                        width: '20px', height: '20px', borderRadius: '6px', flexShrink: 0,
                        border: sup ? 'none' : '1.5px solid rgba(255,255,255,0.18)',
                        background: sup ? '#0ef' : 'transparent',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        {sup && <span style={{ fontSize: '11px', color: '#000', fontWeight: 800, lineHeight: 1 }}>✓</span>}
                      </div>
                    </button>
                  )
                })}
            </div>

            {/* Footer */}
            <div className="shrink-0 p-4" style={{ borderTop: '0.5px solid rgba(255,255,255,0.07)' }}>
              <button
                onClick={() => setModalSupervisores(false)}
                style={{
                  width: '100%', minHeight: '44px',
                  background: 'rgba(0,239,255,0.12)',
                  border: '0.5px solid rgba(0,239,255,0.35)',
                  borderRadius: '10px',
                  color: '#0ef',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Concluir
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
