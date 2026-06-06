'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { TopBar } from '@/components/layout/TopBar'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { formatCurrency, parseCurrency } from '@/lib/utils/currency'
import { promocoesApi } from '@/lib/api/promocoes'
import { SeletorAplicacao, type AplicacaoData } from '@/components/painel/SeletorAplicacao'

type Tipo = 'desconto_percentual' | 'desconto_fixo' | 'segunda_peca' | 'compre_ganhe' | 'primeira_compra'

const TIPOS: { value: Tipo; icon: string; label: string; desc: string }[] = [
  { value: 'desconto_percentual', icon: '🏷️', label: 'Desconto %',      desc: 'Ex: 20% em camisetas' },
  { value: 'desconto_fixo',       icon: '💰', label: 'Desconto R$',     desc: 'Ex: R$30 de desconto' },
  { value: 'segunda_peca',        icon: '2️⃣', label: '2ª Peça c/ Desc.', desc: 'A peça mais barata do par recebe o desconto' },
  { value: 'compre_ganhe',        icon: '🎁', label: 'Compre X Leve Y', desc: 'As peças mais baratas saem de graça' },
  { value: 'primeira_compra',     icon: '🌟', label: 'Primeira Compra', desc: 'Para clientes sem histórico' },
]

export default function NovaPromocaoPage() {
  const router = useRouter()

  const [tipo,          setTipo]          = useState<Tipo>('desconto_percentual')
  const [nome,          setNome]          = useState('')
  const [codigo,        setCodigo]        = useState('')
  const [valor,         setValor]         = useState('')
  const [percentBrinde, setPercentBrinde] = useState('50')
  const [compre,        setCompre]        = useState('2')
  const [ganhe,         setGanhe]         = useState('1')
  const [semVencimento, setSemVencimento] = useState(true)
  const [inicio,        setInicio]        = useState('')
  const [fim,           setFim]           = useState('')
  const [loading,       setLoading]       = useState(false)
  const [erro,          setErro]          = useState('')

  const [aplicacao, setAplicacao] = useState<AplicacaoData>({
    aplica_todos: false, categorias_alvo: [], produtos_ids: [],
  })

  async function handleSalvar(e: React.FormEvent) {
    e.preventDefault()
    setErro('')
    if (!nome.trim()) { setErro('Nome é obrigatório.'); return }

    const nenhuma = !aplicacao.aplica_todos && !aplicacao.categorias_alvo.length && !aplicacao.produtos_ids.length
    if (nenhuma && tipo !== 'primeira_compra') {
      setErro('Selecione onde a promoção será aplicada.'); return
    }

    setLoading(true)
    try {
      await promocoesApi.create({
        nome,
        codigo:          codigo.trim().toUpperCase() || null,
        tipo,
        aplica_todos:    aplicacao.aplica_todos,
        categorias_alvo: aplicacao.categorias_alvo,
        produtos_ids:    aplicacao.produtos_ids,
        aplicacao:       aplicacao.aplica_todos ? 'todos'
                       : aplicacao.categorias_alvo.length ? 'categoria'
                       : 'produtos_selecionados',
        valor_desconto:  ['desconto_percentual','desconto_fixo','primeira_compra'].includes(tipo)
                         ? (tipo === 'desconto_fixo' ? parseCurrency(valor) : parseFloat(valor)) : null,
        unidade:         tipo === 'desconto_percentual' ? 'percentual'
                       : tipo === 'desconto_fixo'       ? 'reais' : null,
        percentual_brinde: tipo === 'segunda_peca'  ? parseFloat(percentBrinde) : null,
        quantidade_compre: tipo === 'compre_ganhe'  ? parseInt(compre)          : null,
        quantidade_brinde: tipo === 'compre_ganhe'  ? parseInt(ganhe)           : null,
        inicio: !semVencimento && inicio ? inicio : null,
        fim:    !semVencimento && fim    ? fim    : null,
        ativo: true,
      })
      router.push('/painel/promocoes')
    } catch (err: any) {
      setErro(err?.response?.data?.error ?? 'Erro ao salvar.')
    } finally { setLoading(false) }
  }

  return (
    <>
      <TopBar />
      <main className="flex-1 overflow-y-auto p-4 md:p-6 pb-10">
        <form onSubmit={handleSalvar} className="max-w-lg flex flex-col gap-5">

          {/* Tipo */}
          <section className="bg-deep-ocean border border-ocean-depth rounded-2xl p-5 flex flex-col gap-3">
            <h3 className="text-sea-foam font-semibold text-xs uppercase tracking-wider">Tipo de promoção</h3>
            {TIPOS.map(t => (
              <button key={t.value} type="button" onClick={() => { setTipo(t.value); setValor('') }}
                className={`flex items-start gap-3 min-h-[52px] px-4 py-3 rounded-xl border text-left transition-colors ${
                  tipo === t.value ? 'border-electric-cyan bg-electric-cyan/10' : 'border-ocean-depth hover:border-teal-current'
                }`}>
                <span className="text-xl mt-0.5">{t.icon}</span>
                <div>
                  <p className={`text-sm font-medium ${tipo === t.value ? 'text-sea-foam' : 'text-steel'}`}>{t.label}</p>
                  <p className="text-steel text-xs">{t.desc}</p>
                </div>
              </button>
            ))}
          </section>

          {/* Nome e código */}
          <section className="bg-deep-ocean border border-ocean-depth rounded-2xl p-5 flex flex-col gap-4">
            <h3 className="text-sea-foam font-semibold text-xs uppercase tracking-wider">Identificação</h3>
            <Input label="Nome *" value={nome} onChange={e => setNome(e.target.value)}
              placeholder="Ex: Queima de estoque Junho" />
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-steel uppercase tracking-wider">Código promocional (opcional)</label>
              <input value={codigo} onChange={e => setCodigo(e.target.value.toUpperCase())}
                placeholder="Ex: VERAO20 — para uso futuro como cupom"
                className="min-h-[48px] bg-midnight border border-ocean-depth rounded-xl px-4 text-sm text-sea-foam placeholder-steel outline-none focus:border-electric-cyan font-mono tracking-wider uppercase" />
              <p className="text-steel text-xs">Será usado futuramente para aplicar a promoção por código/hashtag</p>
            </div>
          </section>

          {/* Parâmetros do desconto */}
          <section className="bg-deep-ocean border border-ocean-depth rounded-2xl p-5 flex flex-col gap-4">
            <h3 className="text-sea-foam font-semibold text-xs uppercase tracking-wider">Configuração</h3>

            {(tipo === 'desconto_percentual' || tipo === 'primeira_compra') && (
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-steel uppercase tracking-wider">Percentual de desconto (%)</label>
                <input type="number" min="0" max="100" value={valor} onChange={e => setValor(e.target.value)}
                  placeholder="Ex: 20"
                  className="min-h-[48px] bg-midnight border border-ocean-depth rounded-xl px-4 text-sm text-sea-foam outline-none focus:border-electric-cyan" />
              </div>
            )}

            {tipo === 'desconto_fixo' && (
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-steel uppercase tracking-wider">Valor do desconto (R$)</label>
                <input type="text" inputMode="numeric" value={valor}
                  onChange={e => setValor(formatCurrency(e.target.value))}
                  onFocus={e => e.currentTarget.select()}
                  placeholder="Ex: 30,00"
                  className="min-h-[48px] bg-midnight border border-ocean-depth rounded-xl px-4 text-sm text-sea-foam outline-none focus:border-electric-cyan" />
              </div>
            )}

            {tipo === 'segunda_peca' && (
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-steel uppercase tracking-wider">Desconto na 2ª peça (mais barata) %</label>
                <input type="number" min="0" max="100" value={percentBrinde} onChange={e => setPercentBrinde(e.target.value)}
                  className="min-h-[48px] bg-midnight border border-ocean-depth rounded-xl px-4 text-sm text-sea-foam outline-none focus:border-electric-cyan" />
                <p className="text-steel text-xs">100% = grátis · 50% = metade do preço</p>
              </div>
            )}

            {tipo === 'compre_ganhe' && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs text-steel uppercase tracking-wider">Compre (X)</label>
                    <input type="number" min="1" value={compre} onChange={e => setCompre(e.target.value)}
                      className="min-h-[48px] bg-midnight border border-ocean-depth rounded-xl px-4 text-sm text-sea-foam outline-none focus:border-electric-cyan" />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs text-steel uppercase tracking-wider">Leve grátis (Y)</label>
                    <input type="number" min="1" value={ganhe} onChange={e => setGanhe(e.target.value)}
                      className="min-h-[48px] bg-midnight border border-ocean-depth rounded-xl px-4 text-sm text-sea-foam outline-none focus:border-electric-cyan" />
                  </div>
                </div>
                <p className="text-steel text-xs -mt-2">
                  Compre {compre} leve {parseInt(compre) + parseInt(ganhe)} — as {ganhe} peça(s) mais baratas saem de graça.
                </p>
              </>
            )}
          </section>

          {/* Onde aplicar */}
          {tipo !== 'primeira_compra' && (
            <section className="bg-deep-ocean border border-ocean-depth rounded-2xl p-5">
              <h3 className="text-sea-foam font-semibold text-xs uppercase tracking-wider mb-4">Onde aplicar</h3>
              <SeletorAplicacao value={aplicacao} onChange={setAplicacao} />
            </section>
          )}

          {/* Período */}
          <section className="bg-deep-ocean border border-ocean-depth rounded-2xl p-5 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sea-foam font-semibold text-xs uppercase tracking-wider">Validade</h3>
                <p className="text-steel text-xs mt-0.5">Sem vencimento = promoção permanente</p>
              </div>
              <button type="button" onClick={() => setSemVencimento(v => !v)}
                className={`w-12 h-6 rounded-full transition-colors relative shrink-0 ${semVencimento ? 'bg-electric-cyan' : 'bg-ocean-depth'}`}>
                <span className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${semVencimento ? 'left-7' : 'left-1'}`} />
              </button>
            </div>
            {!semVencimento && (
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-steel uppercase tracking-wider">Início</label>
                  <input type="date" value={inicio} onChange={e => setInicio(e.target.value)}
                    className="min-h-[48px] bg-midnight border border-ocean-depth rounded-xl px-4 text-sm text-sea-foam outline-none focus:border-electric-cyan" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-steel uppercase tracking-wider">Fim</label>
                  <input type="date" value={fim} onChange={e => setFim(e.target.value)}
                    className="min-h-[48px] bg-midnight border border-ocean-depth rounded-xl px-4 text-sm text-sea-foam outline-none focus:border-electric-cyan" />
                </div>
              </div>
            )}
          </section>

          {erro && <p className="text-red-400 text-sm text-center">{erro}</p>}

          <div className="flex gap-3">
            <button type="button" onClick={() => router.back()}
              className="flex-1 min-h-[52px] border border-ocean-depth text-steel rounded-2xl text-sm">
              Cancelar
            </button>
            <Button type="submit" loading={loading} className="flex-1 min-h-[52px] rounded-2xl">
              Salvar Promoção
            </Button>
          </div>

        </form>
      </main>
    </>
  )
}
