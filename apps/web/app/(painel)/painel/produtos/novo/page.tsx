'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { TopBar } from '@/components/layout/TopBar'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { produtosApi, type CreateProdutoPayload } from '@/lib/api/produtos'
import { catalogosApi, type ItemCatalogo } from '@/lib/api/catalogos'

export default function NovoProdutoPage() {
  const router = useRouter()

  // Dados do produto
  const [nome,            setNome]            = useState('')
  const [tipoId,          setTipoId]          = useState('')
  const [marca,           setMarca]           = useState('')
  const [composicao,      setComposicao]      = useState('')
  const [descricao,       setDescricao]       = useState('')
  const [preco,           setPreco]           = useState('')
  const [controleEstoque, setControleEstoque] = useState(true)

  // Catálogos
  const [tipos,     setTipos]     = useState<ItemCatalogo[]>([])
  const [tamanhos,  setTamanhos]  = useState<ItemCatalogo[]>([])
  const [cores,     setCores]     = useState<ItemCatalogo[]>([])
  const [composicoes, setComposicoes] = useState<ItemCatalogo[]>([])

  // Variações selecionadas
  const [usaTamanho, setUsaTamanho] = useState(false)
  const [usaCor,     setUsaCor]     = useState(false)
  const [tamSel,     setTamSel]     = useState<string[]>([])
  const [corSel,     setCorSel]     = useState<string[]>([])

  const [loading, setLoading] = useState(false)
  const [erro,    setErro]    = useState('')

  useEffect(() => {
    Promise.all([
      catalogosApi.list('tipos_produto'),
      catalogosApi.list('tamanhos'),
      catalogosApi.list('cores'),
      catalogosApi.list('composicoes'),
    ]).then(([t, tam, c, comp]) => {
      setTipos(t); setTamanhos(tam); setCores(c); setComposicoes(comp)
    })
  }, [])

  function toggleSel(id: string, list: string[], setList: (v: string[]) => void) {
    setList(list.includes(id) ? list.filter(x => x !== id) : [...list, id])
  }

  // Gera combinações de tamanhos × cores
  function gerarCombinacoes(): Record<string, string>[] {
    const tams = usaTamanho && tamSel.length > 0
      ? tamanhos.filter(t => tamSel.includes(t.id)).map(t => t.nome)
      : []
    const cors = usaCor && corSel.length > 0
      ? cores.filter(c => corSel.includes(c.id)).map(c => c.nome)
      : []

    if (!tams.length && !cors.length) return [{}]
    if (tams.length && !cors.length)  return tams.map(t => ({ Tamanho: t }))
    if (!tams.length && cors.length)  return cors.map(c => ({ Cor: c }))
    return tams.flatMap(t => cors.map(c => ({ Tamanho: t, Cor: c })))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErro('')
    if (!nome || !preco) { setErro('Nome e preço são obrigatórios.'); return }

    setLoading(true)
    try {
      const payload: CreateProdutoPayload = {
        nome,
        tipo_id:          tipoId || undefined,
        marca:            marca || undefined,
        composicao:       composicao || undefined,
        descricao:        descricao || undefined,
        preco_base:       parseFloat(preco.replace(',', '.')),
        controle_estoque: controleEstoque,
      }
      const produto = await produtosApi.create(payload)

      for (const atributos_json of gerarCombinacoes()) {
        await produtosApi.createVersao(produto!.id, {
          atributos_json,
          estoque_atual:  0,
          estoque_minimo: 0,
        } as any)
      }

      router.push(`/painel/produtos/${produto!.id}`)
    } catch (err: any) {
      setErro(err?.response?.data?.error ?? 'Erro ao salvar produto.')
    } finally {
      setLoading(false)
    }
  }

  const combinacoes = gerarCombinacoes()

  return (
    <>
      <TopBar title="Novo Produto" />
      <main className="flex-1 overflow-y-auto p-4 md:p-6 pb-10">
        <form onSubmit={handleSubmit} className="max-w-lg flex flex-col gap-5">

          {/* Informações básicas */}
          <section className="bg-deep-ocean border border-ocean-depth rounded-2xl p-5 flex flex-col gap-4">
            <h3 className="text-sea-foam font-semibold text-xs uppercase tracking-wider">Informações</h3>

            <Input label="Nome *" value={nome} onChange={e => setNome(e.target.value)} placeholder="Ex: Camiseta Básica" />

            {/* Tipo */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-steel uppercase tracking-wider">Tipo</label>
              <select
                value={tipoId}
                onChange={e => setTipoId(e.target.value)}
                className="min-h-[48px] bg-midnight border border-ocean-depth rounded-xl px-4 text-sm text-sea-foam outline-none focus:border-electric-cyan"
              >
                <option value="">Selecione o tipo...</option>
                {tipos.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
              </select>
            </div>

            <Input label="Marca" value={marca} onChange={e => setMarca(e.target.value)} placeholder="Ex: Nike" />

            <Input
              label="Preço base (R$) *"
              type="text"
              inputMode="decimal"
              value={preco}
              onChange={e => setPreco(e.target.value)}
              placeholder="0,00"
            />

            {/* Composição */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-steel uppercase tracking-wider">Composição</label>
              <select
                value={composicao}
                onChange={e => setComposicao(e.target.value)}
                className="min-h-[48px] bg-midnight border border-ocean-depth rounded-xl px-4 text-sm text-sea-foam outline-none focus:border-electric-cyan"
              >
                <option value="">Selecione ou deixe em branco</option>
                {composicoes.map(c => <option key={c.id} value={c.nome}>{c.nome}</option>)}
              </select>
            </div>

            {/* Descrição */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-steel uppercase tracking-wider">Descrição</label>
              <textarea
                value={descricao}
                onChange={e => setDescricao(e.target.value)}
                placeholder="Detalhes do produto..."
                rows={3}
                className="bg-midnight border border-ocean-depth rounded-xl px-4 py-3 text-sm text-sea-foam placeholder-steel outline-none focus:border-electric-cyan resize-none"
              />
            </div>

            {/* Toggle estoque */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sea-foam text-sm font-medium">Controle de estoque</p>
                <p className="text-steel text-xs">Desative para produtos sem controle de quantidade</p>
              </div>
              <button
                type="button"
                onClick={() => setControleEstoque(v => !v)}
                className={`w-12 h-6 rounded-full transition-colors relative shrink-0 ${controleEstoque ? 'bg-electric-cyan' : 'bg-ocean-depth'}`}
              >
                <span className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${controleEstoque ? 'left-7' : 'left-1'}`} />
              </button>
            </div>
          </section>

          {/* Variações */}
          <section className="bg-deep-ocean border border-ocean-depth rounded-2xl p-5 flex flex-col gap-4">
            <h3 className="text-sea-foam font-semibold text-xs uppercase tracking-wider">Variações</h3>
            <p className="text-steel text-xs -mt-2">Selecione quais atributos este produto usa</p>

            {/* Toggle Tamanho */}
            <div>
              <button
                type="button"
                onClick={() => setUsaTamanho(v => !v)}
                className={`flex items-center gap-3 min-h-[48px] w-full px-4 rounded-xl border transition-colors ${
                  usaTamanho ? 'border-electric-cyan bg-electric-cyan/10' : 'border-ocean-depth'
                }`}
              >
                <span className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 ${usaTamanho ? 'border-electric-cyan bg-electric-cyan' : 'border-steel'}`}>
                  {usaTamanho && <span className="text-midnight text-xs font-bold">✓</span>}
                </span>
                <span className="text-sea-foam text-sm font-medium">Tamanho</span>
              </button>

              {usaTamanho && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {tamanhos.map(t => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => toggleSel(t.id, tamSel, setTamSel)}
                      className={`min-h-[40px] min-w-[48px] px-3 rounded-xl text-sm font-medium border transition-colors ${
                        tamSel.includes(t.id)
                          ? 'bg-electric-cyan text-midnight border-electric-cyan'
                          : 'border-ocean-depth text-steel hover:text-sea-foam'
                      }`}
                    >
                      {t.nome}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Toggle Cor */}
            <div>
              <button
                type="button"
                onClick={() => setUsaCor(v => !v)}
                className={`flex items-center gap-3 min-h-[48px] w-full px-4 rounded-xl border transition-colors ${
                  usaCor ? 'border-electric-cyan bg-electric-cyan/10' : 'border-ocean-depth'
                }`}
              >
                <span className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 ${usaCor ? 'border-electric-cyan bg-electric-cyan' : 'border-steel'}`}>
                  {usaCor && <span className="text-midnight text-xs font-bold">✓</span>}
                </span>
                <span className="text-sea-foam text-sm font-medium">Cor</span>
              </button>

              {usaCor && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {cores.map(c => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => toggleSel(c.id, corSel, setCorSel)}
                      className={`min-h-[40px] px-3 rounded-xl text-sm font-medium border transition-colors flex items-center gap-2 ${
                        corSel.includes(c.id)
                          ? 'bg-electric-cyan text-midnight border-electric-cyan'
                          : 'border-ocean-depth text-steel hover:text-sea-foam'
                      }`}
                    >
                      {c.hex_cor && (
                        <span className="w-3 h-3 rounded-full border border-white/20" style={{ background: c.hex_cor }} />
                      )}
                      {c.nome}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Preview combinações */}
            {combinacoes.length > 0 && (
              <p className="text-steel text-xs text-center pt-2 border-t border-ocean-depth">
                {combinacoes.length === 1 && Object.keys(combinacoes[0]).length === 0
                  ? 'Produto sem variações — versão única'
                  : `${combinacoes.length} variação(ões) serão criadas automaticamente`
                }
              </p>
            )}
          </section>

          {erro && <p className="text-red-400 text-sm text-center">{erro}</p>}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => router.back()}
              className="flex-1 min-h-[52px] border border-ocean-depth text-steel rounded-2xl text-sm font-medium"
            >
              Cancelar
            </button>
            <Button type="submit" loading={loading} className="flex-1 min-h-[52px] rounded-2xl">
              Salvar Produto
            </Button>
          </div>

        </form>
      </main>
    </>
  )
}
