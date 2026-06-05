import type { FormaPagamento } from './api/financeiro'

export interface DescontoPorForma {
  forma_id:   string
  nome:       string
  valor_pago: number
  desconto:   number
}

export interface ResultadoDescontoPagamento {
  descontos:              DescontoPorForma[]
  totalDescontoPagamento: number
}

/**
 * Calculates the discount earned by each payment method.
 *
 * Rule (per payment method applied):
 *   discount = min(amount × rate%, maxCap)
 *
 * A maxCap of 0 means uncapped (apply full percentage).
 */
export function calcularDescontoPagamento(
  pagamentos: Array<{ forma: FormaPagamento; valor: number }>
): ResultadoDescontoPagamento {
  const descontos: DescontoPorForma[] = pagamentos.map(p => {
    const rate = parseFloat(p.forma.desconto_percentual) || 0
    const cap  = parseFloat(p.forma.desconto_maximo)     || 0

    let desconto = 0
    if (rate > 0 && p.valor > 0) {
      const bruto = p.valor * (rate / 100)
      desconto    = cap > 0 ? Math.min(bruto, cap) : bruto
    }

    return { forma_id: p.forma.id, nome: p.forma.nome, valor_pago: p.valor, desconto }
  })

  const totalDescontoPagamento = descontos.reduce((s, d) => s + d.desconto, 0)
  return { descontos, totalDescontoPagamento }
}
