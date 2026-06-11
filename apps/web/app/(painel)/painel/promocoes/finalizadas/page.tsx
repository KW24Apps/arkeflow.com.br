'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Tag, Gift, ShoppingBag, Star } from 'lucide-react'
import { TopBar } from '@/components/layout/TopBar'
import { promocoesApi, type Promocao } from '@/lib/api/promocoes'

const TIPO_LABEL: Record<string, string> = {
  desconto_percentual: 'Desconto %',
  desconto_fixo:       'Desconto R$',
  segunda_peca:        '2ª Peça c/ Desc.',
  compre_ganhe:        'Compre X Leve Y',
  primeira_compra:     'Primeira Compra',
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

export default function PromocoesFinalizadasPage() {
  const router = useRouter()
  const [promos,  setPromos]  = useState<Promocao[]>([])
  const [loading, setLoading] = useState(true)

  async function load() {
    setLoading(true)
    try { setPromos(await promocoesApi.list()) }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  async function handleDuplicar(id: string) {
    const nova = await promocoesApi.duplicar(id) as any
    router.push('/painel/promocoes?dup=' + nova.id)
  }

  const encerradas = promos.filter(p => p.status === 'encerrada')

  return (
    <>
      <TopBar />
      <main className="flex-1 overflow-y-auto p-4 md:p-6 pb-10 flex flex-col gap-5">
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="w-6 h-6 border-2 border-electric-cyan border-t-transparent rounded-full animate-spin" />
          </div>
        ) : encerradas.length === 0 ? (
          <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.2)', padding: '12px 0' }}>
            Nenhuma promoção encerrada
          </p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 220px))', gap: '12px', justifyContent: 'start' }}>
            {encerradas.map(p => (
              <EncerradaCard
                key={p.id}
                promo={p}
                descricao={descricao(p)}
                tipoLabel={TIPO_LABEL[p.tipo] ?? p.tipo}
                onDuplicar={() => handleDuplicar(p.id)}
              />
            ))}
          </div>
        )}
      </main>
    </>
  )
}

function EncerradaCard({
  promo, descricao, tipoLabel, onDuplicar,
}: {
  promo: Promocao
  descricao: string
  tipoLabel: string
  onDuplicar: () => void
}) {
  return (
    <div
      style={{
        background: 'rgba(8,18,30,0.48)',
        backdropFilter: 'blur(8px)',
        border: '0.5px solid rgba(255,255,255,0.06)',
        borderRadius: '10px',
        padding: '14px',
        display: 'flex',
        flexDirection: 'column',
        gap: '7px',
        opacity: 0.65,
      }}
    >
      <div style={{ width: '40px', height: '40px', background: 'rgba(255,255,255,0.04)', borderRadius: '9px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <TipoIcon tipo={promo.tipo} />
      </div>

      <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.8)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {promo.nome}
      </p>

      <span style={{ fontSize: '9px', background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.3)', borderRadius: '10px', padding: '2px 7px', textTransform: 'uppercase', letterSpacing: '0.05em', alignSelf: 'flex-start' }}>
        {tipoLabel}
      </span>

      <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.25)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {descricao}
      </p>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '4px' }}>
        <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)' }}>Encerrada</span>
        <button
          type="button"
          onClick={onDuplicar}
          style={{
            fontSize: '10px', color: 'rgba(0,239,255,0.6)',
            border: '0.5px solid rgba(0,239,255,0.2)',
            background: 'rgba(0,239,255,0.05)',
            borderRadius: '6px', padding: '3px 10px', cursor: 'pointer',
          }}
        >
          Duplicar
        </button>
      </div>
    </div>
  )
}
