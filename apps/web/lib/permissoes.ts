// Estrutura hierárquica de permissões do painel
// slug do sub-item = "secao/sub" → ex: "caixa/notas-fiscais"
// Se apenas "caixa" estiver nas permissões → acesso total à seção

export interface SubPermissao {
  slug:  string
  label: string
}

export interface GrupoPermissao {
  slug:    string   // slug da seção principal
  label:   string
  sub:     SubPermissao[]
}

export const GRUPOS_PERMISSAO: GrupoPermissao[] = [
  {
    slug: 'dashboard', label: 'Dashboard', sub: []
  },
  {
    slug: 'caixa', label: 'Caixa',
    sub: [
      { slug: 'caixa/notas-fiscais', label: 'Notas Fiscais' },
    ]
  },
  {
    slug: 'promocoes', label: 'Promoções', sub: []
  },
  {
    slug: 'estoque', label: 'Estoque',
    sub: [
      { slug: 'estoque/alertas', label: 'Alertas' },
      { slug: 'estoque/ajustes', label: 'Ajustes' },
    ]
  },
  {
    slug: 'financeiro', label: 'Financeiro',
    sub: [
      { slug: 'financeiro/contas-receber', label: 'Contas a Receber' },
    ]
  },
  {
    slug: 'relatorios', label: 'Relatórios', sub: []
  },
  {
    slug: 'cadastro-produtos', label: 'Cadastro — Produtos',
    sub: [
      { slug: 'cadastro-produtos/tamanhos',    label: 'Tamanhos' },
      { slug: 'cadastro-produtos/cores',       label: 'Cores' },
      { slug: 'cadastro-produtos/tipos',       label: 'Tipos' },
      { slug: 'cadastro-produtos/composicoes', label: 'Composições' },
      { slug: 'cadastro-produtos/medidas',     label: 'Medidas' },
    ]
  },
  {
    slug: 'cadastro-clientes', label: 'Cadastro — Clientes',
    sub: [
      { slug: 'cadastro-clientes/cashback', label: 'Regras de Cashback' },
    ]
  },
  {
    slug: 'cadastro-colaboradores', label: 'Cadastro — Colaboradores',
    sub: [
      { slug: 'cadastro-colaboradores/permissoes', label: 'Modelos de Permissão' },
    ]
  },
  {
    slug: 'cadastro-financeiro', label: 'Cadastro — Financeiro', sub: []
  },
]

// Todos os slugs de um grupo (pai + filhos)
export function slugsDoGrupo(g: GrupoPermissao): string[] {
  return [g.slug, ...g.sub.map(s => s.slug)]
}

// Verifica se o usuário tem acesso a um slug
// '*' = acesso total | 'secao' = acesso a toda a seção e sub-itens
export function temPermissao(permissoes: string[], slug: string): boolean {
  if (permissoes.includes('*')) return true
  if (permissoes.includes(slug)) return true
  // se o slug é "caixa/notas-fiscais", verifica se tem "caixa"
  const secao = slug.split('/')[0]
  return permissoes.includes(secao)
}
