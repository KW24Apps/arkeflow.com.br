'use client'

import { useState, useRef, useEffect, useLayoutEffect, useCallback, forwardRef, useImperativeHandle } from 'react'
import { createPortal } from 'react-dom'
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
  value:        string
  onChange:     (value: string) => void
  options:      GlassSelectOption[]
  placeholder?: string
  className?:   string
  style?:       React.CSSProperties
  // Fires when user presses Enter to confirm; receives confirmed value so parent
  // can route focus without relying on stale formaAtual state.
  onConfirm?:   (value: string) => void
}

const MENU_MAX_H = 280

interface DropdownPos {
  top:    number   // rect.bottom + 4 — used when opening downward
  bottom: number   // window.innerHeight - rect.top + 4 — used when opening upward
  left:   number
  width:  number
  openUp: boolean
}

export const GlassSelect = forwardRef<GlassSelectHandle, GlassSelectProps>(
  function GlassSelect({ value, onChange, options, placeholder = 'Selecione...', className = '', style, onConfirm }, ref) {
    const [open,           setOpen]           = useState(false)
    const [highlightedIdx, setHighlightedIdx] = useState(-1)
    const [pos,            setPos]            = useState<DropdownPos>({ top: 0, bottom: 0, left: 0, width: 0, openUp: false })
    const [mounted,        setMounted]        = useState(false)

    const containerRef = useRef<HTMLDivElement>(null)
    const triggerRef   = useRef<HTMLButtonElement>(null)
    const dropdownRef  = useRef<HTMLDivElement>(null)

    // Needed for portal — document is unavailable during SSR
    useEffect(() => setMounted(true), [])

    useImperativeHandle(ref, () => ({
      focus: () => triggerRef.current?.focus(),
    }))

    // Close on click outside — must also allow clicks inside the portalled dropdown
    useEffect(() => {
      function onMouseDown(e: MouseEvent) {
        const inTrigger  = containerRef.current?.contains(e.target as Node)
        const inDropdown = dropdownRef.current?.contains(e.target as Node)
        if (!inTrigger && !inDropdown) setOpen(false)
      }
      document.addEventListener('mousedown', onMouseDown)
      return () => document.removeEventListener('mousedown', onMouseDown)
    }, [])

    const computePos = useCallback((): DropdownPos | null => {
      if (!triggerRef.current) return null
      const rect    = triggerRef.current.getBoundingClientRect()
      const vvLeft  = window.visualViewport?.offsetLeft  ?? 0
      const vvTop   = window.visualViewport?.offsetTop   ?? 0
      const vvH     = window.visualViewport?.height      ?? window.innerHeight
      const spaceBelow = vvH - rect.bottom
      const openUp     = spaceBelow < MENU_MAX_H + 8
      return {
        top:    rect.bottom + 4 - vvTop,
        bottom: vvH - rect.top + 4 + vvTop,
        left:   rect.left - vvLeft,
        width:  rect.width,
        openUp,
      }
    }, [])

    // Measure synchronously after DOM paints so getBoundingClientRect is accurate
    useLayoutEffect(() => {
      if (!open) return
      const p = computePos()
      if (p) setPos(p)
      // rAF tick catches any layout shift that happens on the same frame
      const raf = requestAnimationFrame(() => {
        const p2 = computePos()
        if (p2) setPos(p2)
      })
      return () => cancelAnimationFrame(raf)
    }, [open, computePos])

    // Reposition on scroll / resize instead of closing
    useEffect(() => {
      if (!open) return
      function reposition() {
        const p = computePos()
        if (p) setPos(p)
      }
      window.addEventListener('scroll', reposition, true)
      window.addEventListener('resize', reposition)
      return () => {
        window.removeEventListener('scroll', reposition, true)
        window.removeEventListener('resize', reposition)
      }
    }, [open, computePos])

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
      const idx = options.findIndex(o => o.value === value && !o.disabled)
      setHighlightedIdx(idx >= 0 ? idx : firstEnabled())
      setOpen(true)  // useLayoutEffect fires after this and measures accurately
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
          // Already closed: confirm current value without opening
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
            background:     'rgba(2,8,16,0.8)',
            border:         `0.5px solid ${open ? 'rgba(0,239,255,0.4)' : 'rgba(255,255,255,0.12)'}`,
            borderRadius:   '12px',
            padding:        '0 14px',
            minHeight:      '44px',
            fontSize:       '13px',
            color:          value ? 'rgba(255,255,255,0.88)' : 'rgba(255,255,255,0.3)',
            width:          '100%',
            textAlign:      'left',
            display:        'flex',
            justifyContent: 'space-between',
            alignItems:     'center',
            outline:        'none',
            cursor:         'pointer',
            boxSizing:      'border-box',
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

        {/* Portal: escapes any backdropFilter / transform ancestor so position:fixed
            is always relative to the viewport, not the modal container.            */}
        {mounted && open && createPortal(
          <div
            ref={dropdownRef}
            style={{
              position:       'fixed',
              top:            pos.openUp ? 'auto' : `${pos.top}px`,
              bottom:         pos.openUp ? `${pos.bottom}px` : 'auto',
              left:           `${pos.left}px`,
              width:          `${pos.width}px`,
              background:     'rgba(8,18,30,0.97)',
              border:         '0.5px solid rgba(255,255,255,0.12)',
              borderRadius:   '10px',
              backdropFilter: 'blur(12px)',
              zIndex:         9999,
              overflow:       'hidden',
              maxHeight:      `${MENU_MAX_H}px`,
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
          </div>,
          document.body
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
