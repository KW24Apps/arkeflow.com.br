// Estrutura de navegação definitiva do painel — definida em 04/06/2026
// permSlug: slug usado no sistema de permissões de colaboradores
//   '*' = sempre visível (dono_loja), undefined = sem controle

// Ícones: nomes do Lucide React (https://lucide.dev)
export const SECTIONS = [

  // ── Operacional ─────────────────────────────────────────────────────────────

  {
    label: 'Dashboard',
    icon:  'LayoutDashboard',
    href:  '/painel/dashboard',
    match: ['/painel/dashboard'],
    sub:   [],
  },
  {
    label: 'Caixa',
    icon:  'ShoppingCart',
    href:  '/painel/caixa',
    match: ['/painel/caixa'],
    sub: [
      { label: 'PDV',       href: '/painel/caixa',        permSlug: 'caixa' },
      { label: 'Histórico', href: '/painel/caixa/vendas', permSlug: 'caixa' },
    ],
  },
  {
    label: 'Promoções',
    icon:  'Tag',
    href:  '/painel/promocoes',
    match: ['/painel/promocoes'],
    sub:   [],
  },
  {
    label: 'Estoque',
    icon:  'Package',
    href:  '/painel/estoque',
    match: ['/painel/estoque'],
    sub: [
      { label: 'Posição Atual', href: '/painel/estoque' },
      { label: 'Alertas',       href: '/painel/estoque/alertas' },
      { label: 'Ajustes',       href: '/painel/estoque/ajustes' },
    ],
  },
  {
    label: 'Financeiro',
    icon:  'Wallet',
    href:  '/painel/financeiro',
    match: ['/painel/financeiro'],
    sub: [
      { label: 'Fluxo de Caixa',   href: '/painel/financeiro' },
      { label: 'Contas a Receber', href: '/painel/financeiro/contas-receber' },
    ],
  },
  {
    label: 'Relatórios',
    icon:  'BarChart2',
    href:  '/painel/relatorios',
    match: ['/painel/relatorios'],
    sub: [
      { label: 'Vendas',      href: '/painel/relatorios' },
      { label: 'Produtos',    href: '/painel/relatorios/produtos' },
      { label: 'Financeiro',  href: '/painel/relatorios/financeiro' },
      { label: 'Clientes',    href: '/painel/relatorios/clientes' },
    ],
  },

  // ── Cadastro ─────────────────────────────────────────────────────────────────

  { type: 'divider', label: 'Cadastro' },

  {
    label: 'Produtos',
    icon:  'Box',
    href:  '/painel/produtos',
    // match explícito — não usa /painel/cadastros genérico para não capturar /cadastros/configuracoes
    match: [
      '/painel/produtos',
      '/painel/cadastros/tamanhos',
      '/painel/cadastros/cores',
      '/painel/cadastros/tipos',
      '/painel/cadastros/composicoes',
      '/painel/cadastros/medidas',
    ],
    sub: [
      { label: 'Produtos',    href: '/painel/produtos',              permSlug: 'cadastro-produtos/lista' },
      { label: 'Tamanhos',    href: '/painel/cadastros/tamanhos',    permSlug: 'cadastro-produtos/tamanhos' },
      { label: 'Cores',       href: '/painel/cadastros/cores',       permSlug: 'cadastro-produtos/cores' },
      { label: 'Tipos',       href: '/painel/cadastros/tipos',       permSlug: 'cadastro-produtos/tipos' },
      { label: 'Composições', href: '/painel/cadastros/composicoes', permSlug: 'cadastro-produtos/composicoes' },
      { label: 'Medidas',     href: '/painel/cadastros/medidas',     permSlug: 'cadastro-produtos/medidas' },
    ],
  },
  {
    label: 'Clientes',
    icon:  'Users',
    href:  '/painel/clientes',
    match: ['/painel/clientes'],
    sub: [
      { label: 'Clientes',          href: '/painel/clientes',          permSlug: 'cadastro-clientes/lista' },
      { label: 'Regras de Cashback',href: '/painel/clientes/cashback', permSlug: 'cadastro-clientes/cashback' },
    ],
  },
  {
    label: 'Colaboradores',
    icon:  'UserCog',
    href:  '/painel/colaboradores',
    match: ['/painel/colaboradores'],
    sub: [
      { label: 'Colaboradores',       href: '/painel/colaboradores' },
      { label: 'Modelos de Permissão',href: '/painel/colaboradores/permissoes' },
    ],
  },
  {
    label: 'Financeiro',
    icon:  'CreditCard',
    href:  '/painel/configuracoes/formas-pagamento',
    match: ['/painel/configuracoes/formas-pagamento'],
    sub: [
      { label: 'Formas de Pagamento', href: '/painel/configuracoes/formas-pagamento' },
    ],
  },
  {
    label: 'Configurações',
    icon:  'Settings',
    href:  '/painel/configuracoes/dados',
    match: ['/painel/configuracoes'],
    sub: [
      { label: 'Dados da Empresa',       href: '/painel/configuracoes/dados' },
      { label: 'Configurações do Sistema',href: '/painel/configuracoes/sistema' },
    ],
  },

  // ── Configurações (rodapé — ícone de engrenagem, não aparece no sidebar principal)
  // Gerenciado separadamente no componente da sidebar

] as const
