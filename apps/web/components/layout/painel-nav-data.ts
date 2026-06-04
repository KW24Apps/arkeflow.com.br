// Estrutura de navegação definitiva do painel — definida em 04/06/2026
// permSlug: slug usado no sistema de permissões de colaboradores
//   '*' = sempre visível (dono_loja), undefined = sem controle

export const SECTIONS = [

  // ── Operacional ─────────────────────────────────────────────────────────────

  {
    label: 'Dashboard',
    href:  '/painel/dashboard',
    match: ['/painel/dashboard'],
    sub:   [],
  },
  {
    label: 'Caixa',
    href:  '/painel/caixa',
    match: ['/painel/caixa'],
    // Vendas + crediário = mesma tela. NF é tela separada no top bar.
    sub: [
      { label: 'Notas Fiscais', href: '/painel/caixa/notas-fiscais' },
    ],
  },
  {
    label: 'Promoções',
    href:  '/painel/promocoes',
    match: ['/painel/promocoes'],
    // Estrutura interna a definir antes de construir
    sub:   [],
  },
  {
    label: 'Estoque',
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
    href:  '/painel/financeiro',
    match: ['/painel/financeiro'],
    sub: [
      { label: 'Fluxo de Caixa',   href: '/painel/financeiro' },
      { label: 'Contas a Receber', href: '/painel/financeiro/contas-receber' },
    ],
  },
  {
    label: 'Relatórios',
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
    href:  '/painel/produtos',
    match: ['/painel/produtos', '/painel/cadastros'],
    // "Fiscal" será adicionado quando a integração NF-e for construída
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
      { label: 'Clientes',          href: '/painel/clientes' },
      { label: 'Regras de Cashback',href: '/painel/clientes/cashback' },
    ],
  },
  {
    label: 'Colaboradores',
    href:  '/painel/colaboradores',
    match: ['/painel/colaboradores'],
    sub: [
      { label: 'Colaboradores', href: '/painel/colaboradores' },
      { label: 'Permissões',    href: '/painel/colaboradores/permissoes' },
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

  // ── Configurações (rodapé — ícone de engrenagem, não aparece no sidebar principal)
  // Gerenciado separadamente no componente da sidebar

] as const
