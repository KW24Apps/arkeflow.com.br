'use client'

import { useEffect } from 'react'
import { api } from '@/lib/api/client'

// Envia ping a cada 5 minutos enquanto a aba está aberta
// Isso permite detectar quem está REALMENTE online agora
const INTERVALO_MS = 5 * 60 * 1000  // 5 minutos

export function Heartbeat() {
  useEffect(() => {
    // Ping imediato ao abrir
    api.post('/auth/ping').catch(() => {})

    const timer = setInterval(() => {
      api.post('/auth/ping').catch(() => {})
    }, INTERVALO_MS)

    return () => clearInterval(timer)
  }, [])

  return null  // componente invisível
}
