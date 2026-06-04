'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { TopBar } from '@/components/layout/TopBar'
import { KPICard } from '@/components/layout/KPICard'
import { produtosApi } from '@/lib/api/produtos'
import { clientesApi } from '@/lib/api/clientes'
import { estoqueApi } from '@/lib/api/estoque'
import { financeiroApi } from '@/lib/api/financeiro'
import { colaboradoresApi, type LogAcesso } from '@/lib/api/colaboradores'

export default function PainelDashboard() {
  const hoje = new Date().toISOString().split('T')[0]
  const [resumo,    setResumo]    = useState<any>(null)
  const [totalProd, setTotalProd] = useState<number>(0)
  const [totalCli,  setTotalCli]  = useState<number>(0)
  const [alertas,   setAlertas]   = useState<number>(0)
  const [onlineAgora, setOnlineAgora] = useState<any[]>([])
  const [loading,   setLoading]   = useState(true)

  useEffect(() => {
    Promise.allSettled([
      financeiroApi.resumo({ de: hoje, ate: hoje }),
      produtosApi.list(),
      clientesApi.list(),
      estoqueApi.list(true),
      colaboradoresApi.onlineAgora(),
    ]).then(([r, p, c, a, l]) => {
      if (r.status === 'fulfilled') setResumo(r.value)
      if (p.status === 'fulfilled') setTotalProd(p.value.length)
      if (c.status === 'fulfilled') setTotalCli(c.value.length)
      if (a.status === 'fulfilled') setAlertas(a.value.length)
      if (l.status === 'fulfilled') setOnlineAgora(l.value)
    }).finally(() => setLoading(false))
  }, [])

  return (
    <>
      <TopBar title="Dashboard" />
      <main className="flex-1 p-4 md:p-6 overflow-y-auto">

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-6">
          <KPICard
            label="Vendas hoje"
            value={resumo ? `R$ ${Number(resumo.total_entradas).toFixed(2)}` : '—'}
            sub={resumo ? `${resumo.qtd_entradas} lançamento(s)` : undefined}
            accent="cyan"
          />
          <KPICard
            label="Produtos"
            value={loading ? '—' : totalProd}
            accent="green"
          />
          <KPICard
            label="Clientes"
            value={loading ? '—' : totalCli}
            accent="cyan"
          />
          <KPICard
            label="Estoque baixo"
            value={loading ? '—' : alertas}
            sub={alertas > 0 ? 'abaixo do mínimo' : undefined}
            accent={alertas > 0 ? 'yellow' : 'green'}
          />
        </div>

        {/* Online agora */}
        {onlineAgora.length > 0 && (
          <div className="bg-deep-ocean border border-ocean-depth rounded-2xl p-5 mb-2">
            <div className="flex items-center gap-2 mb-3">
              <span className="w-2 h-2 rounded-full bg-mint-green animate-pulse" />
              <h3 className="text-sea-foam font-semibold text-xs uppercase tracking-wider">
                Online agora ({onlineAgora.length})
              </h3>
            </div>
            <div className="flex flex-col gap-2">
              {onlineAgora.map((u, i) => {
                const min = Math.floor(u.segundos_atras / 60)
                const tempo = min < 1 ? 'agora' : min === 1 ? 'há 1 min' : `há ${min} min`
                return (
                  <div key={i} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-ocean-depth flex items-center justify-center shrink-0">
                        <span className="text-sea-foam text-xs font-semibold">{u.nome?.charAt(0).toUpperCase()}</span>
                      </div>
                      <div>
                        <span className="text-sea-foam text-sm">{u.nome}</span>
                        {u.nivel === 'dono_loja' && <span className="text-steel text-xs ml-1">(dono)</span>}
                      </div>
                    </div>
                    <span className="text-mint-green text-xs">{tempo}</span>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Atalhos rápidos */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {[
            { label: 'Ver Produtos',         href: '/painel/produtos',       icon: '📦' },
            { label: 'Ver Clientes',          href: '/painel/clientes',       icon: '👥' },
            { label: 'Ajustar Estoque',       href: '/painel/estoque/ajustes',icon: '📊' },
            { label: 'Fluxo de Caixa',        href: '/painel/financeiro',     icon: '💰' },
            { label: 'Contas a Receber',      href: '/painel/financeiro/contas-receber', icon: '📋' },
            { label: 'Formas de Pagamento',   href: '/painel/configuracoes/formas-pagamento', icon: '💳' },
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
