'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { TopBar } from '@/components/layout/TopBar'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { produtosApi } from '@/lib/api/produtos'

interface Atributo { nome: string; valores: string }

export default function NovoProdutoPage() {
  const router = useRouter()

  const [nome,             setNome]             = useState('')
  const [categoria,        setCategoria]        = useState('')
  const [marca,            setMarca]            = useState('')
  const [preco,            setPreco]            = useState('')
  const [controleEstoque,  setControleEstoque]  = useState(true)
  const [atributos,        setAtributos]        = useState<Atributo[]>([])
  const [loading,          setLoading]          = useState(false)
  const [erro,             setErro]             = useState('')

  function addAtributo() {
    setAtributos(prev => [...prev, { nome: '', valores: '' }])
  }

  function updateAtributo(i: number, field: keyof Atributo, value: string) {
    setAtributos(prev => prev.map((a, idx) => idx === i ? { ...a, [field]: value } : a))
  }

  function removeAtributo(i: number) {
    setAtributos(prev => prev.filter((_, idx) => idx !== i))
  }

  // Gera todas as combinações de variações automaticamente
  function gerarVersoes(atributos: Atributo[]) {
    const valoresPorAtributo = atributos
      .filter(a => a.nome && a.valores)
      .map(a => ({
        nome:   a.nome.trim(),
        valores: a.valores.split(',').map(v => v.trim()).filter(Boolean),
      }))

    if (!valoresPorAtributo.length) return []

    // Produto cartesiano das combinações
    return valoresPorAtributo.reduce<Record<string, string>[]>(
      (combos, { nome, valores }) =>
        combos.length === 0
          ? valores.map(v => ({ [nome]: v }))
          : combos.flatMap(c => valores.map(v => ({ ...c, [nome]: v }))),
      []
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErro('')
    if (!nome || !preco) { setErro('Nome e preço são obrigatórios.'); return }

    setLoading(true)
    try {
      const produto = await produtosApi.create({
        nome, categoria: categoria || undefined,
        marca: marca || undefined,
        preco_base: parseFloat(preco.replace(',', '.')),
        controle_estoque: controleEstoque,
        atributos: atributos.filter(a => a.nome).map(a => a.nome.trim()),
      })

      // Cria versões automaticamente se tiver atributos com valores
      const versoes = gerarVersoes(atributos)
      for (const atributos_json of versoes) {
        await produtosApi.createVersao(produto!.id, {
          atributos_json,
          estoque_atual: 0,
          estoque_minimo: 0,
        } as any)
      }

      // Se não tiver atributos, cria uma versão padrão
      if (versoes.length === 0) {
        await produtosApi.createVersao(produto!.id, {
          atributos_json: {},
          estoque_atual: 0,
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

  return (
    <>
      <TopBar title="Novo Produto" />
      <main className="flex-1 overflow-y-auto p-4 md:p-6 pb-10">
        <form onSubmit={handleSubmit} className="max-w-lg flex flex-col gap-5">

          {/* Info básica */}
          <section className="bg-deep-ocean border border-ocean-depth rounded-2xl p-5 flex flex-col gap-4">
            <h3 className="text-sea-foam font-semibold text-sm uppercase tracking-wider">Informações</h3>
            <Input label="Nome *"     value={nome}      onChange={e => setNome(e.target.value)}      placeholder="Ex: Camiseta Básica" />
            <Input label="Categoria"  value={categoria} onChange={e => setCategoria(e.target.value)} placeholder="Ex: Camisetas" />
            <Input label="Marca"      value={marca}     onChange={e => setMarca(e.target.value)}     placeholder="Ex: Nike" />
            <Input label="Preço base (R$) *" type="text" inputMode="decimal" value={preco} onChange={e => setPreco(e.target.value)} placeholder="0,00" />

            {/* Toggle controle de estoque */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sea-foam text-sm font-medium">Controle de estoque</p>
                <p className="text-steel text-xs">Desative para produtos sem controle de quantidade</p>
              </div>
              <button
                type="button"
                onClick={() => setControleEstoque(v => !v)}
                className={`w-12 h-6 rounded-full transition-colors relative ${controleEstoque ? 'bg-electric-cyan' : 'bg-ocean-depth'}`}
              >
                <span className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${controleEstoque ? 'left-7' : 'left-1'}`} />
              </button>
            </div>
          </section>

          {/* Atributos */}
          <section className="bg-deep-ocean border border-ocean-depth rounded-2xl p-5 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sea-foam font-semibold text-sm uppercase tracking-wider">Variações</h3>
                <p className="text-steel text-xs mt-0.5">Ex: Tamanho, Cor, Modelo</p>
              </div>
              <button
                type="button"
                onClick={addAtributo}
                className="min-h-[36px] px-4 bg-ocean-depth text-electric-cyan rounded-xl text-sm font-medium"
              >
                + Adicionar
              </button>
            </div>

            {atributos.length === 0 && (
              <p className="text-steel text-xs text-center py-2">
                Produto sem variações — será criada uma versão única
              </p>
            )}

            {atributos.map((a, i) => (
              <div key={i} className="flex flex-col gap-2 p-3 bg-midnight rounded-xl">
                <div className="flex gap-2 items-center">
                  <input
                    value={a.nome}
                    onChange={e => updateAtributo(i, 'nome', e.target.value)}
                    placeholder="Nome (ex: Tamanho)"
                    className="flex-1 min-h-[44px] bg-deep-ocean border border-ocean-depth rounded-xl px-3 text-sm text-sea-foam placeholder-steel outline-none focus:border-electric-cyan"
                  />
                  <button type="button" onClick={() => removeAtributo(i)} className="text-red-400 text-lg px-2">×</button>
                </div>
                <input
                  value={a.valores}
                  onChange={e => updateAtributo(i, 'valores', e.target.value)}
                  placeholder="Valores separados por vírgula (ex: P, M, G, GG)"
                  className="min-h-[44px] bg-deep-ocean border border-ocean-depth rounded-xl px-3 text-sm text-sea-foam placeholder-steel outline-none focus:border-electric-cyan"
                />
              </div>
            ))}

            {atributos.length > 0 && (
              <p className="text-steel text-xs text-center">
                {gerarVersoes(atributos).length} combinações serão geradas automaticamente
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
