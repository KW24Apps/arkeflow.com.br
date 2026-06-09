'use client'

import { useState, useRef, useEffect, forwardRef, useImperativeHandle } from 'react'
import { ChevronDown } from 'lucide-react'

export interface GlassSelectOption {
  value:     string
  label:     string
  disabled?: boolean
}

export interface GlassSelectHandle {
  focus: () => void
}

interface GlassSelectProps {
  value:       string
  onChange:    (value: string) => void
  options:     GlassSelectOption[]
  placeholder?: string
  className?:  string
  style?:      React.CSSProperties
  // Fires when user presses Enter to confirm a selection (keyboard nav).
  // Receives the confirmed value so the parent can route focus without
  // relying on stale state from React's async batched updates.
  onConfirm?:  (value: string) => void
}

export const GlassSelect = forwardRef<GlassSelectHandle, GlassSelectProps>(
  function GlassSelect({ value, onChange, options, placeholder = 'Selecione...', className = '', style, onConfirm }, ref) {
    const [open,           setOpen]           = useState(false)
    const [highlightedIdx, setHighlightedIdx] = useState(-1)
    const [dropdownPos,    setDropdownPos]    = useState({ top: 0, left: 0, width: 0 })
    const containerRef = useRef<HTMLDivElement>(null)
    const triggerRef   = useRef<HTMLButtonElement>(null)

    useImperativeHandle(ref, () => ({
      focus: () => triggerRef.current?.focus(),
    }))

    // Close on click outside
    useEffect(() => {
      function onMouseDown(e: MouseEvent) {
        if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
          setOpen(false)
        }
      }
      document.addEventListener('mousedown', onMouseDown)
      return () => document.removeEventListener('mousedown', onMouseDown)
    }, [])

    // Close on scroll / resize (dropdown is fixed-position, would drift)
    useEffect(() => {
      if (!open) return
      function close() { setOpen(false) }
      window.addEventListener('scroll', close, true)
      window.addEventListener('resize', close)
      return () => {
        window.removeEventListener('scroll', close, true)
        window.removeEventListener('resize', close)
      }
    }, [open])

    function firstEnabled() {
      return options.findIndex(o => !o.disabled)
    }
    function nextEnabled(from: number) {
      for (let i = from + 1; i < options.length; i++) {
        if (!options[i].disabled) return i
      }
      return from
    }
    function prevEnabled(from: number) {
      for (let i = from - 1; i >= 0; i--) {
        if (!options[i].disabled) return i
      }
      return from
    }

    function openDropdown() {
      if (triggerRef.current) {
        const rect = triggerRef.current.getBoundingClientRect()
        setDropdownPos({ top: rect.bottom + 4, left: rect.left, width: rect.width })
      }
      const idx = options.findIndex(o => o.value === value && !o.disabled)
      setHighlightedIdx(idx >= 0 ? idx : firstEnabled())
      setOpen(true)
    }

    function handleKeyDown(e: React.KeyboardEvent<HTMLButtonElement>) {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        if (!open) { openDropdown() } else { setHighlightedIdx(i => nextEnabled(i)) }
        return
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        if (!open) { openDropdown() } else { setHighlightedIdx(i => prevEnabled(i)) }
        return
      }
      if (e.key === 'Enter') {
        e.preventDefault()
        if (open) {
          const opt = highlightedIdx >= 0 ? options[highlightedIdx] : null
          if (opt && !opt.disabled) {
            onChange(opt.value)
            setOpen(false)
            onConfirm?.(opt.value)
          }
        } else {
          // Closed: confirm current value without navigating
          onConfirm?.(value)
        }
        return
      }
      if (e.key === 'Escape') { setOpen(false); return }
    }

    const selectedLabel = options.find(o => o.value === value)?.label

    return (
      <div ref={containerRef} className={`relative ${className}`} style={style}>
        <button
          ref={triggerRef}
          type="button"
          onClick={() => open ? setOpen(false) : openDropdown()}
          onKeyDown={handleKeyDown}
          style={{
            background:   'rgba(2,8,16,0.8)',
            border:       `0.5px solid ${open ? 'rgba(0,239,255,0.4)' : 'rgba(255,255,255,0.12)'}`,
            borderRadius: '12px',
            padding:      '0 14px',
            minHeight:    '44px',
            fontSize:     '13px',
            color:        value ? 'rgba(255,255,255,0.88)' : 'rgba(255,255,255,0.3)',
            width:        '100%',
            textAlign:    'left',
            display:      'flex',
            justifyContent: 'space-between',
            alignItems:   'center',
            outline:      'none',
            cursor:       'pointer',
            boxSizing:    'border-box',
          }}
        >
          <span>{selectedLabel ?? placeholder}</span>
          <ChevronDown
            size={14}
            style={{
              color:      'rgba(255,255,255,0.4)',
              flexShrink: 0,
              transition: 'transform 0.15s',
              transform:  open ? 'rotate(180deg)' : 'rotate(0deg)',
            }}
          />
        </button>

        {open && (
          <div
            style={{
              position:       'fixed',
              top:            `${dropdownPos.top}px`,
              left:           `${dropdownPos.left}px`,
              width:          `${dropdownPos.width}px`,
              background:     'rgba(8,18,30,0.97)',
              border:         '0.5px solid rgba(255,255,255,0.12)',
              borderRadius:   '10px',
              backdropFilter: 'blur(12px)',
              zIndex:         9999,
              overflow:       'hidden',
              maxHeight:      '280px',
              overflowY:      'auto',
            }}
          >
            {options.map((opt, idx) => (
              <OptionRow
                key={opt.value}
                label={opt.label}
                selected={opt.value === value}
                highlighted={idx === highlightedIdx}
                disabled={opt.disabled}
                onSelect={() => {
                  if (opt.disabled) return
                  onChange(opt.value)
                  setOpen(false)
                }}
                onHover={() => { if (!opt.disabled) setHighlightedIdx(idx) }}
              />
            ))}
          </div>
        )}
      </div>
    )
  }
)

function OptionRow({ label, selected, highlighted, disabled, onSelect, onHover }: {
  label:       string
  selected:    boolean
  highlighted: boolean
  disabled?:   boolean
  onSelect:    () => void
  onHover:     () => void
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      onMouseEnter={onHover}
      style={{
        display:    'block',
        width:      '100%',
        padding:    '9px 12px',
        fontSize:   '13px',
        textAlign:  'left',
        border:     'none',
        cursor:     disabled ? 'default' : 'pointer',
        background: !disabled && highlighted ? 'rgba(0,239,255,0.08)' : 'transparent',
        color:      disabled
          ? 'rgba(255,255,255,0.25)'
          : selected
            ? '#0ef'
            : highlighted
              ? 'rgba(255,255,255,0.9)'
              : 'rgba(255,255,255,0.6)',
        transition: 'background 0.1s',
        opacity:    disabled ? 0.6 : 1,
      }}
    >
      {label}
    </button>
  )
}
