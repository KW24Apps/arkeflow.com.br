'use client'

import { useAuthStore } from '@/store/auth.store'

interface TopBarProps {
  title: string
}

export function TopBar({ title }: TopBarProps) {
  const usuario = useAuthStore(s => s.usuario)

  return (
    <header className="h-16 bg-deep-ocean border-b border-ocean-depth px-6 lg:px-6 pl-20 lg:pl-6 flex items-center justify-between shrink-0">
      <h2 className="text-sea-foam font-semibold text-base">{title}</h2>
      {usuario && (
        <p className="text-steel text-xs hidden sm:block">{usuario.email}</p>
      )}
    </header>
  )
}
