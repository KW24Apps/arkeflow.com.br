'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ShoppingCart, Trash2, Camera, X, User, Briefcase,
  ShoppingBag, ArrowUp, ArrowDown, Lock,
} from 'lucide-react'
import { usePDVStore } from '@/store/pdv.store'
import { useCaixaStore } from '@/store/caixa.store'
import { useAuthStore } from '@/store/auth.store'
import { api } from '@/lib/api/client'
import { SacolasModal } from '@/components/pdv/SacolasModal'
import { SalespersonSearchModal } from '@/components/pdv/SalespersonSearchModal'

interface VersaoResult {
  versao_id: string
  produto_id: string
  produto_nome: string
  atributos_json: Record<string, string>
  preco_base: string
  preco_especifico: string | null
  codigo_barras: string | null
  estoque_atual: number
  controle_estoque: boolean
}

interface ProdutoSearch {
  id: string
  nome: string
  preco_base: string
  total_versoes: number
}

// ── Desktop style constants ───────────────────────────────────────────────────

const MOD: React.CSSProperties = {
  background: 'rgba(8,18,30,0.52)',
  border: '0.5px solid rgba(255,255,255,0.09)',
  borderRadius: '10px',
  padding: '12px',
  flexShrink: 0,
}

const MOD_LABEL: React.CSSProperties = {
  display: 'block',
  fontSize: '9px',
  color: 'rgba(255,255,255,0.3)',
  textTransform: 'uppercase',
  letterSpacing: '0.1em',
  marginBottom: '8px',
}

// ── Sub-components ────────────────────────────────────────────────────────────

function QtyBtn({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} style={{ width: '28px', height: '28px', background: 'rgba(255,255,255,0.06)', border: '0.5px solid rgba(255,255,255,0.1)', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.7)', cursor: 'pointer', fontSize: '16px', fontWeight: 500, flexShrink: 0 }}>
      {children}
    </button>
  )
}

function CaixaRow({ icon, label, onClick, danger }: { icon: React.ReactNode; label: string; onClick: () => void; danger?: boolean }) {
  const [hov, setHov] = useState(false)
  const color = danger
    ? (hov ? 'rgba(240,100,100,0.9)' : 'rgba(240,100,100,0.6)')
    : (hov ? 'rgba(255,255,255,0.75)' : 'rgba(255,255,255,0.45)')
  return (
    <button onClick={onClick} onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 0', fontSize: '12px', color, background: 'none', border: 'none', cursor: 'pointer', width: '100%', textAlign: 'left', transition: 'color 0.12s' }}>
      <span style={{ display: 'flex', alignItems: 'center', color: 'inherit', flexShrink: 0 }}>{icon}</span>
      {label}
    </button>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function PDVPage() {
  const router = useRouter()

  const { itens, cliente_id, cliente_nome, vendedor_nome, addItem, removeItem, setQtd, setCliente, limpar } =
    usePDVStore()
  const { turno, carregar: carregarCaixa, registrarMovimento, fechar: fecharCaixa } = useCaixaStore()
  const { usuario } = useAuthStore()

  const mobileInputRef = useRef<HTMLInputElement>(null)
  const desktopInputRef = useRef<HTMLInputElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const [input, setInput]           = useState('')
  const [resultados, setResultados] = useState<ProdutoSearch[]>([])
  const [erro, setErro]             = useState('')
  const [scanAtivo, setScanAtivo]   = useState(false)
  const [sacolasOpen, setSacolasOpen]   = useState(false)
  const [vendedorOpen, setVendedorOpen] = useState(false)

  const total    = itens.reduce((s, i) => s + i.preco_unitario * i.quantidade, 0)
  const totalQtd = itens.reduce((s, i) => s + i.quantidade, 0)
  const initials = usuario?.nome
    ? usuario.nome.split(' ').filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase()
    : '?'
  const primeiroNome = usuario?.nome?.split(' ')[0] ?? ''

  function focusInput() {
    mobileInputRef.current?.focus()
    desktopInputRef.current?.focus()
  }

  useEffect(() => {
    focusInput()
    carregarCaixa()
    return () => stopCamera()
  }, [])

  // ── Search ─────────────────────────────────────────────────────────────────

  async function buscarPorCodigo(codigo: string) {
    try {
      const { data } = await api.get<VersaoResult>(`/produtos/barcode/${encodeURIComponent(codigo)}`)
      const preco = data.preco_especifico ? parseFloat(data.preco_especifico) : parseFloat(data.preco_base)
      addItem({
        versao_id: data.versao_id ?? codigo,
        produto_id: data.produto_id,
        nome: data.produto_nome,
        atributos: data.atributos_json ?? {},
        preco_unitario: preco,
        codigo_barras: data.codigo_barras,
      })
      setErro('')
      return true
    } catch { return false }
  }

  async function buscarPorTexto(q: string) {
    if (!q.trim()) { setResultados([]); return }
    try {
      const { data } = await api.get<ProdutoSearch[]>(`/produtos?q=${encodeURIComponent(q)}&todos=false`)
      setResultados(data)
    } catch {}
  }

  async function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key !== 'Enter') return
    e.preventDefault()
    const codigo = input.trim()
    if (!codigo) return
    setResultados([])
    const ok = await buscarPorCodigo(codigo)
    if (!ok) setErro(`Código "${codigo}" não encontrado.`)
    setInput('')
    focusInput()
  }

  async function selecionarProduto(p: ProdutoSearch) {
    try {
      const { data } = await api.get<any>(`/produtos/${p.id}`)
      if (data.versoes?.length === 1) {
        const v = data.versoes[0]
        const preco = v.preco_especifico ? parseFloat(v.preco_especifico) : parseFloat(data.preco_base)
        addItem({ versao_id: v.id, produto_id: p.id, nome: p.nome, atributos: v.atributos_json, preco_unitario: preco, codigo_barras: v.codigo_barras })
        setResultados([])
        setInput('')
      } else {
        router.push(`/pdv/produto/${p.id}`)
      }
    } catch {}
    focusInput()
  }

  // ── Camera ─────────────────────────────────────────────────────────────────

  async function toggleCamera() {
    if (scanAtivo) { stopCamera(); return }
    if (!('BarcodeDetector' in window)) {
      setErro('Scanner de câmera não suportado. Use o leitor físico.')
      return
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
      streamRef.current = stream
      setScanAtivo(true)
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.play()
        scanLoop()
      }
    } catch { setErro('Não foi possível acessar a câmera.') }
  }

  const scanLoop = useCallback(async () => {
    if (!videoRef.current || !streamRef.current) return
    try {
      const detector = new (window as any).BarcodeDetector({ formats: ['ean_13', 'ean_8', 'code_128', 'qr_code'] })
      const loop = async () => {
        if (!streamRef.current) return
        const codes = await detector.detect(videoRef.current!)
        if (codes.length > 0) { stopCamera(); await buscarPorCodigo(codes[0].rawValue) }
        else requestAnimationFrame(loop)
      }
      loop()
    } catch {}
  }, [])

  function stopCamera() {
    streamRef.current?.getTracks().forEach(t => t.stop())
    streamRef.current = null
    setScanAtivo(false)
  }

  // ── Caixa actions ──────────────────────────────────────────────────────────

  async function handleSangria() {
    const v = window.prompt('Valor da sangria (R$):')
    if (!v) return
    const valor = parseFloat(v.replace(',', '.'))
    if (isNaN(valor) || valor <= 0) return
    try { await registrarMovimento('sangria', valor) }
    catch (e: any) { alert(e.message) }
  }

  async function handleSuprimento() {
    const v = window.prompt('Valor do suprimento (R$):')
    if (!v) return
    const valor = parseFloat(v.replace(',', '.'))
    if (isNaN(valor) || valor <= 0) return
    try { await registrarMovimento('suprimento', valor) }
    catch (e: any) { alert(e.message) }
  }

  async function handleFecharCaixa() {
    if (!window.confirm('Fechar o caixa agora?')) return
    const v = window.prompt('Saldo final em caixa (R$):')
    if (v === null) return
    const saldo = parseFloat(v.replace(',', '.')) || 0
    try { await fecharCaixa(saldo); router.push('/pdv') }
    catch (e: any) { alert(e.message) }
  }

  // ── Shared input change ────────────────────────────────────────────────────

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    setInput(e.target.value)
    buscarPorTexto(e.target.value)
  }

  function clearInput(focusRef: React.RefObject<HTMLInputElement>) {
    setInput('')
    setResultados([])
    focusRef.current?.focus()
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <>

      {/* ══════════════ MOBILE layout (hidden on md+) ══════════════ */}
      <div className="flex flex-col h-full md:hidden">

        {/* Input bar */}
        <div className="p-3 bg-deep-ocean border-b border-ocean-depth flex gap-2 sticky top-0 z-10">
          <div className="flex-1 relative">
            <input
              ref={mobileInputRef}
              value={input}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder="Código de barras ou nome do produto..."
              autoComplete="off"
              className="w-full min-h-[52px] bg-midnight border border-ocean-depth rounded-xl px-4 pr-10 text-sm text-sea-foam placeholder-steel outline-none focus:border-electric-cyan"
            />
            {input && (
              <button onClick={() => clearInput(mobileInputRef)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-steel hover:text-sea-foam flex items-center justify-center">
                <X size={16} />
              </button>
            )}
          </div>
          <button onClick={toggleCamera} title="Escanear com câmera"
            className={`min-h-[52px] min-w-[52px] rounded-xl flex items-center justify-center transition-colors ${
              scanAtivo ? 'bg-electric-cyan text-midnight' : 'bg-ocean-depth text-sea-foam'
            }`}>
            <Camera size={22} />
          </button>
        </div>

        {/* Search results */}
        {resultados.length > 0 && (
          <div className="mx-3 mt-2 bg-deep-ocean border border-ocean-depth rounded-2xl overflow-hidden z-10 relative">
            {resultados.slice(0, 5).map(p => (
              <button key={p.id} onClick={() => selecionarProduto(p)}
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-ocean-depth transition-colors border-b border-ocean-depth last:border-0 text-left">
                <div>
                  <p className="text-sea-foam text-sm font-medium">{p.nome}</p>
                  <p className="text-steel text-xs">{p.total_versoes} var.</p>
                </div>
                <p className="text-electric-cyan text-sm font-semibold">R$ {Number(p.preco_base).toFixed(2)}</p>
              </button>
            ))}
          </div>
        )}

        {erro && <p className="mx-3 mt-2 text-red-400 text-xs text-center">{erro}</p>}

        {/* Cliente */}
        <div className="mx-3 mt-3">
          {cliente_id ? (
            <div className="flex items-center justify-between bg-electric-cyan/10 border border-electric-cyan/30 rounded-xl px-4 py-2">
              <div className="flex items-center gap-2">
                <User size={14} className="text-electric-cyan shrink-0" />
                <p className="text-sea-foam text-sm">{cliente_nome}</p>
              </div>
              <button onClick={() => setCliente(null, null)} className="text-steel hover:text-sea-foam text-xs">Remover</button>
            </div>
          ) : (
            <button onClick={() => router.push('/pdv/cliente')}
              className="w-full min-h-[44px] border border-ocean-depth rounded-xl text-steel text-sm hover:border-teal-current transition-colors flex items-center justify-center gap-2">
              <User size={14} />
              Vincular cliente (opcional)
            </button>
          )}
        </div>

        {/* Sacola */}
        <div className="flex-1 overflow-y-auto px-3 py-2">
          {itens.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <ShoppingCart size={38} className="text-white opacity-30" />
              <p className="text-steel text-sm">Sacola vazia</p>
              <p className="text-steel text-xs opacity-60">Escaneie ou busque um produto</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {itens.map(item => {
                const label = Object.values(item.atributos).join(' / ') || 'Versão única'
                return (
                  <div key={item.versao_id} className="bg-deep-ocean border border-ocean-depth rounded-2xl p-3 flex gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sea-foam text-sm font-medium truncate">{item.nome}</p>
                      <p className="text-steel text-xs">{label}</p>
                      <p className="text-electric-cyan text-sm font-semibold mt-0.5">
                        R$ {(item.preco_unitario * item.quantidade).toFixed(2)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button onClick={() => setQtd(item.versao_id, item.quantidade - 1)}
                        className="w-9 h-9 bg-ocean-depth text-sea-foam rounded-xl text-lg font-bold flex items-center justify-center">−</button>
                      <span className="text-sea-foam font-semibold w-6 text-center text-sm">{item.quantidade}</span>
                      <button onClick={() => setQtd(item.versao_id, item.quantidade + 1)}
                        className="w-9 h-9 bg-ocean-depth text-sea-foam rounded-xl text-lg font-bold flex items-center justify-center">+</button>
                      <button onClick={() => removeItem(item.versao_id)}
                        className="w-9 h-9 text-steel hover:text-red-400 rounded-xl flex items-center justify-center">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-deep-ocean border-t border-ocean-depth">
          {itens.length > 0 && (
            <div className="flex items-center justify-between mb-3 px-1">
              <div>
                <p className="text-steel text-xs">{totalQtd} item(ns)</p>
                <p className="text-sea-foam font-bold text-xl">R$ {total.toFixed(2)}</p>
              </div>
              <button onClick={limpar} className="text-steel text-xs hover:text-red-400 flex items-center gap-1">
                <Trash2 size={12} /> Limpar
              </button>
            </div>
          )}
          <button
            disabled={itens.length === 0}
            onClick={() => router.push('/pdv/checkout')}
            className="w-full min-h-[56px] bg-electric-cyan text-midnight rounded-2xl text-base font-bold disabled:opacity-30 active:scale-[0.98] transition-transform"
          >
            {itens.length === 0 ? 'Sacola vazia' : 'Fechar Venda →'}
          </button>
        </div>

      </div>

      {/* ══════════════ DESKTOP layout (hidden below md) ══════════════ */}
      <div className="hidden md:block" style={{ position: 'fixed', inset: 0, zIndex: 100 }}>

        {/* Frost overlay */}
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(8,20,35,0.52)', zIndex: 0, pointerEvents: 'none' }} />

        {/* ── Topbar ─────────────────────────────────────────────────── */}
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, height: '38px', zIndex: 10, background: 'rgba(8,18,30,0.6)', backdropFilter: 'blur(12px)', borderBottom: '0.5px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px' }}>
          <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
            <span style={{ color: '#0ef', fontWeight: 600, fontSize: '12px' }}>PDV</span>
            <Link href="/pdv/historico" style={{ color: 'rgba(255,255,255,0.35)', fontSize: '12px', textDecoration: 'none' }}>Histórico</Link>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '26px', height: '26px', borderRadius: '50%', background: 'rgba(0,239,255,0.15)', border: '1px solid rgba(0,239,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 700, color: '#0ef', flexShrink: 0 }}>
              {initials}
            </div>
            <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.55)', maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {usuario?.nome}
            </span>
          </div>
        </div>

        {/* ── Main area ──────────────────────────────────────────────── */}
        <div style={{ position: 'fixed', top: '38px', left: 0, right: '260px', bottom: 0, display: 'flex', flexDirection: 'column', zIndex: 2 }}>

          {/* Products list */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '10px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {erro && (
              <div style={{ background: 'rgba(240,100,100,0.1)', border: '0.5px solid rgba(240,100,100,0.25)', borderRadius: '7px', padding: '8px 12px', marginBottom: '2px' }}>
                <p style={{ fontSize: '12px', color: 'rgba(248,113,113,0.85)', margin: 0 }}>{erro}</p>
              </div>
            )}
            {itens.length === 0 && !erro ? (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '10px', minHeight: '200px' }}>
                <ShoppingCart size={38} style={{ color: 'white', opacity: 0.12 }} />
                <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.25)', margin: 0 }}>Sacola vazia</p>
                <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.15)', margin: 0 }}>Escaneie ou busque um produto abaixo</p>
              </div>
            ) : (
              itens.map(item => {
                const label = Object.values(item.atributos).join(' / ') || 'Versão única'
                return (
                  <div key={item.versao_id} style={{ background: 'rgba(8,18,30,0.35)', border: '0.5px solid rgba(255,255,255,0.07)', borderRadius: '8px', padding: '10px 12px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.8)', fontWeight: 500, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.nome}</p>
                      <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)', margin: '2px 0 0' }}>{label}</p>
                      <p style={{ fontSize: '13px', color: '#0ef', margin: '2px 0 0', fontWeight: 500 }}>R$ {(item.preco_unitario * item.quantidade).toFixed(2)}</p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
                      <QtyBtn onClick={() => setQtd(item.versao_id, item.quantidade - 1)}>−</QtyBtn>
                      <span style={{ width: '26px', textAlign: 'center', fontSize: '13px', color: 'rgba(255,255,255,0.8)', fontWeight: 500 }}>{item.quantidade}</span>
                      <QtyBtn onClick={() => setQtd(item.versao_id, item.quantidade + 1)}>+</QtyBtn>
                      <button onClick={() => removeItem(item.versao_id)} style={{ width: '28px', height: '28px', background: 'rgba(255,255,255,0.04)', border: '0.5px solid rgba(255,255,255,0.08)', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', marginLeft: '2px' }}>
                        <Trash2 size={13} style={{ color: 'rgba(255,255,255,0.2)' }} />
                      </button>
                    </div>
                  </div>
                )
              })
            )}
          </div>

          {/* Search results dropdown */}
          {resultados.length > 0 && (
            <div style={{ position: 'absolute', bottom: '52px', left: '12px', right: '12px', background: 'rgba(8,18,30,0.95)', border: '0.5px solid rgba(255,255,255,0.12)', borderRadius: '8px', backdropFilter: 'blur(12px)', zIndex: 20, overflow: 'hidden' }}>
              {resultados.slice(0, 5).map((p, i) => (
                <DropdownRow key={p.id} p={p} onSelect={() => selecionarProduto(p)} last={i === Math.min(resultados.length, 5) - 1} />
              ))}
            </div>
          )}

          {/* Input bar */}
          <div style={{ height: '52px', flexShrink: 0, background: 'rgba(8,18,30,0.65)', borderTop: '0.5px solid rgba(255,255,255,0.07)', padding: '0 12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ flex: 1, position: 'relative' }}>
              <input
                ref={desktopInputRef}
                value={input}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                placeholder="Código de barras ou nome do produto..."
                autoComplete="off"
                style={{ flex: 1, width: '100%', background: 'rgba(255,255,255,0.05)', border: '0.5px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '9px 36px 9px 12px', fontSize: '13px', color: 'rgba(255,255,255,0.6)', outline: 'none' }}
                onFocus={e => (e.currentTarget.style.borderColor = 'rgba(0,239,255,0.4)')}
                onBlur={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)')}
              />
              {input && (
                <button onClick={() => clearInput(desktopInputRef)}
                  style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.3)' }}>
                  <X size={14} />
                </button>
              )}
            </div>
            <button onClick={toggleCamera} style={{ width: '34px', height: '34px', flexShrink: 0, background: 'rgba(0,239,255,0.15)', border: '0.5px solid rgba(0,239,255,0.3)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
              <Camera size={16} style={{ color: '#0ef' }} />
            </button>
          </div>
        </div>

        {/* ── Sidebar ────────────────────────────────────────────────── */}
        <div style={{ position: 'fixed', top: '38px', right: 0, width: '260px', bottom: 0, display: 'flex', flexDirection: 'column', gap: '8px', padding: '10px', overflowY: 'auto', zIndex: 2 }}>

          {/* Module 1 — Total */}
          <div style={MOD}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '6px' }}>
              <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'rgba(100,220,160,0.9)', flexShrink: 0 }} />
              <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.45)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                Caixa aberto — {primeiroNome}
              </span>
            </div>
            <div style={{ borderTop: '0.5px solid rgba(255,255,255,0.06)', margin: '10px 0' }} />
            <span style={MOD_LABEL}>Total da venda</span>
            <p style={{ fontSize: '26px', fontWeight: 700, color: '#0ef', margin: '2px 0 4px', lineHeight: 1.1 }}>
              R$ {total.toFixed(2)}
            </p>
            <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.2)', margin: 0 }}>
              {totalQtd} {totalQtd === 1 ? 'item' : 'itens'} · sem desconto
            </p>
          </div>

          {/* Module 2 — Atribuição da venda */}
          <div style={MOD}>
            <span style={MOD_LABEL}>Atribuição da venda</span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>

              {/* Cliente */}
              <div
                role="button"
                onClick={() => router.push('/pdv/cliente')}
                style={{ background: 'rgba(255,255,255,0.04)', border: '0.5px solid rgba(255,255,255,0.07)', borderRadius: '7px', padding: '8px 10px', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}
              >
                <User size={14} style={{ color: 'rgba(255,255,255,0.3)', flexShrink: 0 }} />
                <span style={{ flex: 1, fontSize: '12px', color: cliente_nome ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {cliente_nome ?? 'Adicionar cliente'}
                </span>
                {cliente_nome && (
                  <button
                    onClick={e => { e.stopPropagation(); setCliente(null, null) }}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: 'rgba(255,255,255,0.3)' }}
                  >
                    <X size={12} />
                  </button>
                )}
              </div>

              {/* Vendedor */}
              <button
                onClick={() => setVendedorOpen(true)}
                style={{ background: 'rgba(255,255,255,0.04)', border: '0.5px solid rgba(255,255,255,0.07)', borderRadius: '7px', padding: '8px 10px', display: 'flex', alignItems: 'center', gap: '8px', width: '100%', textAlign: 'left', cursor: 'pointer' }}
              >
                <Briefcase size={14} style={{ color: 'rgba(255,255,255,0.3)', flexShrink: 0 }} />
                <span style={{ fontSize: '12px', color: vendedor_nome ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                  {vendedor_nome ?? 'Selecionar vendedor'}
                </span>
              </button>
            </div>
          </div>

          {/* Module 3 — Gestão do caixa */}
          <div style={MOD}>
            <span style={MOD_LABEL}>Gestão do caixa</span>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <CaixaRow icon={<ShoppingBag size={13} />} label="Sacolas pendentes"   onClick={() => setSacolasOpen(true)} />
              <div style={{ borderTop: '0.5px solid rgba(255,255,255,0.05)' }} />
              <CaixaRow icon={<ArrowUp    size={13} />} label="Sangria — retirada"   onClick={handleSangria} />
              <div style={{ borderTop: '0.5px solid rgba(255,255,255,0.05)' }} />
              <CaixaRow icon={<ArrowDown  size={13} />} label="Suprimento — reforço" onClick={handleSuprimento} />
              <div style={{ borderTop: '0.5px solid rgba(255,255,255,0.05)' }} />
              <CaixaRow icon={<Lock       size={13} />} label="Fechar caixa"         onClick={handleFecharCaixa} danger />
            </div>
          </div>

          {/* Spacer */}
          <div style={{ flex: 1, minHeight: '8px' }} />

          {/* Module 4 — Finalizar venda */}
          <div style={MOD}>
            <span style={MOD_LABEL}>Finalizar venda</span>
            {itens.length === 0 ? (
              <button disabled style={{ width: '100%', padding: '12px', background: 'rgba(255,255,255,0.04)', border: '0.5px solid rgba(255,255,255,0.08)', borderRadius: '8px', fontSize: '13px', color: 'rgba(255,255,255,0.2)', cursor: 'default' }}>
                Sacola vazia
              </button>
            ) : (
              <button onClick={() => router.push('/pdv/checkout')} style={{ width: '100%', padding: '12px', background: 'rgba(0,239,255,0.88)', color: '#0a0a1a', fontWeight: 700, borderRadius: '8px', fontSize: '13px', border: 'none', cursor: 'pointer' }}>
                Fechar venda →
              </button>
            )}
          </div>

        </div>
      </div>

      {/* ══ Camera overlay (shared, full-screen) ══ */}
      {scanAtivo && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 300, background: '#000', display: 'flex', flexDirection: 'column' }}>
          <video ref={videoRef} style={{ flex: 1, width: '100%', objectFit: 'cover' }} playsInline muted />
          <div style={{ position: 'absolute', inset: 0, border: '3px solid rgba(0,239,255,0.4)', pointerEvents: 'none' }} />
          <p style={{ position: 'absolute', top: '50%', left: 0, right: 0, textAlign: 'center', color: '#0ef', fontSize: '14px', fontWeight: 500 }}>
            Aponte para o código de barras
          </p>
          <button onClick={stopCamera} style={{ position: 'absolute', top: '20px', right: '20px', width: '44px', height: '44px', background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#fff' }}>
            <X size={20} />
          </button>
        </div>
      )}

      {/* ══ Modals ══ */}
      <SacolasModal open={sacolasOpen} onClose={() => setSacolasOpen(false)} onCarregada={focusInput} />
      <SalespersonSearchModal
        open={vendedorOpen}
        onClose={() => setVendedorOpen(false)}
        onSelect={() => setVendedorOpen(false)}
      />
    </>
  )
}

// ── Dropdown row (desktop search results) ─────────────────────────────────────

function DropdownRow({ p, onSelect, last }: { p: ProdutoSearch; onSelect: () => void; last: boolean }) {
  const [hov, setHov] = useState(false)
  return (
    <button
      onClick={onSelect}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: hov ? 'rgba(255,255,255,0.04)' : 'transparent', border: 'none', borderBottom: last ? 'none' : '0.5px solid rgba(255,255,255,0.06)', cursor: 'pointer', textAlign: 'left', transition: 'background 0.1s' }}
    >
      <div>
        <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.8)', margin: 0 }}>{p.nome}</p>
        <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)', margin: 0 }}>{p.total_versoes} variação(ões)</p>
      </div>
      <span style={{ fontSize: '13px', color: '#0ef', fontWeight: 600, flexShrink: 0, marginLeft: '12px' }}>
        R$ {Number(p.preco_base).toFixed(2)}
      </span>
    </button>
  )
}
