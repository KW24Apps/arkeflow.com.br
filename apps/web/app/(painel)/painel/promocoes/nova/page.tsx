'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { TopBar } from '@/components/layout/TopBar'
import { Button } from '@/components/ui/Button'
import { promocoesApi } from '@/lib/api/promocoes'
import { produtosApi, type Produto } from '@/lib/api/produtos'
import { catalogosApi, type ItemCatalogo } from '@/lib/api/catalogos'

type Tipo = 'desconto_percentual' | 'desconto_fixo' | 'segunda_peca' | 'compre_ganhe' | 'primeira_compra'
type Aplicacao = 'todos' | 'categoria' | 'produtos_selecionados'

const TIPOS: { value: Tipo; label: string; icon: string; desc: string }[] = [
  { value: 'desconto_percentual', icon: '🏷️', label: 'Desconto %',        desc: 'X% de desconto em produtos selecionados' },
  { value: 'desconto_fixo',       icon: '💰', label: 'Desconto R$',       desc: 'Valor fixo de desconto' },
  { value: 'segunda_peca',        icon: '2️⃣', label: '2ª Peça c/ Desc.', desc: 'A 2ª peça (mais barata) sai com desconto' },
  { value: 'compre_ganhe',        icon: '🎁', label: 'Compre X Leve Y',   desc: 'Compre X peças, a(s) mais barata(s) sai(em) de graça' },
  { value: 'primeira_compra',     icon: '🌟', label: 'Primeira Compra',   desc: 'Desconto para clientes novos sem histórico' },
]

export default function NovaPromocaoPage() {
  const router = useRouter()

  const [tipo,         setTipo]         = useState<Tipo>('desconto_percentual')
  const [nome,         setNome]         = useState('')
  const [aplicacao,    setAplicacao]    = useState<Aplicacao>('todos')
  const [valor,        setValor]        = useState('')
  const [percentBrinde,setPercentBrinde]= useState('50')
  const [compre,       setCompre]       = useState('2')
  const [ganhe,        setGanhe]        = useState('1')
  const [categoriaAlvo,setCategoriaAlvo]= useState('')
  const [produtosSel,  setProdutosSel]  = useState<string[]>([])
  const [inicio,       setInicio]       = useState('')
  const [fim,          setFim]          = useState('')
  const [semVencimento,setSemVencimento]= useState(true)

  const [produtos,  setProdutos]  = useState<Produto[]>([])
  const [tipos,     setTipos]     = useState<ItemCatalogo[]>([])
  const [loading,   setLoading]   = useState(false)
  const [erro,      setErro]      = useState('')

  useEffect(() => {
    produtosApi.list(undefined, false).then(setProdutos)
    catalogosApi.list('tipos_produto').then(setTipos)
  }, [])

  async function handleSalvar(e: React.FormEvent) {
    e.preventDefault()
    setErro('')
    if (!nome.trim()) { setErro('Nome é obrigatório.'); return }

    setLoading(true)
    try {
      await promocoesApi.create({
        nome,
        tipo,
        aplicacao,
        valor_desconto:    ['desconto_percentual','desconto_fixo','primeira_compra'].includes(tipo)
                           ? parseFloat(valor) : null,
        unidade:           tipo === 'desconto_percentual' ? 'percentual' : tipo === 'desconto_fixo' ? 'reais' : null,
        percentual_brinde: tipo === 'segunda_peca' ? parseFloat(percentBrinde) : null,
        quantidade_compre: tipo === 'compre_ganhe' ? parseInt(compre) : null,
        quantidade_brinde: tipo === 'compre_ganhe' ? parseInt(ganhe)  : null,
        categoria_alvo:    aplicacao === 'categoria' ? categoriaAlvo : null,
        produtos_ids:      aplicacao === 'produtos_selecionados' ? produtosSel : [],
        inicio:            !semVencimento && inicio ? inicio : null,
        fim:               !semVencimento && fim    ? fim    : null,
        ativo: true,
      })
      router.push('/painel/promocoes')
    } catch (err: any) {
      setErro(err?.response?.data?.error ?? 'Erro ao salvar.')
    } finally { setLoading(false) }
  }

  function toggleProduto(id: string) {
    setProdutosSel(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  return (
    <>
      <TopBar title="Nova Promoção" />
      <main className="flex-1 overflow-y-auto p-4 md:p-6 pb-10">
        <form onSubmit={handleSalvar} className="max-w-lg flex flex-col gap-5">

          {/* Tipo */}
          <section className="bg-deep-ocean border border-ocean-depth rounded-2xl p-5 flex flex-col gap-4">
            <h3 className="text-sea-foam font-semibold text-xs uppercase tracking-wider">Tipo de promoção</h3>
            <div className="flex flex-col gap-2">
              {TIPOS.map(t => (
                <button key={t.value} type="button" onClick={() => setTipo(t.value)}
                  className={`flex items-start gap-3 min-h-[56px] px-4 py-3 rounded-xl border text-left transition-colors ${
                    tipo === t.value ? 'border-electric-cyan bg-electric-cyan/10' : 'border-ocean-depth hover:border-teal-current'
                  }`}>
                  <span className="text-xl mt-0.5">{t.icon}</span>
                  <div>
                    <p className={`text-sm font-medium ${tipo === t.value ? 'text-sea-foam' : 'text-steel'}`}>{t.label}</p>
                    <p className="text-steel text-xs">{t.desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </section>

          {/* Nome */}
          <section className="bg-deep-ocean border border-ocean-depth rounded-2xl p-5 flex flex-col gap-4">
            <h3 className="text-sea-foam font-semibold text-xs uppercase tracking-wider">Dados</h3>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-steel uppercase tracking-wider">Nome *</label>
              <input value={nome} onChange={e => setNome(e.target.value)} placeholder="Ex: Queima de estoque Junho"
                className="min-h-[48px] bg-midnight border border-ocean-depth rounded-xl px-4 text-sm text-sea-foam placeholder-steel outline-none focus:border-electric-cyan" />
            </div>

            {/* Valor do desconto */}
            {(tipo === 'desconto_percentual' || tipo === 'desconto_fixo' || tipo === 'primeira_compra') && (
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-steel uppercase tracking-wider">
                  {tipo === 'desconto_fixo' ? 'Valor do desconto (R$)' : 'Percentual de desconto (%)'}
                </label>
                <input type="number" min="0" max={tipo !== 'desconto_fixo' ? '100' : undefined}
                  value={valor} onChange={e => setValor(e.target.value)}
                  placeholder={tipo === 'desconto_fixo' ? '0,00' : '0'}
                  className="min-h-[48px] bg-midnight border border-ocean-depth rounded-xl px-4 text-sm text-sea-foam outline-none focus:border-electric-cyan" />
              </div>
            )}

            {/* Segunda peça: % de desconto */}
            {tipo === 'segunda_peca' && (
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-steel uppercase tracking-wider">Desconto na 2ª peça (%)</label>
                <input type="number" min="0" max="100" value={percentBrinde} onChange={e => setPercentBrinde(e.target.value)}
                  className="min-h-[48px] bg-midnight border border-ocean-depth rounded-xl px-4 text-sm text-sea-foam outline-none focus:border-electric-cyan" />
                <p className="text-steel text-xs">A peça mais barata do par recebe este desconto.</p>
              </div>
            )}

            {/* Compre X ganhe Y */}
            {tipo === 'compre_ganhe' && (
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-steel uppercase tracking-wider">Compre (X)</label>
                  <input type="number" min="1" value={compre} onChange={e => setCompre(e.target.value)}
                    className="min-h-[48px] bg-midnight border border-ocean-depth rounded-xl px-4 text-sm text-sea-foam outline-none focus:border-electric-cyan" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-steel uppercase tracking-wider">Ganhe grátis (Y)</label>
                  <input type="number" min="1" value={ganhe} onChange={e => setGanhe(e.target.value)}
                    className="min-h-[48px] bg-midnight border border-ocean-depth rounded-xl px-4 text-sm text-sea-foam outline-none focus:border-electric-cyan" />
                </div>
                <p className="text-steel text-xs col-span-2">A(s) peça(s) mais barata(s) saem de graça.</p>
              </div>
            )}
          </section>

          {/* Aplicação — não se aplica a primeira_compra */}
          {tipo !== 'primeira_compra' && (
            <section className="bg-deep-ocean border border-ocean-depth rounded-2xl p-5 flex flex-col gap-4">
              <h3 className="text-sea-foam font-semibold text-xs uppercase tracking-wider">Aplicar em</h3>

              <div className="flex flex-col gap-2">
                {([
                  { v: 'todos',                label: 'Todos os produtos' },
                  { v: 'categoria',            label: 'Categoria específica' },
                  { v: 'produtos_selecionados',label: 'Produtos selecionados' },
                ] as { v: Aplicacao; label: string }[]).map(op => (
                  <button key={op.v} type="button" onClick={() => setAplicacao(op.v)}
                    className={`flex items-center gap-3 min-h-[48px] px-4 rounded-xl border text-left transition-colors ${
                      aplicacao === op.v ? 'border-electric-cyan bg-electric-cyan/10' : 'border-ocean-depth'
                    }`}>
                    <span className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                      aplicacao === op.v ? 'border-electric-cyan bg-electric-cyan' : 'border-steel'
                    }`}>
                      {aplicacao === op.v && <span className="text-midnight text-xs font-bold">✓</span>}
                    </span>
                    <span className={`text-sm font-medium ${aplicacao === op.v ? 'text-sea-foam' : 'text-steel'}`}>{op.label}</span>
                  </button>
                ))}
              </div>

              {aplicacao === 'categoria' && (
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-steel uppercase tracking-wider">Tipo de produto</label>
                  <select value={categoriaAlvo} onChange={e => setCategoriaAlvo(e.target.value)}
                    className="min-h-[48px] bg-midnight border border-ocean-depth rounded-xl px-4 text-sm text-sea-foam outline-none">
                    <option value="">Selecione...</option>
                    {tipos.map(t => <option key={t.id} value={t.nome}>{t.nome}</option>)}
                  </select>
                </div>
              )}

              {aplicacao === 'produtos_selecionados' && (
                <div className="flex flex-col gap-2">
                  <p className="text-xs text-steel uppercase tracking-wider">
                    Produtos ({produtosSel.length} selecionado(s))
                  </p>
                  <div className="max-h-48 overflow-y-auto flex flex-col gap-1">
                    {produtos.map(p => (
                      <button key={p.id} type="button" onClick={() => toggleProduto(p.id)}
                        className={`flex items-center gap-3 min-h-[44px] px-3 rounded-xl border text-left transition-colors ${
                          produtosSel.includes(p.id) ? 'border-electric-cyan bg-electric-cyan/10' : 'border-ocean-depth'
                        }`}>
                        <span className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 ${
                          produtosSel.includes(p.id) ? 'border-electric-cyan bg-electric-cyan' : 'border-steel'
                        }`}>
                          {produtosSel.includes(p.id) && <span className="text-midnight text-[9px] font-bold">✓</span>}
                        </span>
                        <span className={`text-sm ${produtosSel.includes(p.id) ? 'text-sea-foam' : 'text-steel'}`}>{p.nome}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </section>
          )}

          {/* Período de validade */}
          <section className="bg-deep-ocean border border-ocean-depth rounded-2xl p-5 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sea-foam font-semibold text-xs uppercase tracking-wider">Período de validade</h3>
                <p className="text-steel text-xs mt-0.5">Deixe sem vencimento para promoção permanente</p>
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
