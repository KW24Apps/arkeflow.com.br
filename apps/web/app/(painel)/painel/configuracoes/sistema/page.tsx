'use client'

import { useEffect, useRef, useState } from 'react'
import { ImageIcon, Package, Tag, ShieldCheck, Banknote, Keyboard, Gift } from 'lucide-react'
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
  supervisao_habilitada:      boolean
  senha_mestra_habilitada:    boolean
  senha_mestra_definida:      boolean
  exige_auth_fechar_falta:    boolean
  exige_auth_fechar_sobra:    boolean
  exige_auth_cancelar_item:   boolean
  sangria_limite_habilitado:  boolean
  sangria_limite_valor:       string | number
  sangria_fundo_troco:        string | number
  sangria_limite_modo:        string
  atalhos_caixa:              Record<string, string>
  cashback_habilitado:        boolean
  cashback_aceita_promocao:   boolean
  cashback_aceita_desconto:   boolean
  cashback_aceita_crediario:  boolean
  cashback_limite_modo:       string
  cashback_limite_percentual: string | number
  cashback_carencia_dias:     string | number
  cashback_validade_meses:    string | number
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

const LBL9: React.CSSProperties = {
  fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.3)',
}

const DIV_HR: React.CSSProperties = { height: '0.5px', background: 'rgba(255,255,255,0.07)' }

const ATALHO_ACTIONS = [
  { actionKey: 'cliente',     label: 'Cliente',      fKey: 'F2'  },
  { actionKey: 'vendedor',    label: 'Vendedor',      fKey: 'F3'  },
  { actionKey: 'sacolas',     label: 'Sacolas',       fKey: 'F4'  },
  { actionKey: 'provas',      label: 'Provas',        fKey: 'F6'  },
  { actionKey: 'sangria',     label: 'Sangria',       fKey: 'F7'  },
  { actionKey: 'suprimento',  label: 'Suprimento',    fKey: 'F8'  },
  { actionKey: 'fecharVenda', label: 'Fechar venda',  fKey: 'F9'  },
  { actionKey: 'fecharCaixa', label: 'Fechar caixa',  fKey: 'F10' },
] as const

type Secao = 'logo' | 'estoque' | 'desconto' | 'supervisao' | 'caixa' | 'atalhos' | 'cashback' | null

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

  // ── Caixa limit state ─────────────────────────────────────────────────────
  const [sangriLimiteHabilitado, setSangriLimiteHabilitado] = useState(false)
  const [sangriLimiteValorCents, setSangriLimiteValorCents] = useState(0)
  const [sangriSaldoTrocoCents,  setSangriSaldoTrocoCents]  = useState(0)
  const [sangriLimiteModo,       setSangriLimiteModo]       = useState<'avisar' | 'obrigar'>('avisar')
  const [caixaSaved,             setCaixaSaved]             = useState(false)

  // ── Cashback state ────────────────────────────────────────────────────────
  const [cashbackHabilitado,      setCashbackHabilitado]      = useState(false)
  const [cashbackAceitaPromocao,  setCashbackAceitaPromocao]  = useState(false)
  const [cashbackAceitaDesconto,  setCashbackAceitaDesconto]  = useState(true)
  const [cashbackAceitaCrediario, setCashbackAceitaCrediario] = useState(false)
  const [cashbackLimiteModo,      setCashbackLimiteModo]      = useState<'livre' | 'percentual'>('livre')
  const [cashbackLimitePct,       setCashbackLimitePct]       = useState(0)
  const [cashbackCarenciaDias,    setCashbackCarenciaDias]    = useState(0)
  const [cashbackValidadeMeses,   setCashbackValidadeMeses]   = useState(0)
  const [cashbackSaved,           setCashbackSaved]           = useState(false)

  // ── Atalhos state ─────────────────────────────────────────────────────────
  const [atalhosCfg,      setAtalhosCfg]      = useState<Record<string, string>>({})
  const [atalhosSaved,    setAtalhosSaved]    = useState(false)
  const [atalhoCapturing, setAtalhoCapturing] = useState<string | null>(null)
  const [atalhoDisplayKey, setAtalhoDisplayKey] = useState('')
  const [atalhoConflict,  setAtalhoConflict]  = useState(false)
  const [atalhoHover,     setAtalhoHover]     = useState<string | null>(null)

  // ── Layout state ──────────────────────────────────────────────────────────
  const [secao, setSecao] = useState<Secao>(null)

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
      setSangriLimiteHabilitado(d.sangria_limite_habilitado ?? false)
      setSangriLimiteValorCents(Math.round(Number(d.sangria_limite_valor ?? 0) * 100))
      setSangriSaldoTrocoCents(Math.round(Number(d.sangria_fundo_troco ?? 0) * 100))
      setSangriLimiteModo((d.sangria_limite_modo ?? 'avisar') as 'avisar' | 'obrigar')
      setAtalhosCfg((d.atalhos_caixa as Record<string, string>) ?? {})
      setCashbackHabilitado(d.cashback_habilitado ?? false)
      setCashbackAceitaPromocao(d.cashback_aceita_promocao ?? false)
      setCashbackAceitaDesconto(d.cashback_aceita_desconto ?? true)
      setCashbackAceitaCrediario(d.cashback_aceita_crediario ?? false)
      setCashbackLimiteModo((d.cashback_limite_modo ?? 'livre') as 'livre' | 'percentual')
      setCashbackLimitePct(Number(d.cashback_limite_percentual ?? 0))
      setCashbackCarenciaDias(Number(d.cashback_carencia_dias ?? 0))
      setCashbackValidadeMeses(Number(d.cashback_validade_meses ?? 0))
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

  // ── Caixa limit handlers ──────────────────────────────────────────────────

  async function handleSaveCaixa(fields: Record<string, any>) {
    try {
      await api.put('/dados-loja/sistema', fields)
      setCaixaSaved(true)
      setTimeout(() => setCaixaSaved(false), 2000)
    } catch {}
  }

  async function handleToggleSangriaLimite() {
    const v = !sangriLimiteHabilitado
    setSangriLimiteHabilitado(v)
    try {
      await api.put('/dados-loja/sistema', { sangria_limite_habilitado: v })
      setCaixaSaved(true); setTimeout(() => setCaixaSaved(false), 2000)
    } catch { setSangriLimiteHabilitado(!v) }
  }

  // ── Cashback handlers ────────────────────────────────────────────────────

  async function handleSaveCashback(fields: Record<string, any>) {
    try {
      await api.put('/dados-loja/sistema', fields)
      setCashbackSaved(true); setTimeout(() => setCashbackSaved(false), 2000)
    } catch {}
  }

  async function handleToggleCashbackHabilitado() {
    const v = !cashbackHabilitado
    setCashbackHabilitado(v)
    try {
      await api.put('/dados-loja/sistema', { cashback_habilitado: v })
      setCashbackSaved(true); setTimeout(() => setCashbackSaved(false), 2000)
    } catch { setCashbackHabilitado(!v) }
  }

  async function handleToggleCashbackAceitaPromocao() {
    const v = !cashbackAceitaPromocao
    setCashbackAceitaPromocao(v)
    try { await api.put('/dados-loja/sistema', { cashback_aceita_promocao: v }); setCashbackSaved(true); setTimeout(() => setCashbackSaved(false), 2000) }
    catch { setCashbackAceitaPromocao(!v) }
  }

  async function handleToggleCashbackAceitaDesconto() {
    const v = !cashbackAceitaDesconto
    setCashbackAceitaDesconto(v)
    try { await api.put('/dados-loja/sistema', { cashback_aceita_desconto: v }); setCashbackSaved(true); setTimeout(() => setCashbackSaved(false), 2000) }
    catch { setCashbackAceitaDesconto(!v) }
  }

  async function handleToggleCashbackAceitaCrediario() {
    const v = !cashbackAceitaCrediario
    setCashbackAceitaCrediario(v)
    try { await api.put('/dados-loja/sistema', { cashback_aceita_crediario: v }); setCashbackSaved(true); setTimeout(() => setCashbackSaved(false), 2000) }
    catch { setCashbackAceitaCrediario(!v) }
  }

  // ── Atalhos handlers ──────────────────────────────────────────────────────

  useEffect(() => {
    if (!atalhoCapturing) return
    const capturing = atalhoCapturing
    async function persist(cfg: Record<string, string>) {
      try {
        await api.put('/dados-loja/sistema', { atalhos_caixa: cfg })
        setAtalhosSaved(true)
        setTimeout(() => setAtalhosSaved(false), 2000)
      } catch {}
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setAtalhoCapturing(null); setAtalhoDisplayKey(''); return
      }
      if (e.key === 'Backspace') {
        e.preventDefault()
        const next = { ...atalhosCfg }; delete next[capturing]
        setAtalhosCfg(next); setAtalhoCapturing(null); setAtalhoDisplayKey('')
        persist(next); return
      }
      const k = e.key.toUpperCase()
      if (!/^[A-Z0-9]$/.test(k)) return
      e.preventDefault()
      setAtalhoDisplayKey(k)
      if (Object.entries(atalhosCfg).some(([ak, v]) => ak !== capturing && v === k)) {
        setAtalhoConflict(true)
        setTimeout(() => setAtalhoConflict(false), 300)
        return
      }
      const next = { ...atalhosCfg, [capturing]: k }
      setAtalhosCfg(next); setAtalhoCapturing(null); setAtalhoDisplayKey('')
      persist(next)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [atalhoCapturing, atalhosCfg])

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

  type SecaoNonNull = 'logo' | 'estoque' | 'desconto' | 'supervisao' | 'caixa' | 'atalhos' | 'cashback'
  const PANEL_ICON: Record<SecaoNonNull, React.ReactNode> = {
    logo:       <ImageIcon   size={15} style={{ color: '#0ef', flexShrink: 0 }} />,
    estoque:    <Package     size={15} style={{ color: '#0ef', flexShrink: 0 }} />,
    desconto:   <Tag         size={15} style={{ color: '#0ef', flexShrink: 0 }} />,
    supervisao: <ShieldCheck size={15} style={{ color: '#0ef', flexShrink: 0 }} />,
    caixa:      <Banknote    size={15} style={{ color: '#0ef', flexShrink: 0 }} />,
    atalhos:    <Keyboard    size={15} style={{ color: '#0ef', flexShrink: 0 }} />,
    cashback:   <Gift        size={15} style={{ color: '#0ef', flexShrink: 0 }} />,
  }
  const PANEL_LABEL: Record<SecaoNonNull, string> = {
    logo: 'Logo da loja', estoque: 'Estoque', desconto: 'Desconto', supervisao: 'Supervisão',
    caixa: 'Limite de caixa', atalhos: 'Atalhos do caixa', cashback: 'Cashback',
  }

  return (
    <>
      <TopBar />
      <main className="flex-1 overflow-y-auto p-4 md:p-5 pb-10">
        <div className="flex flex-col gap-4">

          {/* ── Full-width config panel ──────────────────────────────────── */}
          {secao !== null && <div style={{
            background: 'rgba(8,18,30,0.55)',
            backdropFilter: 'blur(12px)',
            border: '0.5px solid rgba(255,255,255,0.09)',
            borderRadius: '12px',
            overflow: 'hidden',
          }}>
            {/* Panel header */}
            <div className="flex items-center justify-between px-5 py-3.5" style={{ borderBottom: '0.5px solid rgba(255,255,255,0.07)' }}>
              <div className="flex items-center gap-2.5">
                {PANEL_ICON[secao as SecaoNonNull]}
                <span style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.45)', fontWeight: 500 }}>
                  {PANEL_LABEL[secao as SecaoNonNull]}
                </span>
              </div>
              {secao === 'estoque'    && toggleSaved     && <span style={{ fontSize: '10px', color: 'rgba(100,220,160,0.8)' }}>Salvo</span>}
              {secao === 'desconto'   && descontoSaved   && <span style={{ fontSize: '10px', color: 'rgba(100,220,160,0.8)' }}>Salvo</span>}
              {secao === 'supervisao' && supervisaoSaved && <span style={{ fontSize: '10px', color: 'rgba(100,220,160,0.8)' }}>Salvo</span>}
              {secao === 'caixa'      && caixaSaved      && <span style={{ fontSize: '10px', color: 'rgba(100,220,160,0.8)' }}>Salvo</span>}
              {secao === 'atalhos'    && atalhosSaved    && <span style={{ fontSize: '10px', color: 'rgba(100,220,160,0.8)' }}>Salvo</span>}
              {secao === 'cashback'   && cashbackSaved   && <span style={{ fontSize: '10px', color: 'rgba(100,220,160,0.8)' }}>Salvo</span>}
            </div>

            {/* Panel body */}
            <div className="p-5">

              {/* ── Logo ─────────────────────────────────────────────── */}
              {secao === 'logo' && (
                <div className="max-w-xs mx-auto flex flex-col gap-3">
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
              )}

              {/* ── Estoque ──────────────────────────────────────────── */}
              {secao === 'estoque' && (
                <div className="max-w-sm mx-auto flex flex-col gap-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <p style={{ fontSize: '13px', fontWeight: 500, color: 'rgba(255,255,255,0.75)' }}>Controle de estoque global</p>
                      <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', marginTop: '3px' }}>
                        Desativado: nenhum produto controla quantidade. Produtos individuais ainda podem sobrescrever.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleToggleEstoque}
                      className="relative transition-colors shrink-0"
                      style={{ width: '40px', height: '22px', borderRadius: '9999px', border: 'none', background: controleEstoque ? 'rgba(0,212,212,0.7)' : 'rgba(255,255,255,0.1)', cursor: 'pointer' }}
                    >
                      <span
                        className="absolute top-[3px] w-[16px] h-[16px] bg-white rounded-full transition-all"
                        style={{ left: controleEstoque ? '21px' : '3px' }}
                      />
                    </button>
                  </div>

                  {!controleEstoque && (
                    <div style={{ background: 'rgba(234,179,8,0.08)', border: '0.5px solid rgba(234,179,8,0.25)', borderRadius: '8px', padding: '10px 12px' }}>
                      <p style={{ fontSize: '11px', color: 'rgba(234,179,8,0.8)' }}>⚠️ Alertas e validações de quantidade ficam desabilitados.</p>
                    </div>
                  )}
                </div>
              )}

              {/* ── Desconto ─────────────────────────────────────────── */}
              {secao === 'desconto' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-7">

                  {/* LEFT: Limits */}
                  <div className="flex flex-col gap-3">
                    <p style={LBL9}>Limites</p>
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
                    <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.25)' }}>
                      Trava no primeiro limite atingido. 0 = sem limite.
                    </p>
                  </div>

                  {/* RIGHT: Rules + chips */}
                  <div className="flex flex-col gap-3">
                    <p style={LBL9}>Regras</p>

                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <p style={{ fontSize: '13px', fontWeight: 500, color: 'rgba(255,255,255,0.75)' }}>Produtos em promoção aceitam desconto adicional</p>
                        <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', marginTop: '3px' }}>
                          Desativado: itens já em promoção não recebem o desconto do caixa por cima.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={handleTogglePromocao}
                        className="relative transition-colors shrink-0"
                        style={{ width: '40px', height: '22px', borderRadius: '9999px', border: 'none', background: promocaoAceitaDesconto ? 'rgba(0,212,212,0.7)' : 'rgba(255,255,255,0.1)', cursor: 'pointer' }}
                      >
                        <span
                          className="absolute top-[3px] w-[16px] h-[16px] bg-white rounded-full transition-all"
                          style={{ left: promocaoAceitaDesconto ? '21px' : '3px' }}
                        />
                      </button>
                    </div>

                    <div style={DIV_HR} />

                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <p style={{ fontSize: '13px', fontWeight: 500, color: 'rgba(255,255,255,0.75)' }}>Restringir formas quando há desconto</p>
                        <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', marginTop: '3px' }}>
                          Ativado: somente formas marcadas abaixo ficam disponíveis no checkout com desconto.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={handleToggleRestringeFormas}
                        className="relative transition-colors shrink-0"
                        style={{ width: '40px', height: '22px', borderRadius: '9999px', border: 'none', background: descontoRestringeFormas ? 'rgba(0,212,212,0.7)' : 'rgba(255,255,255,0.1)', cursor: 'pointer' }}
                      >
                        <span
                          className="absolute top-[3px] w-[16px] h-[16px] bg-white rounded-full transition-all"
                          style={{ left: descontoRestringeFormas ? '21px' : '3px' }}
                        />
                      </button>
                    </div>

                    {formas.filter(f => f.ativo).length > 0 && (
                      <>
                        <div style={DIV_HR} />
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
                </div>
              )}

              {/* ── Limite de caixa ──────────────────────────────────── */}
              {secao === 'caixa' && (
                <div className="flex flex-col gap-5">
                  <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)' }}>
                    Avisa (ou obriga) a fazer sangria quando o dinheiro em caixa passa do limite, ao finalizar uma venda.
                  </p>

                  {/* Master toggle */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <p style={{ fontSize: '13px', fontWeight: 600, color: sangriLimiteHabilitado ? 'rgba(0,239,255,0.9)' : 'rgba(255,255,255,0.75)' }}>
                        Limite de caixa habilitado
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleToggleSangriaLimite}
                      className="relative transition-colors shrink-0"
                      style={{ width: '40px', height: '22px', borderRadius: '9999px', border: 'none', background: sangriLimiteHabilitado ? 'rgba(0,212,212,0.85)' : 'rgba(255,255,255,0.1)', cursor: 'pointer' }}
                    >
                      <span
                        className="absolute top-[3px] w-[16px] h-[16px] bg-white rounded-full transition-all"
                        style={{ left: sangriLimiteHabilitado ? '21px' : '3px' }}
                      />
                    </button>
                  </div>

                  {/* Sub-controls */}
                  <div style={{ opacity: sangriLimiteHabilitado ? 1 : 0.38, pointerEvents: sangriLimiteHabilitado ? 'auto' : 'none', transition: 'opacity 0.2s' }}>
                    <div className="flex flex-col gap-4">

                      {/* Two currency inputs side by side */}
                      <div className="grid grid-cols-2 gap-3">
                        <div className="flex flex-col gap-1.5">
                          <label style={{ fontSize: '10px', color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Limite</label>
                          <CurrencyInput
                            value={sangriLimiteValorCents}
                            onChange={setSangriLimiteValorCents}
                            onBlur={() => handleSaveCaixa({ sangria_limite_valor: sangriLimiteValorCents / 100 })}
                            className="w-full min-h-[38px] px-3 outline-none"
                            style={{ background: 'rgba(8,18,30,0.5)', border: '0.5px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.8)', borderRadius: '8px', fontSize: '13px' }}
                          />
                        </div>
                        <div className="flex flex-col gap-1.5">
                          <label style={{ fontSize: '10px', color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Fundo de troco</label>
                          <CurrencyInput
                            value={sangriSaldoTrocoCents}
                            onChange={setSangriSaldoTrocoCents}
                            onBlur={() => handleSaveCaixa({ sangria_fundo_troco: sangriSaldoTrocoCents / 100 })}
                            className="w-full min-h-[38px] px-3 outline-none"
                            style={{ background: 'rgba(8,18,30,0.5)', border: '0.5px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.8)', borderRadius: '8px', fontSize: '13px' }}
                          />
                        </div>
                      </div>

                      {/* Segmented modo selector */}
                      <div className="flex flex-col gap-1.5">
                        <label style={{ fontSize: '10px', color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Ao atingir o limite</label>
                        <div className="flex gap-2">
                          {(['avisar', 'obrigar'] as const).map(v => {
                            const lbl = v === 'avisar' ? 'Só avisar' : 'Obrigar'
                            const sel = sangriLimiteModo === v
                            return (
                              <button
                                key={v}
                                type="button"
                                onClick={() => { setSangriLimiteModo(v); handleSaveCaixa({ sangria_limite_modo: v }) }}
                                style={{
                                  flex: 1, minHeight: '38px',
                                  borderRadius: '8px',
                                  border: sel ? '0.5px solid rgba(0,239,255,0.4)' : '0.5px solid rgba(255,255,255,0.1)',
                                  background: sel ? 'rgba(0,239,255,0.1)' : 'rgba(255,255,255,0.03)',
                                  color: sel ? '#0ef' : 'rgba(255,255,255,0.45)',
                                  fontSize: '13px', cursor: 'pointer',
                                }}
                              >
                                {lbl}
                              </button>
                            )
                          })}
                        </div>
                      </div>

                    </div>
                  </div>
                </div>
              )}

              {/* ── Atalhos do caixa ────────────────────────────────── */}
              {secao === 'atalhos' && (
                <div className="flex flex-col gap-4">
                  <p style={{ fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.3)', lineHeight: 1.6 }}>
                    Defina uma tecla extra (Alt + letra ou número) para cada ação do caixa. Os atalhos padrão (F2–F10) continuam funcionando.
                  </p>
                  <div className="flex flex-col gap-2">
                    {ATALHO_ACTIONS.map(({ actionKey, label, fKey }) => {
                      const assigned = atalhosCfg[actionKey]
                      const hov = atalhoHover === actionKey
                      return (
                        <div key={actionKey} className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2">
                            <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.75)' }}>{label}</span>
                            <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.25)', background: 'rgba(255,255,255,0.05)', border: '0.5px solid rgba(255,255,255,0.1)', borderRadius: '4px', padding: '1px 5px' }}>{fKey}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => { setAtalhoCapturing(actionKey); setAtalhoDisplayKey('') }}
                            onMouseEnter={() => setAtalhoHover(actionKey)}
                            onMouseLeave={() => setAtalhoHover(null)}
                            style={{
                              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                              height: '32px', minWidth: '82px', padding: '0 10px',
                              borderRadius: '8px',
                              border: `0.5px solid ${assigned ? 'rgba(0,239,255,0.3)' : hov ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.1)'}`,
                              background: assigned ? 'rgba(0,239,255,0.08)' : hov ? 'rgba(255,255,255,0.06)' : 'transparent',
                              color: assigned ? 'rgba(0,239,255,0.85)' : 'rgba(255,255,255,0.25)',
                              fontSize: '12px', cursor: 'pointer',
                              transition: 'border-color 0.12s, background 0.12s',
                            }}
                          >
                            {assigned ? `Alt + ${assigned}` : '—'}
                          </button>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* ── Cashback ─────────────────────────────────────────── */}
              {secao === 'cashback' && (
                <div className="flex flex-col gap-5">

                  {/* Master toggle */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <p style={{ fontSize: '13px', fontWeight: 600, color: cashbackHabilitado ? 'rgba(0,239,255,0.9)' : 'rgba(255,255,255,0.75)' }}>
                        Cashback habilitado
                      </p>
                      <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', marginTop: '3px' }}>
                        Clientes acumulam saldo ao comprar conforme a regra de cashback.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleToggleCashbackHabilitado}
                      className="relative transition-colors shrink-0"
                      style={{ width: '40px', height: '22px', borderRadius: '9999px', border: 'none', background: cashbackHabilitado ? 'rgba(0,212,212,0.85)' : 'rgba(255,255,255,0.1)', cursor: 'pointer' }}
                    >
                      <span className="absolute top-[3px] w-[16px] h-[16px] bg-white rounded-full transition-all" style={{ left: cashbackHabilitado ? '21px' : '3px' }} />
                    </button>
                  </div>

                  <div style={{ opacity: cashbackHabilitado ? 1 : 0.38, pointerEvents: cashbackHabilitado ? 'auto' : 'none', transition: 'opacity 0.2s' }}>
                    <div className="flex flex-col gap-5">

                      {/* Regras de uso */}
                      <div className="flex flex-col gap-3">
                        <p style={LBL9}>Regras de uso</p>
                        <div style={DIV_HR} />

                        <div className="flex items-center justify-between gap-3">
                          <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.75)', flex: 1 }}>Pode usar em produtos com promoção</p>
                          <button type="button" onClick={handleToggleCashbackAceitaPromocao} className="relative shrink-0"
                            style={{ width: '40px', height: '22px', borderRadius: '9999px', border: 'none', background: cashbackAceitaPromocao ? 'rgba(0,212,212,0.7)' : 'rgba(255,255,255,0.1)', cursor: 'pointer' }}>
                            <span className="absolute top-[3px] w-[16px] h-[16px] bg-white rounded-full transition-all" style={{ left: cashbackAceitaPromocao ? '21px' : '3px' }} />
                          </button>
                        </div>

                        <div className="flex items-center justify-between gap-3">
                          <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.75)', flex: 1 }}>Pode usar quando há desconto de caixa</p>
                          <button type="button" onClick={handleToggleCashbackAceitaDesconto} className="relative shrink-0"
                            style={{ width: '40px', height: '22px', borderRadius: '9999px', border: 'none', background: cashbackAceitaDesconto ? 'rgba(0,212,212,0.7)' : 'rgba(255,255,255,0.1)', cursor: 'pointer' }}>
                            <span className="absolute top-[3px] w-[16px] h-[16px] bg-white rounded-full transition-all" style={{ left: cashbackAceitaDesconto ? '21px' : '3px' }} />
                          </button>
                        </div>

                        <div className="flex items-center justify-between gap-3">
                          <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.75)', flex: 1 }}>Pode usar no crediário</p>
                          <button type="button" onClick={handleToggleCashbackAceitaCrediario} className="relative shrink-0"
                            style={{ width: '40px', height: '22px', borderRadius: '9999px', border: 'none', background: cashbackAceitaCrediario ? 'rgba(0,212,212,0.7)' : 'rgba(255,255,255,0.1)', cursor: 'pointer' }}>
                            <span className="absolute top-[3px] w-[16px] h-[16px] bg-white rounded-full transition-all" style={{ left: cashbackAceitaCrediario ? '21px' : '3px' }} />
                          </button>
                        </div>
                      </div>

                      {/* Limite de uso */}
                      <div className="flex flex-col gap-3">
                        <p style={LBL9}>Limite de uso por compra</p>
                        <div style={DIV_HR} />
                        <div className="flex gap-2">
                          {(['livre', 'percentual'] as const).map(v => {
                            const lbl = v === 'livre' ? 'Livre' : 'Até % da compra'
                            const sel = cashbackLimiteModo === v
                            return (
                              <button key={v} type="button"
                                onClick={() => { setCashbackLimiteModo(v); handleSaveCashback({ cashback_limite_modo: v }) }}
                                style={{ flex: 1, minHeight: '36px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px',
                                  border: sel ? '0.5px solid rgba(0,239,255,0.4)' : '0.5px solid rgba(255,255,255,0.1)',
                                  background: sel ? 'rgba(0,239,255,0.1)' : 'rgba(255,255,255,0.03)',
                                  color: sel ? '#0ef' : 'rgba(255,255,255,0.45)',
                                }}>
                                {lbl}
                              </button>
                            )
                          })}
                        </div>
                        {cashbackLimiteModo === 'percentual' && (
                          <div className="flex flex-col gap-1.5">
                            <label style={{ fontSize: '10px', color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Percentual máximo</label>
                            <div className="relative" style={{ maxWidth: '120px' }}>
                              <input type="number" min="0" max="100" step="0.1"
                                value={cashbackLimitePct}
                                onChange={e => setCashbackLimitePct(parseFloat(e.target.value) || 0)}
                                onFocus={e => { e.currentTarget.style.borderColor = 'rgba(0,239,255,0.4)' }}
                                onBlur={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'; handleSaveCashback({ cashback_limite_percentual: cashbackLimitePct }) }}
                                className="w-full min-h-[38px] px-3 pr-7 outline-none"
                                style={{ background: 'rgba(8,18,30,0.5)', border: '0.5px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.8)', borderRadius: '8px', fontSize: '13px' }}
                              />
                              <span style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', fontSize: '12px', color: 'rgba(255,255,255,0.35)', pointerEvents: 'none' }}>%</span>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Tempo */}
                      <div className="flex flex-col gap-3">
                        <p style={LBL9}>Tempo</p>
                        <div style={DIV_HR} />
                        <div className="grid grid-cols-2 gap-3">
                          <div className="flex flex-col gap-1.5">
                            <label style={{ fontSize: '10px', color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Carência (dias)</label>
                            <input type="number" min="0" step="1"
                              value={cashbackCarenciaDias}
                              onChange={e => setCashbackCarenciaDias(parseInt(e.target.value) || 0)}
                              onFocus={e => { e.currentTarget.style.borderColor = 'rgba(0,239,255,0.4)' }}
                              onBlur={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'; handleSaveCashback({ cashback_carencia_dias: cashbackCarenciaDias }) }}
                              className="w-full min-h-[38px] px-3 outline-none"
                              style={{ background: 'rgba(8,18,30,0.5)', border: '0.5px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.8)', borderRadius: '8px', fontSize: '13px' }}
                            />
                          </div>
                          <div className="flex flex-col gap-1.5">
                            <label style={{ fontSize: '10px', color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Validade (meses)</label>
                            <input type="number" min="0" step="1"
                              value={cashbackValidadeMeses}
                              onChange={e => setCashbackValidadeMeses(parseInt(e.target.value) || 0)}
                              onFocus={e => { e.currentTarget.style.borderColor = 'rgba(0,239,255,0.4)' }}
                              onBlur={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'; handleSaveCashback({ cashback_validade_meses: cashbackValidadeMeses }) }}
                              className="w-full min-h-[38px] px-3 outline-none"
                              style={{ background: 'rgba(8,18,30,0.5)', border: '0.5px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.8)', borderRadius: '8px', fontSize: '13px' }}
                            />
                          </div>
                        </div>
                        <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.25)' }}>
                          0 = sem carência / sem validade.
                        </p>
                      </div>

                    </div>
                  </div>
                </div>
              )}

              {/* ── Supervisão ───────────────────────────────────────── */}
              {secao === 'supervisao' && (
                <div className="flex flex-col gap-5">

                  {/* a) Toggle-mãe — always active, full width */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <p style={{ fontSize: '13px', fontWeight: 600, color: supervisaoHabilitada ? 'rgba(0,239,255,0.9)' : 'rgba(255,255,255,0.75)' }}>
                        Habilitar supervisão
                      </p>
                      <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', marginTop: '3px' }}>
                        Exige autorização de supervisor ou senha mestra em ações sensíveis.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleToggleSupervisao}
                      className="relative transition-colors shrink-0"
                      style={{ width: '40px', height: '22px', borderRadius: '9999px', border: 'none', background: supervisaoHabilitada ? 'rgba(0,212,212,0.85)' : 'rgba(255,255,255,0.1)', cursor: 'pointer' }}
                    >
                      <span
                        className="absolute top-[3px] w-[16px] h-[16px] bg-white rounded-full transition-all"
                        style={{ left: supervisaoHabilitada ? '21px' : '3px' }}
                      />
                    </button>
                  </div>

                  {/* Sub-controls in two columns — dimmed when supervision off */}
                  <div style={{ opacity: supervisaoHabilitada ? 1 : 0.38, pointerEvents: supervisaoHabilitada ? 'auto' : 'none', transition: 'opacity 0.2s' }}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-7">

                      {/* LEFT: Senha mestra */}
                      <div className="flex flex-col gap-3">
                        <div style={DIV_HR} />
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

                      {/* RIGHT: Supervisores + Ações */}
                      <div className="flex flex-col gap-3">
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

                          <div className="flex items-center justify-between gap-3">
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

                          <div className="flex items-center justify-between gap-3">
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

                          <div className="flex items-center justify-between gap-3">
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
                    </div>
                  </div>

                  {/* e) Amber warning — full width */}
                  {semMetodoAuth && (
                    <div style={{ background: 'rgba(234,179,8,0.08)', border: '0.5px solid rgba(234,179,8,0.25)', borderRadius: '8px', padding: '10px 12px' }}>
                      <p style={{ fontSize: '11px', color: 'rgba(234,179,8,0.8)' }}>
                        ⚠️ Habilite a senha mestra ou marque ao menos um supervisor.
                      </p>
                    </div>
                  )}
                </div>
              )}

            </div>
          </div>}

          {/* ── Section nav squares ──────────────────────────────────────── */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '12px' }}>

            {([
              { key: 'logo'       as const, label: 'Logo da loja',     Icon: ImageIcon   },
              { key: 'estoque'    as const, label: 'Estoque',           Icon: Package     },
              { key: 'desconto'   as const, label: 'Desconto',          Icon: Tag         },
              { key: 'supervisao' as const, label: 'Supervisão',        Icon: ShieldCheck },
              { key: 'caixa'      as const, label: 'Limite de caixa',   Icon: Banknote    },
              { key: 'atalhos'    as const, label: 'Atalhos do caixa',  Icon: Keyboard    },
              { key: 'cashback'   as const, label: 'Cashback',          Icon: Gift        },
            ] satisfies { key: Secao; label: string; Icon: React.ElementType }[]).map(({ key, label, Icon }) => {
              const sel = secao === key
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setSecao(secao === key ? null : key)}
                  className="flex flex-col items-center justify-center gap-2.5 active:scale-[0.97] transition-all"
                  style={{
                    padding: '20px 12px',
                    minHeight: '110px',
                    background:     sel ? 'rgba(0,239,255,0.08)' : 'rgba(8,18,30,0.48)',
                    backdropFilter: 'blur(8px)',
                    border:         sel ? '0.5px solid rgba(0,239,255,0.5)' : '0.5px solid rgba(255,255,255,0.09)',
                    borderRadius:   '10px',
                    cursor: 'pointer',
                  }}
                >
                  <Icon size={24} style={{ color: sel ? '#0ef' : 'rgba(255,255,255,0.35)' }} />
                  <span style={{ fontSize: '12px', fontWeight: 500, color: sel ? '#0ef' : 'rgba(255,255,255,0.55)', textAlign: 'center', lineHeight: 1.3 }}>
                    {label}
                  </span>
                </button>
              )
            })}

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
                .filter(c => c.nivel !== 'dono_loja')
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

      {/* ── Key-capture overlay ──────────────────────────────────────────────── */}
      {atalhoCapturing && (() => {
        const meta = ATALHO_ACTIONS.find(a => a.actionKey === atalhoCapturing)
        return (
          <div
            style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(8,18,30,0.92)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            onClick={() => { setAtalhoCapturing(null); setAtalhoDisplayKey('') }}
          >
            <div
              style={{ width: '320px', padding: '32px', background: 'rgba(8,18,30,0.98)', border: '0.5px solid rgba(255,255,255,0.12)', borderRadius: '16px' }}
              onClick={e => e.stopPropagation()}
            >
              <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                <p style={{ fontSize: '16px', fontWeight: 500, color: 'rgba(255,255,255,0.88)', margin: 0 }}>{meta?.label}</p>
                <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.35)', marginTop: '6px', marginBottom: 0 }}>Pressione uma tecla (letra ou número)</p>
              </div>
              <div style={{
                height: '80px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                borderRadius: '12px',
                border: `1px solid ${atalhoConflict ? 'rgba(240,100,100,0.6)' : 'rgba(0,239,255,0.3)'}`,
                background: atalhoConflict ? 'rgba(240,100,100,0.06)' : 'rgba(0,239,255,0.06)',
                marginBottom: '16px',
                transition: 'border-color 0.12s, background 0.12s',
              }}>
                <span style={{ fontSize: '32px', fontWeight: 600, color: atalhoConflict ? 'rgba(240,100,100,0.8)' : atalhoDisplayKey ? 'rgba(0,239,255,0.9)' : 'rgba(255,255,255,0.2)' }}>
                  {atalhoDisplayKey || '?'}
                </span>
              </div>
              <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.25)', textAlign: 'center', margin: 0 }}>
                Backspace para limpar · Esc para cancelar
              </p>
            </div>
          </div>
        )
      })()}
    </>
  )
}
