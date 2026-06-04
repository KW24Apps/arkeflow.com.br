'use client'

import { usePathname } from 'next/navigation'
import { SecondaryNav } from './SecondaryNav'
import { SECTIONS } from './painel-nav-data'

export function PainelSecondaryNav() {
  const pathname = usePathname()
  const section  = SECTIONS.find(s =>
    'match' in s && s.match.some((m: string) => pathname === m || pathname.startsWith(m + '/'))
  )
  const sub = (section && 'sub' in section) ? section.sub : []
  return <SecondaryNav items={[...sub]} />
}
