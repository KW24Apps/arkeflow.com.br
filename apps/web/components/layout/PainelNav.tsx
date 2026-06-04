'use client'

import { usePathname } from 'next/navigation'
import { SecondaryNav } from './SecondaryNav'

// Definição completa da navegação do painel
export const SECTIONS = [
  {
    label: 'Dashboard',
    href:  '/painel/dashboard',
    match: ['/painel/dashboard'],
    sub:   [],
  },
  {
    label: 'Produtos',
    href:  '/painel/produtos',
    match: ['/painel/produtos', '/painel/cadastros'],
    sub: [
      { label: 'Produtos',    href: '/painel/produtos' },
      { label: 'Tamanhos',    href: '/painel/cadastros/tamanhos' },
      { label: 'Cores',       href: '/painel/cadastros/cores' },
      { label: 'Tipos',       href: '/painel/cadastros/tipos' },
      { label: 'Composições', href: '/painel/cadastros/composicoes' },
      { label: 'Medidas',     href: '/painel/cadastros/medidas' },
    ],
  },
  {
    label: 'Clientes',
    href:  '/painel/clientes',
    match: ['/painel/clientes'],
    sub:   [],
  },
  {
    label: 'Vendas',
    href:  '/painel/vendas',
    match: ['/painel/vendas'],
    sub:   [],
  },
  {
    label: 'Financeiro',
    href:  '/painel/financeiro/caixa',
    match: ['/painel/financeiro', '/painel/relatorios'],
    sub: [
      { label: 'Caixa',      href: '/painel/financeiro/caixa' },
      { label: 'Crediário',  href: '/painel/financeiro/crediario' },
      { label: 'Relatórios', href: '/painel/relatorios' },
    ],
  },
  {
    label: 'Configurações',
    href:  '/painel/configuracoes/formas-pagamento',
    match: ['/painel/configuracoes'],
    sub: [
      { label: 'Formas de Pagamento', href: '/painel/configuracoes/formas-pagamento' },
    ],
  },
]

export function PainelSecondaryNav() {
  const pathname = usePathname()

  // Encontra a seção ativa pelo prefixo do pathname
  const section = SECTIONS.find(s =>
    s.match.some(m => pathname === m || pathname.startsWith(m + '/'))
  )

  return <SecondaryNav items={section?.sub ?? []} />
}
