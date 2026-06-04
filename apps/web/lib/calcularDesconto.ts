import type { SacolaItem } from '@/store/pdv.store'

export interface Promocao {
  id: string
  nome: string
  tipo: 'desconto_percentual' | 'desconto_fixo' | 'segunda_peca' | 'compre_ganhe' | 'primeira_compra'
  aplicacao: 'produtos_selecionados' | 'categoria' | 'todos'
  valor_desconto?: number | null
  unidade?: 'percentual' | 'reais' | null
  quantidade_compre?: number | null  // X em "compre X"
  quantidade_brinde?: number | null  // Y em "leve Y" (itens gratuitos)
  percentual_brinde?: number | null  // % de desconto na segunda peça
  categoria_alvo?: string | null
  produtos_ids?: string[]
  ativo?: boolean
  inicio?: string | null
  fim?: string | null
}

export interface ItemComDesconto extends SacolaItem {
  desconto_item: number  // valor de desconto neste item
  promocao_nome?: string
}

/**
 * Aplica promoções à sacola.
 * Regra: a peça mais barata sempre leva o desconto.
 * Retorna a sacola com os descontos calculados e o total de desconto.
 */
export function calcularDescontos(
  itens: SacolaItem[],
  promocoes: Promocao[],
  primeiraCompra: boolean,
  categoriasMap: Record<string, string>  // produto_id → tipo_produto nome (para filtro de categoria)
): { itensComDesconto: ItemComDesconto[]; totalDesconto: number } {

  // Inicia todos sem desconto
  const resultado: ItemComDesconto[] = itens.map(i => ({ ...i, desconto_item: 0 }))

  for (const promo of promocoes) {

    // Filtrar itens que pertencem a esta promoção
    const pertence = (item: SacolaItem) => {
      if (promo.aplicacao === 'todos') return true
      if (promo.aplicacao === 'categoria') {
        return categoriasMap[item.produto_id] === promo.categoria_alvo
      }
      return promo.produtos_ids?.includes(item.produto_id) ?? false
    }

    const itensDaPromo = resultado.filter(pertence)
    if (!itensDaPromo.length) continue

    switch (promo.tipo) {

      case 'desconto_percentual': {
        const pct = promo.valor_desconto ?? 0
        itensDaPromo.forEach(i => {
          const desc = i.preco_unitario * i.quantidade * (pct / 100)
          i.desconto_item += desc
          i.promocao_nome = promo.nome
        })
        break
      }

      case 'desconto_fixo': {
        const fixo = promo.valor_desconto ?? 0
        // Distribui o desconto fixo pelo item mais barato primeiro
        const sorted = [...itensDaPromo].sort((a, b) => a.preco_unitario - b.preco_unitario)
        let restante = fixo
        for (const i of sorted) {
          const maxDesc = i.preco_unitario * i.quantidade
          const aplicado = Math.min(restante, maxDesc)
          i.desconto_item += aplicado
          i.promocao_nome = promo.nome
          restante -= aplicado
          if (restante <= 0) break
        }
        break
      }

      case 'segunda_peca': {
        // Explode itens individuais por quantidade, ordena do mais caro ao mais barato
        // A segunda peça (mais barata) do par recebe o desconto
        const pct = promo.percentual_brinde ?? 50
        const individuais: { item: ItemComDesconto; preco: number }[] = []

        for (const i of itensDaPromo) {
          for (let q = 0; q < i.quantidade; q++) {
            individuais.push({ item: i, preco: i.preco_unitario })
          }
        }

        // Ordena do mais caro ao mais barato
        individuais.sort((a, b) => b.preco - a.preco)

        // A cada 2 itens, o segundo (mais barato) leva desconto
        for (let idx = 1; idx < individuais.length; idx += 2) {
          const { item } = individuais[idx]
          item.desconto_item += item.preco_unitario * (pct / 100)
          item.promocao_nome = promo.nome
        }
        break
      }

      case 'compre_ganhe': {
        // Compre X, leve Y (gratuito = mais barato)
        const compre = promo.quantidade_compre ?? 2
        const ganhe  = promo.quantidade_brinde ?? 1

        const individuais: { item: ItemComDesconto; preco: number }[] = []
        for (const i of itensDaPromo) {
          for (let q = 0; q < i.quantidade; q++) {
            individuais.push({ item: i, preco: i.preco_unitario })
          }
        }

        // A cada grupo de (compre + ganhe) itens, os mais baratos (ganhe) saem de graça
        const grupoTamanho = compre + ganhe
        for (let inicio = 0; inicio + grupoTamanho <= individuais.length; inicio += grupoTamanho) {
          const grupo = individuais.slice(inicio, inicio + grupoTamanho)
          grupo.sort((a, b) => b.preco - a.preco)  // mais caro primeiro
          // Os últimos `ganhe` itens (mais baratos) saem de graça
          for (let g = 0; g < ganhe; g++) {
            const { item } = grupo[grupo.length - 1 - g]
            item.desconto_item += item.preco_unitario
            item.promocao_nome = promo.nome
          }
        }
        break
      }

      case 'primeira_compra': {
        if (!primeiraCompra) break
        const pct = promo.valor_desconto ?? 0
        const total = itensDaPromo.reduce((s, i) => s + i.preco_unitario * i.quantidade, 0)
        const desc  = total * (pct / 100)
        // Distribui pelo item mais barato
        const sorted = [...itensDaPromo].sort((a, b) => a.preco_unitario - b.preco_unitario)
        let restante = desc
        for (const i of sorted) {
          const max = i.preco_unitario * i.quantidade
          const ap  = Math.min(restante, max)
          i.desconto_item += ap
          i.promocao_nome = promo.nome
          restante -= ap
          if (restante <= 0) break
        }
        break
      }
    }
  }

  // Garante que desconto nunca excede o preço do item
  resultado.forEach(i => {
    i.desconto_item = Math.min(i.desconto_item, i.preco_unitario * i.quantidade)
  })

  const totalDesconto = resultado.reduce((s, i) => s + i.desconto_item, 0)
  return { itensComDesconto: resultado, totalDesconto }
}
