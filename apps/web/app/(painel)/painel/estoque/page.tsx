'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { TopBar } from '@/components/layout/TopBar'
import { estoqueApi, type ItemEstoque, type ResumoEstoque } from '@/lib/api/estoque'

type Tab = 'todos' | 'alertas' | 'sem_estoque'

interface Grupo {
  produto_id:   string
  produto_nome: string
  versoes:      ItemEstoque[]
  temAlerta:    boolean
  semEstoque:   boolean
}

function fmtR(n: number) {
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

const CHIP: React.CSSProperties = {
  fontSize: '10px',
  background: 'rgba(255,255,255,0.06)',
  border: '0.5px solid rgba(255,255,255,0.1)',
  borderRadius: '6px',
  padding: '2px 7px',
  color: 'rgba(255,255,255,0.45)',
  marginRight: '4px',
  display: 'inline-block',
}

function AttrChips({ atributos }: { atributos: Record<string, string> }) {
  const entries = Object.entries(atributos)
  if (entries.length === 0) {
    return <span style={{ ...CHIP, color: 'rgba(255,255,255,0.3)' }}>Versão única</span>
  }
  return (
    <>
      {entries.map(([k, v]) => (
        <span key={k} style={CHIP}>
          {k}: <span style={{ color: 'rgba(255,255,255,0.7)', fontWeight: 500 }}>{v}</span>
        </span>
      ))}
    </>
  )
}

function VersaoRow({ item }: { item: ItemEstoque }) {
  const cor = item.sem_estoque
    ? 'rgba(240,100,100,0.85)'
    : item.alerta
    ? 'rgba(234,179,8,0.9)'
    : 'rgba(255,255,255,0.85)'
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 14px', borderTop: '0.5px solid rgba(255,255,255,0.05)' }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <AttrChips atributos={item.atributos_json} />
      </div>
      <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: '12px' }}>
        <p style={{ fontSize: '14px', fontWeight: 600, color: cor }}>{item.estoque_atual} {item.unidade_medida}</p>
        <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', marginTop: '1px' }}>mín {item.estoque_minimo}</p>
      </div>
    </div>
  )
}

function GrupoCard({ grupo }: { grupo: Grupo }) {
  const [aberto, setAberto] = useState(false)
  const multi = grupo.versoes.length > 1
  const borderColor = grupo.semEstoque
    ? 'rgba(240,100,100,0.4)'
    : grupo.temAlerta
    ? 'rgba(234,179,8,0.4)'
    : 'rgba(255,255,255,0.09)'
  const estoqueColor = grupo.semEstoque
    ? 'rgba(240,100,100,0.85)'
    : grupo.temAlerta
    ? 'rgba(234,179,8,0.9)'
    : 'rgba(255,255,255,0.85)'
  const totalEstoque = grupo.versoes.reduce((s, v) => s + v.estoque_atual, 0)

  if (!multi) {
    const item = grupo.versoes[0]
    return (
      <div style={{ background: 'rgba(8,18,30,0.48)', border: `0.5px solid ${borderColor}`, borderRadius: '12px', overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: '13px', fontWeight: 500, color: 'rgba(255,255,255,0.85)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {grupo.produto_nome}
            </p>
            <div style={{ marginTop: '4px' }}>
              <AttrChips atributos={item.atributos_json} />
            </div>
          </div>
          <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: '12px' }}>
            <p style={{ fontSize: '16px', fontWeight: 700, color: estoqueColor }}>{item.estoque_atual}</p>
            <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)' }}>{item.unidade_medida} · mín {item.estoque_minimo}</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ background: 'rgba(8,18,30,0.48)', border: `0.5px solid ${borderColor}`, borderRadius: '12px', overflow: 'hidden' }}>
      <button
        onClick={() => setAberto(a => !a)}
        style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: '13px', fontWeight: 500, color: 'rgba(255,255,255,0.85)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {grupo.produto_nome}
          </p>
          <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)', marginTop: '2px' }}>{grupo.versoes.length} variações</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0, marginLeft: '12px' }}>
          <div style={{ textAlign: 'right' }}>
            <p style={{ fontSize: '16px', fontWeight: 700, color: estoqueColor }}>{totalEstoque}</p>
            <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)' }}>total</p>
          </div>
          <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: '11px', display: 'inline-block', transform: aberto ? 'rotate(180deg)' : 'none', transition: 'transform 150ms' }}>▼</span>
        </div>
      </button>
      {aberto && grupo.versoes.map(v => <VersaoRow key={v.versao_id} item={v} />)}
    </div>
  )
}

export default function EstoquePage() {
  const router  = useRouter()
  const [resumo,  setResumo]  = useState<ResumoEstoque | null>(null)
  const [items,   setItems]   = useState<ItemEstoque[]>([])
  const [loading, setLoading] = useState(true)
  const [q,       setQ]       = useState('')
  const [tab,     setTab]     = useState<Tab>('todos')

  useEffect(() => {
    Promise.all([estoqueApi.resumo(), estoqueApi.list()])
      .then(([r, list]) => { setResumo(r); setItems(list) })
      .finally(() => setLoading(false))
  }, [])

  const grupos: Grupo[] = Object.values(
    items.reduce<Record<string, Grupo>>((acc, item) => {
      if (!acc[item.produto_id]) {
        acc[item.produto_id] = {
          produto_id:   item.produto_id,
          produto_nome: item.produto_nome,
          versoes:      [],
          temAlerta:    false,
          semEstoque:   false,
        }
      }
      acc[item.produto_id].versoes.push(item)
      if (item.alerta)      acc[item.produto_id].temAlerta  = true
      if (item.sem_estoque) acc[item.produto_id].semEstoque = true
      return acc
    }, {})
  )

  const cntAlertas    = grupos.filter(g => g.temAlerta).length
  const cntSemEstoque = grupos.filter(g => g.semEstoque).length

  const filtrados = grupos.filter(g => {
    if (q && !g.produto_nome.toLowerCase().includes(q.toLowerCase())) return false
    if (tab === 'alertas')     return g.temAlerta
    if (tab === 'sem_estoque') return g.semEstoque
    return true
  })

  const TABS: { key: Tab; label: string; count: number }[] = [
    { key: 'todos',       label: 'Todos',       count: grupos.length },
    { key: 'alertas',     label: 'Alertas',     count: cntAlertas },
    { key: 'sem_estoque', label: 'Sem estoque', count: cntSemEstoque },
  ]

  const emptyMsg =
    q                    ? 'Nenhum produto encontrado.' :
    tab === 'alertas'    ? 'Nenhum produto em alerta.' :
    tab === 'sem_estoque'? 'Nenhum produto sem estoque.' :
                           'Nenhum produto cadastrado.'

  return (
    <>
      <TopBar />
      <main className="flex-1 overflow-y-auto p-4 md:p-6 pb-8">
        <div className="flex flex-col gap-5">

          {/* KPI row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'SKUs cadastrados',  val: resumo?.total_skus,                                 cor: '#0ef' },
              { label: 'Alertas de mínimo', val: resumo?.alertas,                                    cor: 'rgba(234,179,8,0.9)' },
              { label: 'Sem estoque',       val: resumo?.sem_estoque,                                cor: 'rgba(240,100,100,0.85)' },
              { label: 'Valor em estoque',  val: resumo ? fmtR(Number(resumo.valor_estoque)) : null, cor: 'rgba(100,220,160,0.9)' },
            ].map(kpi => (
              <div key={kpi.label} style={{ background: 'rgba(8,18,30,0.48)', border: '0.5px solid rgba(255,255,255,0.09)', borderLeft: `3px solid ${kpi.cor}`, borderRadius: '12px', padding: '14px 16px' }}>
                <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px' }}>{kpi.label}</p>
                <p style={{ fontSize: '22px', fontWeight: 700, color: kpi.cor, lineHeight: 1 }}>
                  {loading || kpi.val == null ? '—' : kpi.val}
                </p>
              </div>
            ))}
          </div>

          {/* Action buttons */}
          <div className="flex gap-3">
            <button
              onClick={() => router.push('/painel/estoque/nfe')}
              style={{ flex: 1, minHeight: '44px', background: 'rgba(0,239,255,0.12)', border: '0.5px solid rgba(0,239,255,0.35)', borderRadius: '10px', color: '#0ef', fontSize: '13px', fontWeight: 500, cursor: 'pointer' }}
            >
              Importar NF-e
            </button>
            <button
              onClick={() => router.push('/painel/estoque/ajustes')}
              style={{ flex: 1, minHeight: '44px', background: 'rgba(255,255,255,0.04)', border: '0.5px solid rgba(255,255,255,0.12)', borderRadius: '10px', color: 'rgba(255,255,255,0.7)', fontSize: '13px', fontWeight: 500, cursor: 'pointer' }}
            >
              Entrada manual
            </button>
          </div>

          {/* Search */}
          <input
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="Buscar produto..."
            className="min-h-[48px] bg-deep-ocean border border-ocean-depth rounded-xl px-4 text-sm text-sea-foam placeholder-steel outline-none focus:border-electric-cyan"
          />

          {/* Tabs */}
          <div style={{ display: 'flex', borderBottom: '0.5px solid rgba(255,255,255,0.09)' }}>
            {TABS.map(t => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                style={{
                  minHeight: '40px',
                  padding: '0 14px',
                  background: 'none',
                  border: 'none',
                  borderBottom: tab === t.key ? '2px solid #0ef' : '2px solid transparent',
                  cursor: 'pointer',
                  color: tab === t.key ? '#0ef' : 'rgba(255,255,255,0.4)',
                  fontSize: '13px',
                  fontWeight: tab === t.key ? 600 : 400,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                {t.label}
                {t.count > 0 && (
                  <span style={{ fontSize: '10px', borderRadius: '999px', padding: '1px 6px', background: tab === t.key ? 'rgba(0,239,255,0.15)' : 'rgba(255,255,255,0.08)', color: tab === t.key ? '#0ef' : 'rgba(255,255,255,0.35)' }}>
                    {t.count}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Product list */}
          {loading ? (
            <div className="flex justify-center py-16">
              <div className="w-8 h-8 border-2 border-electric-cyan border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filtrados.length === 0 ? (
            <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.25)', fontSize: '13px', padding: '40px 0' }}>
              {emptyMsg}
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {filtrados.map(g => <GrupoCard key={g.produto_id} grupo={g} />)}
            </div>
          )}

        </div>
      </main>
    </>
  )
}
