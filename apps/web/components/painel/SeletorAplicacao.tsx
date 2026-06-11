'use client'

import { useEffect, useState, useMemo } from 'react'
import { produtosApi, type Produto } from '@/lib/api/produtos'
import { promocoesApi } from '@/lib/api/promocoes'

export interface AplicacaoData {
  aplica_todos:    boolean
  categorias_alvo: string[]
  produtos_ids:    string[]
}

interface Props {
  value:    AplicacaoData
  onChange: (v: AplicacaoData) => void
}

type ConflitosMap = Record<string, string>  // produto_id → nome da promoção em conflito

const CAT_COLORS = ['#f59e0b', '#0ef', '#64dca0', '#a78bfa', '#f87171', '#60a5fa']
function catColor(idx: number): string { return CAT_COLORS[idx % CAT_COLORS.length] }

export function SeletorAplicacao({ value, onChange }: Props) {
  // ── Nomes para exibição nas chips ────────────────────────────────────
  const [nomeMap, setNomeMap] = useState<Record<string, string>>({})

  useEffect(() => {
    const faltam = value.produtos_ids.filter(id => !nomeMap[id])
    if (!faltam.length) return
    Promise.all(faltam.map(id => produtosApi.get(id).catch(() => null))).then(ps => {
      const m: Record<string, string> = {}
      ps.forEach(p => { if (p) m[p.id] = p.nome })
      setNomeMap(prev => ({ ...prev, ...m }))
    })
  }, [value.produtos_ids])

  // ── Estado do modal ──────────────────────────────────────────────────
  const [modalOpen,        setModalOpen]        = useState(false)
  const [produtos,         setProdutos]         = useState<Produto[]>([])
  const [loading,          setLoading]          = useState(false)
  const [busca,            setBusca]            = useState('')
  const [selected,         setSelected]         = useState<Set<string>>(new Set())
  const [initialIds,       setInitialIds]       = useState<string[]>([])
  const [expandedCat,      setExpandedCat]      = useState<string | null>(null)
  const [conflitosMap,     setConflitosMap]     = useState<ConflitosMap>({})
  const [conflictAccepted, setConflictAccepted] = useState(false)
  const [aviso,            setAviso]            = useState<{ type: 'single' | 'multi'; pendingAdd: string[] } | null>(null)

  // ── Abre o modal, carrega produtos + conflitos ───────────────────────
  async function abrirModal() {
    const ids = [...value.produtos_ids]
    setInitialIds(ids)
    setSelected(new Set(ids))
    setConflictAccepted(false)
    setAviso(null)
    setBusca('')
    setExpandedCat(null)
    setModalOpen(true)
    setLoading(true)
    try {
      const ps = await produtosApi.list(undefined, false)
      setProdutos(ps)
      const m: Record<string, string> = {}
      ps.forEach(p => { m[p.id] = p.nome })
      setNomeMap(prev => ({ ...prev, ...m }))
      if (ps.length) {
        const allIds = ps.map(p => p.id)
        const { conflitos } = await promocoesApi.conflitos(allIds)
        const cm: ConflitosMap = {}
        conflitos.forEach(c => { cm[c.produto_id] = c.promocao_nome })
        setConflitosMap(cm)
      }
    } catch {
      // non-fatal: conflict tags simply won't appear
    } finally {
      setLoading(false)
    }
  }

  // ── Produtos agrupados + filtrados ───────────────────────────────────
  const grouped = useMemo(() => {
    const q = busca.toLowerCase()
    const filtered = produtos.filter(p =>
      !q ||
      p.nome.toLowerCase().includes(q) ||
      (p.categoria ?? '').toLowerCase().includes(q)
    )
    const map = new Map<string, Produto[]>()
    filtered.forEach(p => {
      const cat = p.categoria ?? 'Sem categoria'
      if (!map.has(cat)) map.set(cat, [])
      map.get(cat)!.push(p)
    })
    return map
  }, [produtos, busca])

  const catList = useMemo(() => Array.from(grouped.keys()), [grouped])

  // ── Estado do checkbox de categoria ──────────────────────────────────
  function catCheckState(catName: string): 'none' | 'partial' | 'all' {
    const prods = grouped.get(catName) ?? []
    if (!prods.length) return 'none'
    const n = prods.filter(p => selected.has(p.id)).length
    return n === 0 ? 'none' : n === prods.length ? 'all' : 'partial'
  }

  // ── Verifica se produto é conflitante (não é da seleção original) ────
  function isConflicting(prodId: string): boolean {
    return !!conflitosMap[prodId] && !initialIds.includes(prodId)
  }

  // ── Toggle produto individual ─────────────────────────────────────────
  function handleProdutoToggle(prodId: string) {
    if (selected.has(prodId)) {
      setSelected(prev => { const s = new Set(prev); s.delete(prodId); return s })
      return
    }
    if (isConflicting(prodId) && !conflictAccepted) {
      setAviso({ type: 'single', pendingAdd: [prodId] })
      return
    }
    setSelected(prev => new Set([...prev, prodId]))
  }

  // ── Toggle categoria inteira ──────────────────────────────────────────
  function handleCatToggle(catName: string) {
    const prods = grouped.get(catName) ?? []
    const state = catCheckState(catName)
    if (state !== 'none') {
      setSelected(prev => {
        const s = new Set(prev)
        prods.forEach(p => s.delete(p.id))
        return s
      })
      return
    }
    const toAdd      = prods.filter(p => !selected.has(p.id)).map(p => p.id)
    const confliting = toAdd.filter(id => isConflicting(id))
    if (confliting.length && !conflictAccepted) {
      setAviso({ type: 'multi', pendingAdd: toAdd })
      return
    }
    setSelected(prev => new Set([...prev, ...toAdd]))
  }

  // ── Aviso 1 ───────────────────────────────────────────────────────────
  function handleAvisoConfirmar() {
    if (!aviso) return
    setConflictAccepted(true)
    setSelected(prev => new Set([...prev, ...aviso.pendingAdd]))
    setAviso(null)
  }

  // ── Confirmar seleção ────────────────────────────────────────────────
  function handleConfirmar() {
    onChange({ aplica_todos: false, categorias_alvo: [], produtos_ids: Array.from(selected) })
    setModalOpen(false)
  }

  // ── Chips area helpers ───────────────────────────────────────────────
  function toggleTodos() {
    onChange(value.aplica_todos
      ? { ...value, aplica_todos: false }
      : { aplica_todos: true, categorias_alvo: [], produtos_ids: [] }
    )
  }

  function removerCategoria(cat: string) {
    onChange({ ...value, categorias_alvo: value.categorias_alvo.filter(c => c !== cat) })
  }

  function removerProduto(id: string) {
    onChange({ ...value, produtos_ids: value.produtos_ids.filter(p => p !== id) })
  }

  // ── Render ────────────────────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>

      {/* ── Chips ── */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center' }}>
        {value.aplica_todos && (
          <span style={chipStyle('#0ef')}>
            Todos os produtos
            <ChipX onClick={toggleTodos} />
          </span>
        )}
        {value.categorias_alvo.map(cat => (
          <span key={cat} style={chipStyle('rgba(100,220,160,0.85)')}>
            📂 {cat}
            <ChipX onClick={() => removerCategoria(cat)} />
          </span>
        ))}
        {value.produtos_ids.map(id => (
          <span key={id} style={chipStyle('rgba(100,220,160,0.8)')}>
            {nomeMap[id] ?? '…'}
            <ChipX onClick={() => removerProduto(id)} />
          </span>
        ))}
        {!value.aplica_todos && (
          <button type="button" onClick={abrirModal}
            style={{ fontSize: '11px', color: 'rgba(0,239,255,0.7)', border: '0.5px solid rgba(0,239,255,0.25)', padding: '4px 12px', borderRadius: '999px', background: 'transparent', cursor: 'pointer' }}>
            + Adicionar
          </button>
        )}
      </div>

      {/* ── Modal overlay ── */}
      {modalOpen && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 900, background: 'rgba(0,0,0,0.72)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}
          onClick={e => { if (e.target === e.currentTarget) setModalOpen(false) }}
        >
          <div style={{ background: '#0d1a26', border: '0.5px solid rgba(255,255,255,0.1)', borderRadius: '16px', width: '100%', maxWidth: '460px', maxHeight: '80vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', borderBottom: '0.5px solid rgba(255,255,255,0.07)', flexShrink: 0 }}>
              <div>
                <p style={{ fontSize: '13px', fontWeight: 600, color: 'rgba(255,255,255,0.85)' }}>Selecionar produtos</p>
                <p style={{ fontSize: '11px', color: 'rgba(0,239,255,0.7)', marginTop: '2px' }}>
                  {selected.size} selecionado{selected.size !== 1 ? 's' : ''}
                </p>
              </div>
              <button type="button" onClick={() => setModalOpen(false)}
                style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'rgba(255,255,255,0.06)', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.5)', fontSize: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                ×
              </button>
            </div>

            {/* Search */}
            <div style={{ padding: '10px 14px', borderBottom: '0.5px solid rgba(255,255,255,0.05)', flexShrink: 0, position: 'relative' }}>
              <input
                value={busca}
                onChange={e => setBusca(e.target.value)}
                placeholder="Buscar produto ou categoria..."
                style={{ width: '100%', background: 'rgba(8,18,30,0.6)', border: '0.5px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '8px 34px 8px 12px', fontSize: '12px', color: 'rgba(255,255,255,0.75)', outline: 'none', boxSizing: 'border-box' }}
              />
              {busca && (
                <button type="button" onClick={() => setBusca('')}
                  style={{ position: 'absolute', right: '22px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.35)', fontSize: '16px', padding: '0' }}>
                  ×
                </button>
              )}
            </div>

            {/* Accordion list */}
            <div style={{ flex: 1, overflowY: 'auto' }}>
              {loading ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '40px 0' }}>
                  <div className="animate-spin" style={{ width: '22px', height: '22px', border: '2px solid rgba(0,239,255,0.15)', borderTopColor: '#0ef', borderRadius: '50%' }} />
                </div>
              ) : catList.length === 0 ? (
                <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.25)', fontSize: '12px', padding: '36px 0' }}>
                  {busca ? 'Nenhum produto encontrado' : 'Nenhum produto cadastrado'}
                </p>
              ) : catList.map((catName, catIdx) => {
                const prods     = grouped.get(catName)!
                const isOpen    = expandedCat === catName
                const checkState = catCheckState(catName)
                const selCount  = prods.filter(p => selected.has(p.id)).length
                const color     = catColor(catIdx)

                return (
                  <div key={catName} style={{ borderBottom: '0.5px solid rgba(255,255,255,0.04)' }}>

                    {/* Category header */}
                    <div style={{ display: 'flex', alignItems: 'center', padding: '10px 14px', gap: '10px' }}>
                      {/* Category checkbox */}
                      <button
                        type="button"
                        onClick={e => { e.stopPropagation(); handleCatToggle(catName) }}
                        style={{
                          width: '16px', height: '16px', borderRadius: '3px', flexShrink: 0,
                          border: `1.5px solid ${checkState !== 'none' ? color : 'rgba(255,255,255,0.2)'}`,
                          background: checkState === 'all' ? color : checkState === 'partial' ? `rgba(0,0,0,0)` : 'transparent',
                          outline: checkState === 'partial' ? `1.5px solid ${color}` : 'none',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                        }}
                      >
                        {checkState === 'all'     && <span style={{ color: '#0d1a26', fontSize: '9px', fontWeight: 700, lineHeight: 1 }}>✓</span>}
                        {checkState === 'partial' && <span style={{ color: color,     fontSize: '11px', fontWeight: 700, lineHeight: 1 }}>–</span>}
                      </button>

                      {/* Color dot + name + badge + chevron */}
                      <div
                        style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', minWidth: 0 }}
                        onClick={() => setExpandedCat(isOpen ? null : catName)}
                      >
                        <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: color, flexShrink: 0 }} />
                        <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.75)', fontWeight: 500, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {catName}
                        </span>
                        <span style={{
                          fontSize: '10px', borderRadius: '99px', padding: '1px 7px', flexShrink: 0,
                          background: selCount > 0 ? `${color}22` : 'rgba(255,255,255,0.05)',
                          color:      selCount > 0 ? color : 'rgba(255,255,255,0.25)',
                          border:     `0.5px solid ${selCount > 0 ? `${color}44` : 'rgba(255,255,255,0.08)'}`,
                        }}>
                          {selCount > 0 ? `${selCount}/${prods.length}` : prods.length}
                        </span>
                        <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: '10px', transition: 'transform 0.2s', transform: isOpen ? 'rotate(180deg)' : 'none', flexShrink: 0 }}>
                          ▼
                        </span>
                      </div>
                    </div>

                    {/* Product grid */}
                    {isOpen && (
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', padding: '2px 14px 12px' }}>
                        {prods.map(prod => {
                          const isSel      = selected.has(prod.id)
                          const showConflito = isConflicting(prod.id)
                          const conflitName  = conflitosMap[prod.id]
                          return (
                            <button
                              key={prod.id}
                              type="button"
                              onClick={() => handleProdutoToggle(prod.id)}
                              style={{
                                display: 'flex', flexDirection: 'column', gap: '3px', padding: '8px',
                                background: isSel ? 'rgba(0,239,255,0.06)' : 'rgba(255,255,255,0.02)',
                                border: `0.5px solid ${isSel ? 'rgba(0,239,255,0.22)' : 'rgba(255,255,255,0.06)'}`,
                                borderRadius: '8px', cursor: 'pointer', textAlign: 'left',
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '6px' }}>
                                <span style={{
                                  width: '13px', height: '13px', borderRadius: '3px', flexShrink: 0, marginTop: '1px',
                                  border: `1.5px solid ${isSel ? '#0ef' : 'rgba(255,255,255,0.18)'}`,
                                  background: isSel ? '#0ef' : 'transparent',
                                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                                }}>
                                  {isSel && <span style={{ color: '#0d1a26', fontSize: '7px', fontWeight: 700, lineHeight: 1 }}>✓</span>}
                                </span>
                                <span style={{ fontSize: '11px', color: isSel ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.5)', lineHeight: 1.35, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                                  {prod.nome}
                                </span>
                              </div>
                              <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.25)', paddingLeft: '19px' }}>
                                R$ {Number(prod.preco_base).toFixed(2)}
                              </span>
                              {showConflito && conflitName && (
                                <span style={{ fontSize: '9px', color: '#f59e0b', background: 'rgba(245,158,11,0.1)', border: '0.5px solid rgba(245,158,11,0.25)', borderRadius: '4px', padding: '2px 5px', marginLeft: '19px', display: 'inline-block', maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  ⚠ {conflitName}
                                </span>
                              )}
                            </button>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            {/* Footer */}
            <div style={{ padding: '10px 14px', borderTop: '0.5px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
              <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)' }}>
                {selected.size} produto{selected.size !== 1 ? 's' : ''} selecionado{selected.size !== 1 ? 's' : ''}
              </span>
              <button type="button" onClick={handleConfirmar}
                style={{ background: 'rgba(0,239,255,0.85)', color: '#0a0a1a', fontWeight: 600, borderRadius: '8px', padding: '8px 18px', fontSize: '12px', border: 'none', cursor: 'pointer' }}>
                Confirmar seleção
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Aviso 1 — conflito (z-index above modal) ── */}
      {aviso && modalOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 910, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div style={{ background: '#0d1a26', border: '0.5px solid rgba(234,179,8,0.25)', borderRadius: '12px', width: '100%', maxWidth: '320px', padding: '18px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
              <span style={{ fontSize: '15px', flexShrink: 0, marginTop: '1px' }}>⚠️</span>
              <div>
                <p style={{ fontSize: '12px', fontWeight: 600, color: 'rgba(255,255,255,0.85)', marginBottom: '5px' }}>Conflito de promoção</p>
                <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.45)', lineHeight: 1.55 }}>
                  {aviso.type === 'single'
                    ? 'O produto selecionado já está vinculado a outra promoção. Ao confirmar, será transferido para esta promoção.'
                    : 'Um ou mais produtos selecionados já estão vinculados a outras promoções. Ao confirmar, serão transferidos para esta promoção.'
                  }
                </p>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button type="button" onClick={() => setAviso(null)}
                style={{ background: 'rgba(255,255,255,0.06)', border: '0.5px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.55)', borderRadius: '8px', padding: '7px 12px', fontSize: '11px', cursor: 'pointer' }}>
                Cancelar seleção
              </button>
              <button type="button" onClick={handleAvisoConfirmar}
                style={{ background: 'rgba(234,179,8,0.12)', border: '0.5px solid rgba(234,179,8,0.4)', color: '#f59e0b', borderRadius: '8px', padding: '7px 12px', fontSize: '11px', cursor: 'pointer', fontWeight: 500 }}>
                Entendi, continuar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function chipStyle(color: string): React.CSSProperties {
  return {
    display: 'inline-flex', alignItems: 'center', gap: '5px',
    fontSize: '11px', color,
    background: 'rgba(8,18,30,0.5)',
    border: '0.5px solid rgba(255,255,255,0.12)',
    padding: '4px 10px', borderRadius: '999px',
  }
}

function ChipX({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" onClick={onClick}
      style={{ lineHeight: 1, cursor: 'pointer', color: 'inherit', background: 'none', border: 'none', padding: 0, opacity: 0.6 }}>
      ×
    </button>
  )
}
