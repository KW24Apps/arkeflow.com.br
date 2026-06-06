/** Cash-register mask: strips non-digits, treats last 2 as cents. */
export function formatCurrency(raw: string): string {
  const d = raw.replace(/\D/g, '')
  if (!d) return ''
  return (parseInt(d, 10) / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

/** Init display value from API float (e.g. 149.9 → "149,90"). */
export function initCurrency(v: number | string | null | undefined): string {
  const n = Number(v)
  if (!n) return ''
  return n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

/** Parse masked display back to float for API (handles thousand separator). */
export function parseCurrency(s: string): number {
  return parseFloat(s.replace(/\./g, '').replace(',', '.')) || 0
}
