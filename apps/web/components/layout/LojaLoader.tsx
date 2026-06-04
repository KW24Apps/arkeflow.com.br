'use client'

import { useEffect } from 'react'
import { api } from '@/lib/api/client'
import { useLojaStore } from '@/store/loja.store'

// Carrega dados da loja uma vez ao montar o painel
export function LojaLoader() {
  const setLoja = useLojaStore(s => s.setLoja)

  useEffect(() => {
    api.get<{ logo_url_loja: string | null }>('/dados-loja/sistema')
      .then(r => setLoja({ logo_url: r.data.logo_url_loja, nome_loja: null }))
      .catch(() => {})
  }, [])

  return null
}
