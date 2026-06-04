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
  const [logsRecentes, setLogsRecentes] = useState<LogAcesso[]>([])
  const [loading,   setLoading]   = useState(true)

  useEffect(() => {
    Promise.allSettled([
      financeiroApi.resumo({ de: hoje, ate: hoje }),
      produtosApi.list(),
      clientesApi.list(),
      estoqueApi.list(true),
      colaboradoresApi.logsRecentes(),
    ]).then(([r, p, c, a, l]) => {
      if (r.status === 'fulfilled') setResumo(r.value)
      if (p.status === 'fulfilled') setTotalProd(p.value.length)
      if (c.status === 'fulfilled') setTotalCli(c.value.length)
      if (a.status === 'fulfilled') setAlertas(a.value.length)
      if (l.status === 'fulfilled') setLogsRecentes(l.value.slice(0, 10))
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

        {/* Atividade recente */}
        {logsRecentes.length > 0 && (
          <div className="bg-deep-ocean border border-ocean-depth rounded-2xl p-5 mb-2">
            <h3 className="text-sea-foam font-semibold text-xs uppercase tracking-wider mb-3">
              Atividade recente
            </h3>
            <div className="flex flex-col gap-1.5">
              {logsRecentes.map((l, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs ${l.tipo === 'login' ? 'text-mint-green' : 'text-steel'}`}>
                      {l.tipo === 'login' ? '▶' : '◀'}
                    </span>
                    <span className="text-sea-foam text-xs">{l.nome}</span>
                    <span className="text-steel text-xs">{l.nivel === 'dono_loja' ? '(dono)' : ''}</span>
                  </div>
                  <span className="text-steel text-xs">{new Date(l.criado_em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
              ))}
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
