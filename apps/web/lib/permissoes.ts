// Slugs de permissão mapeados para os menus do painel
// Mantém sincronizado com painel-nav-data.ts

export const PERMISSOES_MENU = [
  { slug: 'dashboard',             label: 'Dashboard' },
  { slug: 'caixa',                 label: 'Caixa' },
  { slug: 'promocoes',             label: 'Promoções' },
  { slug: 'estoque',               label: 'Estoque' },
  { slug: 'financeiro',            label: 'Financeiro' },
  { slug: 'relatorios',            label: 'Relatórios' },
  { slug: 'cadastro-produtos',     label: 'Cadastro — Produtos' },
  { slug: 'cadastro-clientes',     label: 'Cadastro — Clientes' },
  { slug: 'cadastro-colaboradores',label: 'Cadastro — Colaboradores' },
  { slug: 'cadastro-financeiro',   label: 'Cadastro — Financeiro' },
] as const

export type PermissaoSlug = typeof PERMISSOES_MENU[number]['slug']

// Verifica se o usuário tem acesso a um slug
// '*' = acesso total (dono_loja)
export function temPermissao(permissoes: string[], slug: PermissaoSlug): boolean {
  return permissoes.includes('*') || permissoes.includes(slug)
}
