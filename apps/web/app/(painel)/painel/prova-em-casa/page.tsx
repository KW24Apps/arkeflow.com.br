'use client'

import { TopBar } from '@/components/layout/TopBar'

export default function ProvaEmCasaPage() {
  return (
    <>
      <TopBar />
      <main className="flex-1 flex items-center justify-center">
        <div style={{
          background: 'rgba(8,18,30,0.48)',
          border: '0.5px solid rgba(255,255,255,0.09)',
          borderRadius: '10px',
          padding: '32px 40px',
          textAlign: 'center',
        }}>
          <p style={{ fontSize: '9px', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '10px' }}>
            Prova em Casa
          </p>
          <p style={{ fontSize: '15px', color: 'rgba(255,255,255,0.7)', fontWeight: 500 }}>
            Em construção
          </p>
          <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.25)', marginTop: '6px' }}>
            Esta funcionalidade estará disponível em breve.
          </p>
        </div>
      </main>
    </>
  )
}
