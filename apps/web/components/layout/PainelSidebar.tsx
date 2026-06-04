'use client'

import { useAuthStore } from '@/store/auth.store'
import { Sidebar } from './Sidebar'
import { SECTIONS } from './painel-nav-data'
import { temPermissao } from '@/lib/permissoes'
import type { PermissaoSlug } from '@/lib/permissoes'

// Mapa de slug de permissão por seção do painel
const SLUG_BY_LABEL: Record<string, PermissaoSlug> = {
  'Dashboard':     'dashboard',
  'Caixa':         'caixa',
  'Promoções':     'promocoes',
  'Estoque':       'estoque',
  'Financeiro':    'financeiro',
  'Relatórios':    'relatorios',
  'Produtos':      'cadastro-produtos',
  'Clientes':      'cadastro-clientes',
  'Colaboradores': 'cadastro-colaboradores',
  // Financeiro (cadastro) reutiliza slug financeiro
  // Dividers não têm slug
}

export function PainelSidebar() {
  const usuario = useAuthStore(s => s.usuario)
  const permissoes = usuario?.permissoes ?? ['*']

  const items = SECTIONS
    .filter(s => {
      if ('type' in s) return true  // mantém dividers
      const slug = SLUG_BY_LABEL[s.label]
      if (!slug) return true        // sem controle = sempre visível
      return temPermissao(permissoes, slug)
    })
    .map(s => 'type' in s ? { type: s.type, label: s.label } : { label: s.label, href: s.href })

  return <Sidebar items={items as any} subtitle="Gestão" />
}
