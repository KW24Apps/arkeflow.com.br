'use client'

import { useEffect, useState } from 'react'
import { Tag, Gift, ShoppingBag, Star } from 'lucide-react'
import { TopBar } from '@/components/layout/TopBar'
import { ConfirmModal } from '@/components/ui/ConfirmModal'
import { SeletorAplicacao, type AplicacaoData } from '@/components/painel/SeletorAplicacao'
import { promocoesApi, type Promocao } from '@/lib/api/promocoes'
import { formatCurrency, parseCurrency } from '@/lib/utils/currency'

type Tipo = 'desconto_percentual' | 'desconto_fixo' | 'segunda_peca' | 'compre_ganhe' | 'primeira_compra'

const TIPOS: { value: Tipo; label: string }[] = [
  { value: 'desconto_percentual', label: 'Desconto %' },
  { value: 'desconto_fixo',       label: 'Desconto R$' },
  { value: 'segunda_peca',        label: '2ª Peça c/ Desc.' },
  { value: 'compre_ganhe',        label: 'Compre X Leve Y' },
  { value: 'primeira_compra',     label: 'Primeira Compra' },
]

const TIPO_LABEL: Record<string, string> = {
  desconto_percentual: 'Desconto %',
  desconto_fixo:       'Desconto R$',
  segunda_peca:        '2ª Peça c/ Desc.',
  compre_ganhe:        'Compre X Leve Y',
  primeira_compra:     'Primeira Compra',
}

const CARD: React.CSSProperties = {
  background: 'rgba(8,18,30,0.48)',
  backdropFilter: 'blur(8px)',
  border: '0.5px solid rgba(255,255,255,0.09)',
  borderRadius: '10px',
}

const INPUT_STYLE: React.CSSProperties = {
  background: 'rgba(8,18,30,0.5)',
  border: '0.5px solid rgba(255,255,255,0.12)',
  borderRadius: '8px',
  padding: '9px 12px',
  fontSize: '13px',
  color: 'rgba(255,255,255,0.75)',
  width: '100%',
  outline: 'none',
}

function focusIn(e: React.FocusEvent<HTMLInputElement>) {
  e.currentTarget.style.borderColor = 'rgba(0,239,255,0.4)'
}
function focusOut(e: React.FocusEvent<HTMLInputElement>) {
  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'
}

function Lbl({ children }: { children: React.ReactNode }) {
  return (
    <label style={{ display: 'block', fontSize: '9px', textTransform: 'uppercase' as const, letterSpacing: '0.1em', color: 'rgba(255,255,255,0.35)', marginBottom: '4px' }}>
      {children}
    </label>
  )
}

function TipoIcon({ tipo, size = 20 }: { tipo: string; size?: number }) {
  const s = { color: 'rgba(255,255,255,0.4)' }
  switch (tipo) {
    case 'desconto_percentual':
    case 'desconto_fixo':    return <Tag         size={size} style={s} />
    case 'compre_ganhe':     return <Gift        size={size} style={s} />
    case 'segunda_peca':     return <ShoppingBag size={size} style={s} />
    case 'primeira_compra':  return <Star        size={size} style={s} />
    default:                 return <Tag         size={size} style={s} />
  }
}

export default function PromocoesPage() {
  const [promos,     setPromos]     = useState<Promocao[]>([])
  const [loading,    setLoading]    = useState(true)
  const [busca,      setBusca]      = useState('')
  const [formOpen,   setFormOpen]   = useState(false)
  const [editandoId, setEditandoId] = useState<string | null>(null)
  const [salvando,   setSalvando]   = useState(false)
  const [erro,       setErro]       = useState('')
  const [erroToggle, setErroToggle] = useState('')
  const [modal, setModal] = useState<{ open: boolean; onConfirm: () => void }>({ open: false, onConfirm: () => {} })

  // Form state
  const [tipo,          setTipo]          = useState<Tipo>('desconto_percentual')
  const [nome,          setNome]          = useState('')
  const [codigo,        setCodigo]        = useState('')
  const [valor,         setValor]         = useState('')
  const [percentBrinde, setPercentBrinde] = useState('50')
  const [compre,        setCompre]        = useState('2')
  const [ganhe,         setGanhe]         = useState('1')
  const [semVencimento, setSemVencimento] = useState(true)
  const [inicio,        setInicio]        = useState('')
  const [fim,           setFim]           = useState('')
  const [aplicacao,     setAplicacao]     = useState<AplicacaoData>({ aplica_todos: false, categorias_alvo: [], produtos_ids: [] })

  async function load() {
    setLoading(true)
    try { setPromos(await promocoesApi.list(true)) }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  function abrirNova() {
    setTipo('desconto_percentual'); setNome(''); setCodigo(''); setValor('')
    setPercentBrinde('50'); setCompre('2'); setGanhe('1')
    setSemVencimento(true); setInicio(''); setFim('')
    setAplicacao({ aplica_todos: false, categorias_alvo: [], produtos_ids: [] })
    setEditandoId(null); setErro(''); setFormOpen(true)
  }

  async function abrirEdicao(id: string) {
    setErro(''); setEditandoId(id); setFormOpen(true)
    const p = await promocoesApi.get(id) as any
    setTipo(p.tipo)
    setNome(p.nome)
    setCodigo(p.codigo ?? '')
    setValor(p.tipo === 'desconto_fixo'
      ? (p.valor_desconto ? Number(p.valor_desconto).toFixed(2).replace('.', ',') : '')
      : (p.valor_desconto ? String(p.valor_desconto) : ''))
    setPercentBrinde(p.percentual_brinde ? String(p.percentual_brinde) : '50')
    setCompre(p.quantidade_compre ? String(p.quantidade_compre) : '2')
    setGanhe(p.quantidade_brinde ? String(p.quantidade_brinde) : '1')
    const temPeriodo = !!(p.inicio || p.fim)
    setSemVencimento(!temPeriodo)
    setInicio(p.inicio ?? '')
    setFim(p.fim ?? '')
    setAplicacao({
      aplica_todos:    p.aplica_todos ?? (p.aplicacao === 'todos'),
      categorias_alvo: Array.isArray(p.categorias_alvo) ? p.categorias_alvo : (p.categoria_alvo ? [p.categoria_alvo] : []),
      produtos_ids:    Array.isArray(p.produtos_ids) ? p.produtos_ids : [],
    })
  }

  function fecharForm() {
    setFormOpen(false); setEditandoId(null); setErro('')
  }

  async function handleSalvar() {
    setErro('')
    if (!nome.trim()) { setErro('Nome é obrigatório.'); return }
    const nenhuma = !aplicacao.aplica_todos && !aplicacao.categorias_alvo.length && !aplicacao.produtos_ids.length
    if (nenhuma && tipo !== 'primeira_compra') { setErro('Selecione onde a promoção será aplicada.'); return }
    setSalvando(true)
    try {
      const data: any = {
        nome,
        codigo:          codigo.trim().toUpperCase() || null,
        tipo,
        aplica_todos:    tipo === 'primeira_compra' ? true : aplicacao.aplica_todos,
        categorias_alvo: aplicacao.categorias_alvo,
        produtos_ids:    aplicacao.produtos_ids,
        aplicacao:       (tipo === 'primeira_compra' || aplicacao.aplica_todos) ? 'todos'
                       : aplicacao.categorias_alvo.length ? 'categoria'
                       : 'produtos_selecionados',
        valor_desconto: ['desconto_percentual', 'desconto_fixo', 'primeira_compra'].includes(tipo)
                        ? (tipo === 'desconto_fixo' ? parseCurrency(valor) : parseFloat(valor)) : null,
        unidade:        tipo === 'desconto_percentual' ? 'percentual'
                      : tipo === 'desconto_fixo'       ? 'reais' : null,
        percentual_brinde: tipo === 'segunda_peca'  ? parseFloat(percentBrinde) : null,
        quantidade_compre: tipo === 'compre_ganhe'  ? parseInt(compre)          : null,
        quantidade_brinde: tipo === 'compre_ganhe'  ? parseInt(ganhe)           : null,
        inicio: !semVencimento && inicio ? inicio : null,
        fim:    !semVencimento && fim    ? fim    : null,
      }
      if (editandoId) await promocoesApi.update(editandoId, data)
      else await promocoesApi.create({ ...data, ativo: true })
      fecharForm(); await load()
    } catch (err: any) {
      setErro(err?.response?.data?.error ?? 'Erro ao salvar.')
    } finally { setSalvando(false) }
  }

  async function handleToggle(p: Promocao) {
    setErroToggle('')
    try {
      await promocoesApi.update(p.id, { ativo: !p.ativo })
      setPromos(prev => prev.map(x => x.id === p.id ? { ...x, ativo: !x.ativo } : x))
    } catch (err: any) {
      setErroToggle(err?.response?.data?.error ?? 'Erro ao alterar promoção.')
    }
  }

  function handleRemover() {
    if (!editandoId) return
    const id = editandoId
    setModal({
      open: true,
      onConfirm: async () => {
        await promocoesApi.remove(id)
        fecharForm(); await load()
      },
    })
  }

  // Sort: active first; within active sort by fim asc (null fim = no expiry = last)
  const promosOrdenadas = [...promos].sort((a, b) => {
    if (!!a.ativo !== !!b.ativo) return a.ativo ? -1 : 1
    if (a.ativo && b.ativo) {
      if (!a.fim && !b.fim) return 0
      if (!a.fim) return 1
      if (!b.fim) return -1
      return a.fim.localeCompare(b.fim)
    }
    return 0
  })

  const q = busca.trim().toLowerCase()
  const promosFiltradas = q
    ? promosOrdenadas.filter(p => p.nome.toLowerCase().includes(q))
    : promosOrdenadas

  function descricao(p: Promocao): string {
    switch (p.tipo) {
      case 'desconto_percentual': return `${p.valor_desconto}% de desconto`
      case 'desconto_fixo':       return `R$ ${Number(p.valor_desconto).toFixed(2)} de desconto`
      case 'segunda_peca':        return `2ª peça com ${p.percentual_brinde}% off`
      case 'compre_ganhe':        return `Compre ${p.quantidade_compre} leve ${(p.quantidade_compre ?? 0) + (p.quantidade_brinde ?? 0)}`
      case 'primeira_compra':     return `${p.valor_desconto}% na primeira compra`
      default: return ''
    }
  }

  return (
    <>
      <TopBar />
      <main className="flex-1 overflow-y-auto p-4 md:p-6 pb-10 flex flex-col gap-5">

        {/* ── Inline form panel ─────────────────────────────────────────────── */}
        {formOpen && (
          <div style={{ ...CARD, padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.7)', fontWeight: 600 }}>
              {editandoId ? 'Editar promoção' : 'Nova promoção'}
            </p>

            {/* Tipo pill tabs */}
            <div>
              <Lbl>Tipo de promoção</Lbl>
              <div style={{ background: 'rgba(8,18,30,0.4)', borderRadius: '8px', padding: '3px', display: 'flex', flexWrap: 'wrap', gap: '2px' }}>
                {TIPOS.map(t => (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => { setTipo(t.value); setValor('') }}
                    style={{
                      padding: '6px 10px', fontSize: '12px', borderRadius: '6px', border: 'none', cursor: 'pointer',
                      background: tipo === t.value ? 'rgba(0,239,255,0.15)' : 'transparent',
                      color: tipo === t.value ? '#0ef' : 'rgba(255,255,255,0.4)',
                      fontWeight: tipo === t.value ? 500 : 400,
                      whiteSpace: 'nowrap',
                      transition: 'all 0.15s',
                    }}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Filial */}
            <div>
              <Lbl>Filial</Lbl>
              <div style={{ ...INPUT_STYLE, opacity: 0.5, cursor: 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span>Todas as filiais</span>
                <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)' }}>(em breve)</span>
              </div>
            </div>

            {/* Nome + Código */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Lbl>Nome *</Lbl>
                <input
                  value={nome} onChange={e => setNome(e.target.value)}
                  placeholder="Ex: Queima de estoque Junho"
                  onFocus={focusIn} onBlur={focusOut}
                  style={INPUT_STYLE} className="outline-none"
                />
              </div>
              <div>
                <Lbl>Código promocional</Lbl>
                <input
                  value={codigo} onChange={e => setCodigo(e.target.value.toUpperCase())}
                  placeholder="Ex: VERAO20"
                  onFocus={focusIn} onBlur={focusOut}
                  style={{ ...INPUT_STYLE, fontFamily: 'monospace', letterSpacing: '0.08em' }}
                  className="outline-none"
                />
              </div>
            </div>

            {/* Desconto % ou primeira compra */}
            {(tipo === 'desconto_percentual' || tipo === 'primeira_compra') && (
              <div>
                <Lbl>Percentual de desconto (%)</Lbl>
                <input
                  type="number" min="0" max="100" value={valor}
                  onChange={e => setValor(e.target.value)} placeholder="Ex: 20"
                  onFocus={focusIn} onBlur={focusOut}
                  style={INPUT_STYLE} className="outline-none"
                />
              </div>
            )}

            {/* Desconto R$ */}
            {tipo === 'desconto_fixo' && (
              <div>
                <Lbl>Valor do desconto (R$)</Lbl>
                <input
                  type="text" inputMode="numeric" value={valor}
                  onChange={e => setValor(formatCurrency(e.target.value))}
                  onFocus={e => { e.currentTarget.select(); focusIn(e) }}
                  onBlur={focusOut}
                  placeholder="Ex: 30,00"
                  style={INPUT_STYLE} className="outline-none"
                />
              </div>
            )}

            {/* 2ª peça */}
            {tipo === 'segunda_peca' && (
              <div>
                <Lbl>Desconto na 2ª peça mais barata (%)</Lbl>
                <input
                  type="number" min="0" max="100" value={percentBrinde}
                  onChange={e => setPercentBrinde(e.target.value)}
                  onFocus={focusIn} onBlur={focusOut}
                  style={INPUT_STYLE} className="outline-none"
                />
                <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.25)', marginTop: '4px' }}>
                  100% = grátis · 50% = metade do preço
                </p>
              </div>
            )}

            {/* Compre X Leve Y */}
            {tipo === 'compre_ganhe' && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Lbl>Compre (X)</Lbl>
                    <input
                      type="number" min="1" value={compre} onChange={e => setCompre(e.target.value)}
                      onFocus={focusIn} onBlur={focusOut}
                      style={INPUT_STYLE} className="outline-none"
                    />
                  </div>
                  <div>
                    <Lbl>Leve grátis (Y)</Lbl>
                    <input
                      type="number" min="1" value={ganhe} onChange={e => setGanhe(e.target.value)}
                      onFocus={focusIn} onBlur={focusOut}
                      style={INPUT_STYLE} className="outline-none"
                    />
                  </div>
                </div>
                <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.25)', marginTop: '-8px' }}>
                  Compre {compre} leve {parseInt(compre || '0') + parseInt(ganhe || '0')} — as {ganhe} peça(s) mais baratas saem de graça.
                </p>
              </>
            )}

            {/* Onde aplicar */}
            {tipo !== 'primeira_compra' && (
              <div>
                <Lbl>Onde aplicar</Lbl>
                <SeletorAplicacao value={aplicacao} onChange={setAplicacao} />
              </div>
            )}

            {/* Validade */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <Lbl>Validade</Lbl>
                  <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.25)', marginTop: '1px' }}>
                    Sem vencimento = promoção permanente
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSemVencimento(v => !v)}
                  style={{
                    width: '44px', height: '24px', borderRadius: '12px', border: 'none', cursor: 'pointer',
                    position: 'relative', flexShrink: 0,
                    background: semVencimento ? 'rgba(0,239,255,0.8)' : 'rgba(255,255,255,0.12)',
                    transition: 'background 0.2s',
                  }}
                >
                  <span style={{
                    position: 'absolute', top: '4px', width: '16px', height: '16px', borderRadius: '50%', background: '#fff',
                    left: semVencimento ? '24px' : '4px', transition: 'left 0.2s',
                  }} />
                </button>
              </div>
              {!semVencimento && (
                <div className="grid grid-cols-2 gap-3" style={{ marginTop: '10px' }}>
                  <div>
                    <Lbl>Início</Lbl>
                    <input
                      type="date" value={inicio} onChange={e => setInicio(e.target.value)}
                      onFocus={focusIn} onBlur={focusOut}
                      style={INPUT_STYLE} className="outline-none"
                    />
                  </div>
                  <div>
                    <Lbl>Fim</Lbl>
                    <input
                      type="date" value={fim} onChange={e => setFim(e.target.value)}
                      onFocus={focusIn} onBlur={focusOut}
                      style={INPUT_STYLE} className="outline-none"
                    />
                  </div>
                </div>
              )}
            </div>

            {erro && (
              <p style={{ fontSize: '12px', color: 'rgba(248,113,113,0.85)', textAlign: 'center' }}>{erro}</p>
            )}

            {/* Form footer */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
              {editandoId ? (
                <button
                  type="button"
                  onClick={handleRemover}
                  style={{
                    color: 'rgba(240,130,130,0.75)', border: '0.5px solid rgba(240,100,100,0.25)',
                    background: 'rgba(240,100,100,0.08)', borderRadius: '8px',
                    padding: '9px 16px', fontSize: '12px', cursor: 'pointer',
                  }}
                >
                  Remover
                </button>
              ) : <span />}
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  onClick={fecharForm}
                  style={{
                    background: 'rgba(255,255,255,0.06)', border: '0.5px solid rgba(255,255,255,0.12)',
                    color: 'rgba(255,255,255,0.5)', borderRadius: '8px',
                    padding: '9px 16px', fontSize: '12px', cursor: 'pointer',
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSalvar}
                  disabled={salvando}
                  style={{
                    background: 'rgba(0,239,255,0.85)', color: '#0a0a1a', fontWeight: 600,
                    borderRadius: '8px', padding: '9px 20px', fontSize: '12px',
                    border: 'none', cursor: 'pointer', opacity: salvando ? 0.6 : 1,
                  }}
                >
                  {salvando ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Card grid ─────────────────────────────────────────────────────── */}
        {erroToggle && (
          <p style={{ fontSize: '12px', color: 'rgba(248,113,113,0.85)', marginBottom: '8px' }}>{erroToggle}</p>
        )}
        {!loading && (
          <input
            value={busca}
            onChange={e => setBusca(e.target.value)}
            placeholder="Buscar promoção..."
            style={{
              background: 'rgba(8,18,30,0.5)',
              border: '0.5px solid rgba(255,255,255,0.12)',
              borderRadius: '8px',
              padding: '9px 12px',
              fontSize: '13px',
              color: 'rgba(255,255,255,0.75)',
              width: '100%',
              marginBottom: '12px',
              outline: 'none',
            }}
            onFocus={e => (e.currentTarget.style.borderColor = 'rgba(0,239,255,0.4)')}
            onBlur={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)')}
          />
        )}
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="w-6 h-6 border-2 border-electric-cyan border-t-transparent rounded-full animate-spin" />
          </div>
        ) : promosFiltradas.length === 0 ? (
          <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.3)', textAlign: 'center', paddingTop: '48px' }}>
            {busca.trim() ? `Nenhuma promoção encontrada para "${busca}"` : 'Nenhuma promoção cadastrada'}
          </p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 220px))', gap: '12px', justifyContent: 'start' }}>
            {promosFiltradas.map(p => (
              <PromoCard
                key={p.id}
                promo={p}
                descricao={descricao(p)}
                onClick={() => abrirEdicao(p.id)}
                onToggle={() => handleToggle(p)}
                tipoLabel={TIPO_LABEL[p.tipo] ?? p.tipo}
              />
            ))}
          </div>
        )}

        {/* FAB */}
        <button
          onClick={abrirNova}
          className="fixed bottom-6 right-6 z-50 flex items-center justify-center shadow-lg active:scale-95 transition-transform"
          style={{ width: '48px', height: '48px', background: 'rgba(0,239,255,0.9)', borderRadius: '50%', color: '#0a0a1a', fontSize: '24px', fontWeight: 700, border: 'none' }}
        >
          +
        </button>

      </main>

      <ConfirmModal
        isOpen={modal.open}
        title="Remover promoção"
        message="Esta ação não pode ser desfeita."
        confirmLabel="Remover"
        confirmStyle="danger"
        onConfirm={() => { setModal(m => ({ ...m, open: false })); modal.onConfirm() }}
        onCancel={() => setModal(m => ({ ...m, open: false }))}
      />
    </>
  )
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function PromoCard({
  promo, descricao, tipoLabel, onClick, onToggle,
}: {
  promo: Promocao
  descricao: string
  tipoLabel: string
  onClick: () => void
  onToggle: () => void
}) {
  const [hovered, setHovered] = useState(false)

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={e => e.key === 'Enter' && onClick()}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: 'rgba(8,18,30,0.48)',
        backdropFilter: 'blur(8px)',
        border: `0.5px solid ${hovered ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.09)'}`,
        borderRadius: '10px',
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '8px',
        textAlign: 'center',
        cursor: 'pointer',
        opacity: promo.ativo ? 1 : 0.55,
        transition: 'border-color 0.15s, opacity 0.15s',
      }}
    >
      {/* Icon */}
      <div style={{ width: '44px', height: '44px', background: 'rgba(255,255,255,0.04)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <TipoIcon tipo={promo.tipo} />
      </div>

      {/* Nome */}
      <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.8)', fontWeight: 500, width: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {promo.nome}
      </p>

      {/* Tipo badge */}
      <span style={{ fontSize: '9px', background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.3)', borderRadius: '10px', padding: '2px 7px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        {tipoLabel}
      </span>

      {/* Descrição */}
      <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.25)', width: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {descricao}
      </p>

      {/* Toggle ativo */}
      <button
        type="button"
        onClick={e => { e.stopPropagation(); onToggle() }}
        title={promo.ativo ? 'Desativar' : 'Ativar'}
        style={{
          width: '34px', height: '18px', borderRadius: '9px', border: 'none', cursor: 'pointer',
          position: 'relative', flexShrink: 0, marginTop: '2px',
          background: promo.ativo ? 'rgba(0,239,255,0.8)' : 'rgba(255,255,255,0.12)',
          transition: 'background 0.2s',
        }}
      >
        <span style={{
          position: 'absolute', top: '3px', width: '12px', height: '12px', borderRadius: '50%', background: '#fff',
          left: promo.ativo ? '19px' : '3px', transition: 'left 0.2s',
        }} />
      </button>
    </div>
  )
}
