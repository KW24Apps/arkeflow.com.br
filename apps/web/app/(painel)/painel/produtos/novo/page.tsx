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

  const [nome,             setNome]            = useState('')
  const [tipoId,           setTipoId]          = useState('')
  const [marca,            setMarca]           = useState('')
  const [composicao,       setComposicao]      = useState('')
  const [descricao,        setDescricao]       = useState('')
  const [preco,            setPreco]           = useState('')
  const [controleEstoque,  setControleEstoque] = useState(true)

  const [tipos,       setTipos]       = useState<ItemCatalogo[]>([])
  const [composicoes, setComposicoes] = useState<ItemCatalogo[]>([])
  const [loading,     setLoading]     = useState(false)
  const [erro,        setErro]        = useState('')

  useEffect(() => {
    Promise.all([
      catalogosApi.list('tipos_produto'),
      catalogosApi.list('composicoes'),
    ]).then(([t, c]) => { setTipos(t); setComposicoes(c) })
  }, [])

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
      // Redireciona para o detalhe onde as variações são adicionadas
      router.push(`/painel/produtos/${produto!.id}`)
    } catch (err: any) {
      setErro(err?.response?.data?.error ?? 'Erro ao salvar produto.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <TopBar title="Novo Produto" />
      <main className="flex-1 overflow-y-auto p-4 md:p-6 pb-10">
        <form onSubmit={handleSubmit} className="max-w-lg flex flex-col gap-5">

          <section className="bg-deep-ocean border border-ocean-depth rounded-2xl p-5 flex flex-col gap-4">
            <h3 className="text-sea-foam font-semibold text-xs uppercase tracking-wider">Informações do Produto</h3>

            <Input label="Nome *" value={nome} onChange={e => setNome(e.target.value)} placeholder="Ex: Camiseta Básica" />

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-steel uppercase tracking-wider">Tipo</label>
              <select value={tipoId} onChange={e => setTipoId(e.target.value)}
                className="min-h-[48px] bg-midnight border border-ocean-depth rounded-xl px-4 text-sm text-sea-foam outline-none focus:border-electric-cyan">
                <option value="">Selecione o tipo...</option>
                {tipos.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
              </select>
            </div>

            <Input label="Marca" value={marca} onChange={e => setMarca(e.target.value)} placeholder="Ex: Nike" />

            <Input label="Preço base (R$) *" type="text" inputMode="decimal"
              value={preco} onChange={e => setPreco(e.target.value)} placeholder="0,00" />

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-steel uppercase tracking-wider">Composição</label>
              <select value={composicao} onChange={e => setComposicao(e.target.value)}
                className="min-h-[48px] bg-midnight border border-ocean-depth rounded-xl px-4 text-sm text-sea-foam outline-none focus:border-electric-cyan">
                <option value="">Selecione ou deixe em branco</option>
                {composicoes.map(c => <option key={c.id} value={c.nome}>{c.nome}</option>)}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-steel uppercase tracking-wider">Descrição</label>
              <textarea value={descricao} onChange={e => setDescricao(e.target.value)}
                placeholder="Detalhes do produto..." rows={3}
                className="bg-midnight border border-ocean-depth rounded-xl px-4 py-3 text-sm text-sea-foam placeholder-steel outline-none focus:border-electric-cyan resize-none" />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-sea-foam text-sm font-medium">Controle de estoque</p>
                <p className="text-steel text-xs">Desative para produtos sem controle de quantidade</p>
              </div>
              <button type="button" onClick={() => setControleEstoque(v => !v)}
                className={`w-12 h-6 rounded-full transition-colors relative shrink-0 ${controleEstoque ? 'bg-electric-cyan' : 'bg-ocean-depth'}`}>
                <span className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${controleEstoque ? 'left-7' : 'left-1'}`} />
              </button>
            </div>
          </section>

          <div className="bg-ocean-depth/30 border border-ocean-depth rounded-2xl p-4">
            <p className="text-steel text-xs text-center">
              As variações (tamanho, cor, estoque, preço e medidas) são adicionadas após salvar o produto.
            </p>
          </div>

          {erro && <p className="text-red-400 text-sm text-center">{erro}</p>}

          <div className="flex gap-3">
            <button type="button" onClick={() => router.back()}
              className="flex-1 min-h-[52px] border border-ocean-depth text-steel rounded-2xl text-sm font-medium">
              Cancelar
            </button>
            <Button type="submit" loading={loading} className="flex-1 min-h-[52px] rounded-2xl">
              Salvar e Adicionar Variações
            </Button>
          </div>

        </form>
      </main>
    </>
  )
}
