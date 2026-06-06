'use client'

import { usePathname } from 'next/navigation'
import { SecondaryNav } from './SecondaryNav'
import { SECTIONS } from './painel-nav-data'
import { useAuthStore } from '@/store/auth.store'
import { temPermissao } from '@/lib/permissoes'

interface Props {
  inline?: boolean
}

export function PainelSecondaryNav({ inline }: Props = {}) {
  const pathname   = usePathname()
  const usuario    = useAuthStore(s => s.usuario)
  const permissoes = usuario?.permissoes ?? ['*']

  const section = SECTIONS.find(s =>
    'match' in s && s.match.some((m: string) => pathname === m || pathname.startsWith(m + '/'))
  )

  if (!section || !('sub' in section)) return null

  const subsFiltrados = section.sub.filter((item: any) =>
    !item.permSlug || temPermissao(permissoes, item.permSlug)
  )

  return <SecondaryNav items={subsFiltrados} inline={inline} />
}
