'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { TopBar } from '@/components/layout/TopBar'
import { KPICard } from '@/components/layout/KPICard'
import { produtosApi } from '@/lib/api/produtos'
import { clientesApi } from '@/lib/api/clientes'
import { estoqueApi } from '@/lib/api/estoque'
import { financeiroApi } from '@/lib/api/financeiro'
import { colaboradoresApi } from '@/lib/api/colaboradores'
import { promocoesApi, type Promocao } from '@/lib/api/promocoes'

export default function PainelDashboard() {
  const hoje = new Date().toISOString().split('T')[0]

  const [resumo,       setResumo]       = useState<any>(null)
  const [totalProd,    setTotalProd]     = useState<number>(0)
  const [totalCli,     setTotalCli]      = useState<number>(0)
  const [alertas,      setAlertas]       = useState<number>(0)
  const [onlineAgora,  setOnlineAgora]   = useState<any[]>([])
  const [promoAtivas,  setPromoAtivas]   = useState<Promocao[]>([])
  const [loading,      setLoading]       = useState(true)

  useEffect(() => {
    Promise.allSettled([
      financeiroApi.resumo({ de: hoje, ate: hoje }),
      produtosApi.list(),
      clientesApi.list(),
      estoqueApi.list(true),
      colaboradoresApi.onlineAgora(),
      promocoesApi.list(false),  // só ativas
    ]).then(([r, p, c, a, o, pr]) => {
      if (r.status  === 'fulfilled') setResumo(r.value)
      if (p.status  === 'fulfilled') setTotalProd(p.value.length)
      if (c.status  === 'fulfilled') setTotalCli(c.value.length)
      if (a.status  === 'fulfilled') setAlertas(a.value.length)
      if (o.status  === 'fulfilled') setOnlineAgora(o.value)
      if (pr.status === 'fulfilled') setPromoAtivas(pr.value)
    }).finally(() => setLoading(false))
  }, [])

  const TIPO_LABEL: Record<string, string> = {
    desconto_percentual: '🏷️',
    desconto_fixo:       '💰',
    segunda_peca:        '2️⃣',
    compre_ganhe:        '🎁',
    primeira_compra:     '🌟',
  }

  return (
    <>
      <TopBar title="Dashboard" />
      <main className="flex-1 p-4 md:p-6 overflow-y-auto">

        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-5">
          <KPICard
            label="Vendas hoje"
            value={resumo ? `R$ ${Number(resumo.total_entradas).toFixed(2)}` : '—'}
            sub={resumo ? `${resumo.qtd_entradas} lançamento(s)` : undefined}
            accent="cyan"
          />
          <KPICard label="Produtos"  value={loading ? '—' : totalProd} accent="green" />
          <KPICard label="Clientes"  value={loading ? '—' : totalCli}  accent="cyan" />
          <KPICard
            label="Estoque baixo"
            value={loading ? '—' : alertas}
            sub={alertas > 0 ? 'abaixo do mínimo' : 'tudo ok'}
            accent={alertas > 0 ? 'yellow' : 'green'}
          />
        </div>

        {/* Promoções ativas */}
        {promoAtivas.length > 0 && (
          <div className="bg-deep-ocean border border-ocean-depth rounded-2xl p-5 mb-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sea-foam font-semibold text-xs uppercase tracking-wider">
                Promoções ativas ({promoAtivas.length})
              </h3>
              <Link href="/painel/promocoes" className="text-electric-cyan text-xs hover:underline">Ver todas</Link>
            </div>
            <div className="flex flex-col gap-2">
              {promoAtivas.slice(0, 4).map(p => (
                <div key={p.id} className="flex items-center gap-3">
                  <span className="text-base">{TIPO_LABEL[p.tipo] ?? '🏷️'}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sea-foam text-sm truncate">{p.nome}</p>
                    {p.fim && (
                      <p className="text-steel text-xs">
                        até {new Date(p.fim + 'T12:00:00').toLocaleDateString('pt-BR')}
                      </p>
                    )}
                  </div>
                  {p.codigo && (
                    <span className="bg-ocean-depth text-teal-current text-[10px] px-2 py-0.5 rounded font-mono">
                      {p.codigo}
                    </span>
                  )}
                </div>
              ))}
              {promoAtivas.length > 4 && (
                <p className="text-steel text-xs text-center pt-1">+{promoAtivas.length - 4} outras</p>
              )}
            </div>
          </div>
        )}

        {/* Online hoje */}
        {onlineAgora.length > 0 && (
          <div className="bg-deep-ocean border border-ocean-depth rounded-2xl p-5 mb-5">
            <div className="flex items-center gap-2 mb-3">
              <h3 className="text-sea-foam font-semibold text-xs uppercase tracking-wider">
                Acessos hoje ({onlineAgora.length})
              </h3>
            </div>
            <div className="flex flex-col gap-2">
              {onlineAgora.map((u, i) => {
                const min   = Math.floor(u.segundos_atras / 60)
                const ativo = u.segundos_atras < 1800  // verde se < 30 min
                const tempo = min < 1 ? 'agora'
                            : min < 60 ? `há ${min} min`
                            : `há ${Math.floor(min / 60)}h`
                return (
                  <div key={i} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full shrink-0 ${ativo ? 'bg-mint-green' : 'bg-steel'}`} />
                      <div className="w-7 h-7 rounded-full bg-ocean-depth flex items-center justify-center shrink-0">
                        <span className="text-sea-foam text-xs font-semibold">{u.nome?.charAt(0).toUpperCase()}</span>
                      </div>
                      <span className="text-sea-foam text-sm">{u.nome}</span>
                      {u.nivel === 'dono_loja' && <span className="text-steel text-xs">(dono)</span>}
                    </div>
                    <span className={`text-xs ${ativo ? 'text-mint-green' : 'text-steel'}`}>{tempo}</span>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Atalhos */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {[
            { label: 'Ver Produtos',       href: '/painel/produtos',       icon: '📦' },
            { label: 'Ver Clientes',        href: '/painel/clientes',       icon: '👥' },
            { label: 'Ajustar Estoque',     href: '/painel/estoque/ajustes',icon: '📊' },
            { label: 'Fluxo de Caixa',      href: '/painel/financeiro',     icon: '💰' },
            { label: 'Contas a Receber',    href: '/painel/financeiro/contas-receber', icon: '📋' },
            { label: 'Promoções',           href: '/painel/promocoes',      icon: '🏷️' },
          ].map(item => (
            <Link key={item.href} href={item.href}
              className="bg-deep-ocean border border-ocean-depth rounded-2xl p-4 flex items-center gap-3 hover:border-teal-current transition-colors active:bg-ocean-depth">
              <span className="text-2xl">{item.icon}</span>
              <span className="text-sea-foam text-sm font-medium">{item.label}</span>
            </Link>
          ))}
        </div>

      </main>
    </>
  )
}
