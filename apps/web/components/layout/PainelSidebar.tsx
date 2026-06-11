'use client'

import { useAuthStore } from '@/store/auth.store'
import { Sidebar } from './Sidebar'
import { SECTIONS } from './painel-nav-data'
import { temPermissao } from '@/lib/permissoes'

// Mapa label do menu → slug de permissão
const SLUG_BY_LABEL: Record<string, string> = {
  'Dashboard':      'dashboard',
  'Vendas':         'caixa',
  'Promoções':      'promocoes',
  'Estoque':        'estoque',
  'Financeiro':     'financeiro',
  'Relatórios':     'relatorios',
  'Produtos':       'cadastro-produtos',
  'Clientes':       'cadastro-clientes',
  'Colaboradores':  'cadastro-colaboradores',
  'Configurações':  'cadastro-financeiro',  // sempre visível para dono
}

export function PainelSidebar() {
  const usuario   = useAuthStore(s => s.usuario)
  const permissoes = usuario?.permissoes ?? ['*']

  const items = SECTIONS
    .filter(s => {
      if ('type' in s) return true
      const slug = SLUG_BY_LABEL[s.label]
      if (!slug) return true
      return temPermissao(permissoes, slug)
    })
    .map(s => 'type' in s ? { type: s.type, label: s.label } : { label: s.label, href: s.href, match: (s as any).match })

  return <Sidebar items={items as any} subtitle="Gestão" />
}
