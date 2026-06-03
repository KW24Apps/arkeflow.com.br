import { Sidebar } from '@/components/layout/Sidebar'

const nav = [
  { label: 'Dashboard',          href: '/painel/dashboard' },
  { label: 'Produtos',           href: '/painel/produtos' },
  { label: 'Estoque',            href: '/painel/estoque' },
  { label: 'Clientes',           href: '/painel/clientes' },
  { label: 'Vendas',             href: '/painel/vendas' },
  { label: 'Caixa',              href: '/painel/financeiro/caixa' },
  { label: 'Crediário',          href: '/painel/financeiro/crediario' },
  { label: 'Relatórios',         href: '/painel/relatorios' },
  { label: 'Formas de Pagamento',href: '/painel/configuracoes/formas-pagamento' },
]

export default function PainelLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-midnight">
      <Sidebar items={nav} subtitle="Gestão" />
      <div className="flex-1 flex flex-col min-w-0">
        {children}
      </div>
    </div>
  )
}
