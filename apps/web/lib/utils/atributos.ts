/** Catalog-backed primary attribute keys, in canonical display order. */
const PRIMARIOS = ['Tamanho', 'Cor'] as const

export type AtributoLinha = { label: string; valor: string }

/**
 * Returns the VALUES of the two primary attributes (Tamanho, then Cor),
 * without labels, skipping any that are absent or empty.
 * All other keys are ignored.
 * For use in compact/inline contexts (cart line, sale recap, reports).
 */
export function atributosInline(attrs: Record<string, string> | null | undefined): string[] {
  if (!attrs) return []
  return PRIMARIOS.map(k => attrs[k]).filter((v): v is string => !!v)
}

/**
 * Returns two grouped lists for use in tooltip/detail views:
 * - principais: [Tamanho, Cor] that exist, with label = key name, in canonical order
 * - medidas: every remaining key in original object order, with label = key name
 * Both arrays omit keys with absent or empty values.
 */
export function atributosCompletos(
  attrs: Record<string, string> | null | undefined,
): { principais: AtributoLinha[]; medidas: AtributoLinha[] } {
  if (!attrs) return { principais: [], medidas: [] }

  const principais: AtributoLinha[] = PRIMARIOS
    .filter(k => !!attrs[k])
    .map(k => ({ label: k, valor: attrs[k] }))

  const primSet = new Set<string>(PRIMARIOS)
  const medidas: AtributoLinha[] = Object.entries(attrs)
    .filter(([k, v]) => !primSet.has(k) && !!v)
    .map(([k, v]) => ({ label: k, valor: v }))

  return { principais, medidas }
}
