'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { TopBar } from '@/components/layout/TopBar'
import { KPICard } from '@/components/layout/KPICard'
import { produtosApi } from '@/lib/api/produtos'
import { clientesApi } from '@/lib/api/clientes'
import { estoqueApi } from '@/lib/api/estoque'
import { financeiroApi } from '@/lib/api/financeiro'

export default function PainelDashboard() {
  const hoje = new Date().toISOString().split('T')[0]
  const [resumo,    setResumo]    = useState<any>(null)
  const [totalProd, setTotalProd] = useState<number>(0)
  const [totalCli,  setTotalCli]  = useState<number>(0)
  const [alertas,   setAlertas]   = useState<number>(0)
  const [loading,   setLoading]   = useState(true)

  useEffect(() => {
    Promise.allSettled([
      financeiroApi.resumo({ de: hoje, ate: hoje }),
      produtosApi.list(),
      clientesApi.list(),
      estoqueApi.list(true),
    ]).then(([r, p, c, a]) => {
      if (r.status === 'fulfilled') setResumo(r.value)
      if (p.status === 'fulfilled') setTotalProd(p.value.length)
      if (c.status === 'fulfilled') setTotalCli(c.value.length)
      if (a.status === 'fulfilled') setAlertas(a.value.length)
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
