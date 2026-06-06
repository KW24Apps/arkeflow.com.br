'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

export interface SubItem {
  label: string
  href:  string
}

interface Props {
  items:   SubItem[]
  inline?: boolean
}

export function SecondaryNav({ items, inline = false }: Props) {
  const pathname = usePathname()
  if (!items.length) return null

  const links = items.map(item => {
    const active = pathname === item.href || pathname.startsWith(item.href + '/')
    return (
      <Link
        key={item.href}
        href={item.href}
        className={`
          min-h-[40px] px-4 flex items-center text-[13px] font-medium border-b-2 transition-colors whitespace-nowrap
          ${active
            ? 'text-electric-cyan border-electric-cyan'
            : 'text-white/40 border-transparent hover:text-white/70'
          }
        `}
      >
        {item.label}
      </Link>
    )
  })

  if (inline) {
    return (
      <div className="flex items-stretch h-12 pl-20 lg:pl-6 gap-1 pr-2 min-w-max">
        {links}
      </div>
    )
  }

  return (
    <div className="bg-deep-ocean border-b border-ocean-depth shrink-0 overflow-x-auto scrollbar-none">
      <div className="flex px-4 md:px-6 gap-1 min-w-max">
        {links}
      </div>
    </div>
  )
}
