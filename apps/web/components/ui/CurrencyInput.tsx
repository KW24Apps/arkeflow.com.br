'use client'

// Integer cents, right-to-left digit entry
export function CurrencyInput({
  value, onChange, onEnter, onFocus, onBlur, placeholder, style, className, autoFocus,
}: {
  value:       number
  onChange:    (cents: number) => void
  onEnter?:    () => void
  onFocus?:    (e: React.FocusEvent<HTMLInputElement>) => void
  onBlur?:     (e: React.FocusEvent<HTMLInputElement>) => void
  placeholder?: string
  style?:      React.CSSProperties
  className?:  string
  autoFocus?:  boolean
}) {
  function fmtCents(c: number) {
    if (c === 0) return ''
    const r = Math.floor(c / 100)
    const cents = c % 100
    return `R$ ${r.toLocaleString('pt-BR')},${cents.toString().padStart(2, '0')}`
  }
  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace') { e.preventDefault(); onChange(Math.floor(value / 10)); return }
    if (e.key >= '0' && e.key <= '9') {
      e.preventDefault()
      const next = value * 10 + parseInt(e.key, 10)
      if (next <= 99_999_999) onChange(next)
      return
    }
    if (e.key === 'Enter' && onEnter) { onEnter(); return }
  }
  return (
    <input
      type="text"
      value={fmtCents(value)}
      onChange={() => {}}
      onKeyDown={onKeyDown}
      onFocus={onFocus}
      onBlur={onBlur}
      placeholder={placeholder ?? 'R$ 0,00'}
      autoFocus={autoFocus}
      style={style}
      className={className}
    />
  )
}
