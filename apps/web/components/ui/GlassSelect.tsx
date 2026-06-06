'use client'

import { useState, useRef, useEffect } from 'react'
import { ChevronDown } from 'lucide-react'

interface GlassSelectProps {
  value: string
  onChange: (value: string) => void
  options: { value: string; label: string }[]
  placeholder?: string
  className?: string
}

export function GlassSelect({ value, onChange, options, placeholder = 'Selecione...', className = '' }: GlassSelectProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onClickOutside)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [])

  const selectedLabel = options.find(o => o.value === value)?.label

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        style={{
          background: 'rgba(8,18,30,0.5)',
          border: `0.5px solid ${open ? 'rgba(0,239,255,0.4)' : 'rgba(255,255,255,0.12)'}`,
          borderRadius: '8px',
          padding: '9px 12px',
          fontSize: '13px',
          color: value ? 'rgba(255,255,255,0.75)' : 'rgba(255,255,255,0.3)',
          width: '100%',
          textAlign: 'left',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          outline: 'none',
          cursor: 'pointer',
        }}
      >
        <span>{selectedLabel ?? placeholder}</span>
        <ChevronDown
          size={14}
          style={{
            color: 'rgba(255,255,255,0.4)',
            flexShrink: 0,
            transition: 'transform 0.15s',
            transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
          }}
        />
      </button>

      {open && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            width: '100%',
            marginTop: '4px',
            background: 'rgba(8,18,30,0.92)',
            border: '0.5px solid rgba(255,255,255,0.12)',
            borderRadius: '8px',
            backdropFilter: 'blur(12px)',
            zIndex: 50,
            overflow: 'hidden',
          }}
        >
          {options.map(opt => (
            <OptionRow
              key={opt.value}
              label={opt.label}
              selected={opt.value === value}
              onSelect={() => { onChange(opt.value); setOpen(false) }}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function OptionRow({ label, selected, onSelect }: { label: string; selected: boolean; onSelect: () => void }) {
  const [hovered, setHovered] = useState(false)
  return (
    <button
      type="button"
      onClick={onSelect}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'block',
        width: '100%',
        padding: '9px 12px',
        fontSize: '13px',
        textAlign: 'left',
        border: 'none',
        cursor: 'pointer',
        background: hovered ? 'rgba(0,239,255,0.08)' : 'transparent',
        color: selected ? '#0ef' : hovered ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.6)',
        transition: 'background 0.1s',
      }}
    >
      {label}
    </button>
  )
}
