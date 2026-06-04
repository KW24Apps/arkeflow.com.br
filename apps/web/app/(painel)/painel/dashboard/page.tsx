'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { TopBar } from '@/components/layout/TopBar'
import { financeiroApi } from '@/lib/api/financeiro'
import { colaboradoresApi } from '@/lib/api/colaboradores'
import { promocoesApi, type Promocao } from '@/lib/api/promocoes'
import { clientesApi } from '@/lib/api/clientes'

// ── Componentes de card por tamanho ─────────────────────────────────────────

function CardTercio({ label, value, sub, accent = 'default' }: {
  label: string; value: string | number; sub?: string
  accent?: 'cyan' | 'green' | 'yellow' | 'red' | 'default'
}) {
  const cores = {
    cyan:    'border-l-electric-cyan',
    green:   'border-l-mint-green',
    yellow:  'border-l-yellow-400',
    red:     'border-l-red-400',
    default: 'border-l-ocean-depth',
  }
  return (
    <div className={`bg-deep-ocean border border-ocean-depth border-l-4 ${cores[accent]} rounded-2xl p-4 flex flex-col gap-1`}>
      <p className="text-steel text-xs uppercase tracking-wider">{label}</p>
      <p className="text-sea-foam text-2xl font-bold">{value}</p>
      {sub && <p className="text-steel text-xs">{sub}</p>}
    </div>
  )
}

// ── Dashboard ────────────────────────────────────────────────────────────────

export default function PainelDashboard() {
  const hoje = new Date().toISOString().split('T')[0]

  const [resumo,       setResumo]       = useState<any>(null)
  const [clientesHoje, setClientesHoje] = useState<number>(0)
  const [onlineAgora,  setOnlineAgora]  = useState<any[]>([])
  const [promoAtivas,  setPromoAtivas]  = useState<Promocao[]>([])
  const [loading,      setLoading]      = useState(true)

  useEffect(() => {
    Promise.allSettled([
      financeiroApi.resumo({ de: hoje, ate: hoje }),
      clientesApi.list(),
      colaboradoresApi.onlineAgora(),
      promocoesApi.list(false),
    ]).then(([r, c, o, pr]) => {
      if (r.status  === 'fulfilled') setResumo(r.value)
      if (c.status  === 'fulfilled') {
        // Clientes que compraram hoje = proxy via lançamentos (não temos query direta ainda)
        setClientesHoje(0)  // será implementado quando tivermos histórico de vendas
      }
      if (o.status  === 'fulfilled') setOnlineAgora(o.value)
      if (pr.status === 'fulfilled') setPromoAtivas(pr.value)
    }).finally(() => setLoading(false))
  }, [])

  const totalVendas  = resumo ? Number(resumo.total_entradas) : 0
  const qtdVendas    = resumo ? Number(resumo.qtd_entradas)   : 0
  const ticketMedio  = qtdVendas > 0 ? totalVendas / qtdVendas : 0

  const TIPO_ICON: Record<string, string> = {
    desconto_percentual: '🏷️', desconto_fixo: '💰',
    segunda_peca: '2️⃣', compre_ganhe: '🎁', primeira_compra: '🌟',
  }

  function descontoLabel(p: Promocao) {
    switch (p.tipo) {
      case 'desconto_percentual': return `${p.valor_desconto}%`
      case 'desconto_fixo':       return `R$${Number(p.valor_desconto).toFixed(0)}`
      case 'segunda_peca':        return `2ª ${p.percentual_brinde}%`
      case 'compre_ganhe':        return `${p.quantidade_compre}×${(p.quantidade_compre??0)+(p.quantidade_brinde??0)}`
      case 'primeira_compra':     return `1ª ${p.valor_desconto}%`
      default: return ''
    }
  }

  return (
    <>
      <TopBar title="Dashboard" />
      <main className="flex-1 p-4 md:p-6 overflow-y-auto">

        {/* ── Linha 1: KPIs em 1/3 ── */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          <CardTercio
            label="Vendas hoje"
            value={loading ? '—' : `R$ ${totalVendas.toFixed(2)}`}
            sub={qtdVendas > 0 ? `${qtdVendas} transação(ões)` : 'Nenhuma ainda'}
            accent="cyan"
          />
          <CardTercio
            label="Ticket médio"
            value={loading ? '—' : ticketMedio > 0 ? `R$ ${ticketMedio.toFixed(2)}` : '—'}
            accent="green"
          />
          <CardTercio
            label="Online agora"
            value={loading ? '—' : onlineAgora.length}
            sub={onlineAgora.length > 0 ? onlineAgora.map(u => u.nome?.split(' ')[0]).join(', ') : 'Ninguém'}
            accent={onlineAgora.length > 0 ? 'green' : 'default'}
          />
        </div>

        {/* ── Linha 2: duas seções em 1/2 ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">

          {/* Promoções ativas — metade da tela */}
          <div className="bg-deep-ocean border border-ocean-depth rounded-2xl p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sea-foam font-semibold text-xs uppercase tracking-wider">
                Promoções ativas ({promoAtivas.length})
              </p>
              <Link href="/painel/promocoes" className="text-electric-cyan text-xs hover:underline">Ver todas</Link>
            </div>
            {promoAtivas.length === 0 ? (
              <p className="text-steel text-sm text-center py-4">Nenhuma promoção ativa</p>
            ) : (
              <div className="flex flex-col gap-2">
                {promoAtivas.slice(0, 4).map(p => (
                  <div key={p.id} className="flex items-center gap-2">
                    <span className="text-base">{TIPO_ICON[p.tipo] ?? '🏷️'}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sea-foam text-xs font-medium truncate">{p.nome}</p>
                      <p className="text-steel text-[10px]">
                        {descontoLabel(p)} · {p.fim ? `até ${new Date(p.fim + 'T12:00:00').toLocaleDateString('pt-BR')}` : 'Sem vencimento'}
                      </p>
                    </div>
                    {p.codigo && <span className="bg-ocean-depth text-teal-current text-[9px] px-1.5 py-0.5 rounded font-mono shrink-0">{p.codigo}</span>}
                  </div>
                ))}
                {promoAtivas.length > 4 && <p className="text-steel text-[10px] text-center">+{promoAtivas.length - 4} outras</p>}
              </div>
            )}
          </div>

          {/* Online agora — metade da tela */}
          <div className="bg-deep-ocean border border-ocean-depth rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <span className={`w-2 h-2 rounded-full ${onlineAgora.length > 0 ? 'bg-mint-green animate-pulse' : 'bg-steel'}`} />
              <p className="text-sea-foam font-semibold text-xs uppercase tracking-wider">
                Online agora
              </p>
            </div>
            {onlineAgora.length === 0 ? (
              <p className="text-steel text-sm text-center py-4">Ninguém conectado</p>
            ) : (
              <div className="flex flex-col gap-2">
                {onlineAgora.map((u, i) => {
                  const min   = Math.floor(u.segundos_atras / 60)
                  const ativo = u.segundos_atras < 600
                  const tempo = min < 1 ? 'agora' : `há ${min} min`
                  return (
                    <div key={i} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${ativo ? 'bg-mint-green' : 'bg-steel'}`} />
                        <div className="w-6 h-6 rounded-full bg-ocean-depth flex items-center justify-center shrink-0">
                          <span className="text-sea-foam text-[10px] font-semibold">{u.nome?.charAt(0).toUpperCase()}</span>
                        </div>
                        <span className="text-sea-foam text-xs">{u.nome}</span>
                        {u.nivel === 'dono_loja' && <span className="text-steel text-[10px]">(dono)</span>}
                      </div>
                      <span className={`text-[10px] ${ativo ? 'text-mint-green' : 'text-steel'}`}>{tempo}</span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* ── Linha 3: atalhos rápidos tela inteira ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'PDV',               href: '/pdv',                           icon: '🛒' },
            { label: 'Produtos',          href: '/painel/produtos',               icon: '📦' },
            { label: 'Clientes',          href: '/painel/clientes',               icon: '👥' },
            { label: 'Estoque',           href: '/painel/estoque/ajustes',        icon: '📊' },
            { label: 'Financeiro',        href: '/painel/financeiro',             icon: '💰' },
            { label: 'Contas a Receber',  href: '/painel/financeiro/contas-receber', icon: '📋' },
            { label: 'Promoções',         href: '/painel/promocoes',              icon: '🏷️' },
            { label: 'Configurações',     href: '/painel/configuracoes/dados',    icon: '⚙️' },
          ].map(item => (
            <Link key={item.href} href={item.href}
              className="bg-deep-ocean border border-ocean-depth rounded-2xl p-3 flex items-center gap-2 hover:border-teal-current transition-colors active:bg-ocean-depth">
              <span className="text-xl">{item.icon}</span>
              <span className="text-sea-foam text-xs font-medium">{item.label}</span>
            </Link>
          ))}
        </div>

      </main>
    </>
  )
}
