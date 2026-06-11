'use client'

interface ConfirmModalProps {
  isOpen: boolean
  title: string
  message?: string
  confirmLabel?: string
  confirmStyle?: 'danger' | 'cyan'
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmModal({
  isOpen, title, message,
  confirmLabel = 'Confirmar',
  confirmStyle = 'danger',
  onConfirm, onCancel,
}: ConfirmModalProps) {
  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      style={{ background: 'rgba(0,0,0,0.5)' }}
      onClick={onCancel}
    >
      <style>{`
        .cm-cancel { transition: background 120ms, border-color 120ms, box-shadow 120ms; outline: none; }
        .cm-cancel:hover { background: rgba(255,255,255,0.12) !important; border-color: rgba(255,255,255,0.30) !important; color: rgba(255,255,255,0.95) !important; }
        .cm-cancel:focus-visible { box-shadow: 0 0 0 2px rgba(255,255,255,0.25); }
        .cm-confirm-danger { transition: background 120ms, box-shadow 120ms; outline: none; }
        .cm-confirm-danger:hover { background: rgba(240,100,100,1) !important; }
        .cm-confirm-danger:focus-visible { box-shadow: 0 0 0 2px rgba(240,100,100,0.35); }
        .cm-confirm-cyan { transition: background 120ms, box-shadow 120ms; outline: none; }
        .cm-confirm-cyan:hover { background: rgba(0,239,255,1) !important; }
        .cm-confirm-cyan:focus-visible { box-shadow: 0 0 0 2px rgba(0,239,255,0.35); }
      `}</style>
      <div
        className="w-full flex flex-col"
        style={{
          maxWidth: '360px',
          background: 'rgba(8,18,30,0.92)',
          backdropFilter: 'blur(12px)',
          border: '0.5px solid rgba(255,255,255,0.12)',
          borderRadius: '12px',
          padding: '24px',
        }}
        onClick={e => e.stopPropagation()}
      >
        <p style={{ fontSize: '14px', fontWeight: 500, color: 'rgba(255,255,255,0.85)' }}>{title}</p>
        {message && (
          <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)', marginTop: '8px' }}>{message}</p>
        )}
        <div className="flex justify-end gap-2" style={{ marginTop: '20px' }}>
          <button
            onClick={onCancel}
            className="cm-cancel"
            style={{
              background: 'rgba(255,255,255,0.06)',
              border: '0.5px solid rgba(255,255,255,0.12)',
              borderRadius: '8px',
              padding: '8px 16px',
              fontSize: '13px',
              color: 'rgba(255,255,255,0.5)',
              cursor: 'pointer',
            }}
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            className={confirmStyle === 'cyan' ? 'cm-confirm-cyan' : 'cm-confirm-danger'}
            style={{
              background: confirmStyle === 'cyan' ? 'rgba(0,239,255,0.85)' : 'rgba(240,100,100,0.85)',
              border: 'none',
              borderRadius: '8px',
              padding: '8px 20px',
              fontSize: '13px',
              fontWeight: 500,
              color: '#0a0a1a',
              cursor: 'pointer',
            }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
