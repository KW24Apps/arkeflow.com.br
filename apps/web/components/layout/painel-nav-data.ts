// Arquivo de dados puro — sem 'use client', importável tanto em server quanto client

export const SECTIONS = [
  { label: 'Dashboard',  href: '/painel/dashboard',            match: ['/painel/dashboard'],             sub: [] },
  { label: 'Vendas',     href: '/painel/vendas',               match: ['/painel/vendas'],                sub: [] },
  { label: 'Estoque',    href: '/painel/estoque',              match: ['/painel/estoque'],               sub: [] },
  { label: 'Caixa',      href: '/painel/financeiro/caixa',     match: ['/painel/financeiro/caixa'],      sub: [] },
  { label: 'Crediário',  href: '/painel/financeiro/crediario', match: ['/painel/financeiro/crediario'],  sub: [] },
  { label: 'Relatórios', href: '/painel/relatorios',           match: ['/painel/relatorios'],            sub: [] },

  { type: 'divider', label: 'Cadastro' },

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
    sub: [
      { label: 'Clientes', href: '/painel/clientes' },
    ],
  },
  {
    label: 'Financeiro',
    href:  '/painel/configuracoes/formas-pagamento',
    match: ['/painel/configuracoes'],
    sub: [
      { label: 'Formas de Pagamento', href: '/painel/configuracoes/formas-pagamento' },
    ],
  },
] as const
