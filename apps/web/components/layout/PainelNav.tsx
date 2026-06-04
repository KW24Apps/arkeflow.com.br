'use client'

import { usePathname } from 'next/navigation'
import { SecondaryNav } from './SecondaryNav'
import { SECTIONS } from './painel-nav-data'
import { useAuthStore } from '@/store/auth.store'
import { temPermissao } from '@/lib/permissoes'

export function PainelSecondaryNav() {
  const pathname   = usePathname()
  const usuario    = useAuthStore(s => s.usuario)
  const permissoes = usuario?.permissoes ?? ['*']

  const section = SECTIONS.find(s =>
    'match' in s && s.match.some((m: string) => pathname === m || pathname.startsWith(m + '/'))
  )

  if (!section || !('sub' in section)) return null

  // Filtra sub-itens pela permissão do usuário
  // Sub-itens sem permSlug são sempre visíveis (seções sem controle granular)
  const subsFiltrados = section.sub.filter((item: any) =>
    !item.permSlug || temPermissao(permissoes, item.permSlug)
  )

  return <SecondaryNav items={subsFiltrados} />
}
