'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

export interface SubItem {
  label: string
  href:  string
}

interface Props {
  items: SubItem[]
}

export function SecondaryNav({ items }: Props) {
  const pathname = usePathname()
  if (!items.length) return null

  return (
    <div className="bg-deep-ocean border-b border-ocean-depth shrink-0 overflow-x-auto scrollbar-none">
      <div className="flex px-4 md:px-6 gap-1 min-w-max">
        {items.map(item => {
          const active = pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`
                min-h-[44px] px-4 flex items-center text-sm font-medium border-b-2 transition-colors whitespace-nowrap
                ${active
                  ? 'text-electric-cyan border-electric-cyan'
                  : 'text-steel border-transparent hover:text-sea-foam'
                }
              `}
            >
              {item.label}
            </Link>
          )
        })}
      </div>
    </div>
  )
}
