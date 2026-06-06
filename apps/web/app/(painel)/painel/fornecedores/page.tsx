'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { TopBar } from '@/components/layout/TopBar'
import { fornecedoresApi, type Fornecedor } from '@/lib/api/fornecedores'

const ROW = {
  background: 'rgba(8,18,30,0.35)',
  border: '0.5px solid rgba(255,255,255,0.07)',
  borderRadius: '8px',
}

function fmtCNPJ(v: string) {
  const d = v.replace(/\D/g, '').slice(0, 14)
  if (d.length <= 2)  return d
  if (d.length <= 5)  return `${d.slice(0,2)}.${d.slice(2)}`
  if (d.length <= 8)  return `${d.slice(0,2)}.${d.slice(2,5)}.${d.slice(5)}`
  if (d.length <= 12) return `${d.slice(0,2)}.${d.slice(2,5)}.${d.slice(5,8)}/${d.slice(8)}`
  return `${d.slice(0,2)}.${d.slice(2,5)}.${d.slice(5,8)}/${d.slice(8,12)}-${d.slice(12)}`
}

export default function FornecedoresPage() {
  const router = useRouter()
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([])
  const [loading,      setLoading]      = useState(true)
  const [q,            setQ]            = useState('')

  useEffect(() => {
    fornecedoresApi.list().then(setFornecedores).finally(() => setLoading(false))
  }, [])

  return (
    <>
      <TopBar />
      <main className="flex-1 p-4 md:p-5 overflow-y-auto pb-20">

        {/* Search */}
        <div className="mb-4">
          <input
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="Buscar por razão social ou CNPJ..."
            className="w-full outline-none"
            style={{
              background: 'rgba(8,18,30,0.5)',
              border: '0.5px solid rgba(255,255,255,0.12)',
              borderRadius: '8px',
              padding: '10px 14px',
              fontSize: '13px',
              color: 'rgba(255,255,255,0.6)',
            }}
            onFocus={e => (e.currentTarget.style.borderColor = 'rgba(0,239,255,0.4)')}
            onBlur={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)')}
          />
        </div>

        {(() => {
          const lower = q.toLowerCase()
          const filtered = q ? fornecedores.filter(f =>
            [f.razao_social, f.cnpj, f.nome_fantasia].some(x => x?.toLowerCase().includes(lower))
          ) : fornecedores
          return loading ? (
            <div className="flex justify-center py-16">
              <div className="w-8 h-8 border-2 border-electric-cyan border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center py-16 gap-3">
              <span style={{ fontSize: '36px', opacity: 0.3 }}>{q ? '🔍' : '🚚'}</span>
              <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '14px' }}>{q ? 'Nenhum resultado encontrado' : 'Nenhum fornecedor cadastrado'}</p>
              {!q && <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '12px' }}>Toque no + para adicionar</p>}
            </div>
          ) : (
            <div className="flex flex-col gap-1.5">
              {filtered.map(f => (
                <div
                  key={f.id}
                  onClick={() => router.push(`/painel/fornecedores/${f.id}`)}
                  className="flex items-center gap-3 cursor-pointer transition-all active:scale-[0.995]"
                  style={{ ...ROW, padding: '10px 12px' }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)')}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)')}
                >
                  <div className="flex items-center justify-center shrink-0"
                    style={{ width: '36px', height: '36px', background: 'rgba(0,239,255,0.1)', borderRadius: '8px' }}>
                    <span style={{ color: 'rgba(0,239,255,0.7)', fontWeight: 600, fontSize: '14px' }}>
                      {f.razao_social.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="truncate" style={{ fontSize: '13px', fontWeight: 500, color: 'rgba(255,255,255,0.82)' }}>
                      {f.nome_fantasia || f.razao_social}
                    </p>
                    <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.35)', marginTop: '2px' }}>
                      {f.cnpj ? fmtCNPJ(f.cnpj) : 'Sem CNPJ'}
                      {(f.cidade || f.estado) && ` · ${[f.cidade, f.estado].filter(Boolean).join('/')}`}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )
        })()}

        <Link
          href="/painel/fornecedores/novo"
          className="fixed bottom-6 right-6 flex items-center justify-center shadow-lg active:scale-95 transition-transform"
          style={{
            width: '48px', height: '48px',
            background: 'rgba(0,239,255,0.9)',
            borderRadius: '50%',
            color: '#0a1e2a',
            fontSize: '24px', fontWeight: 700,
          }}
        >
          +
        </Link>
      </main>
    </>
  )
}
