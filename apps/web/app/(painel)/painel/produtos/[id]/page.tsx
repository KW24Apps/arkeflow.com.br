'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { TopBar } from '@/components/layout/TopBar'
import { produtosApi, type Produto, type Versao } from '@/lib/api/produtos'
import { catalogosApi, type ItemCatalogo } from '@/lib/api/catalogos'

// Atributos que não são medidas (são de variação/seleção)
const ATRIBS_VARIACAO = ['Tamanho', 'Cor']

export default function ProdutoDetalhe() {
  const { id }  = useParams<{ id: string }>()
  const router  = useRouter()

  const [produto,  setProduto]  = useState<Produto | null>(null)
  const [medidas,  setMedidas]  = useState<ItemCatalogo[]>([])
  const [loading,  setLoading]  = useState(true)

  // Estado do painel de medida expandido por versão
  const [addingMedida, setAddingMedida] = useState<string | null>(null)
  const [novaMedidaNome, setNovaMedidaNome] = useState('')
  const [novaMedidaValor, setNovaMedidaValor] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    Promise.all([
      produtosApi.get(id),
      catalogosApi.list('medidas'),
    ]).then(([p, m]) => { setProduto(p); setMedidas(m) })
      .finally(() => setLoading(false))
  }, [id])

  async function handleDelete() {
    if (!confirm('Remover este produto?')) return
    await produtosApi.remove(id)
    router.push('/painel/produtos')
  }

  async function handleSaveMedida(versaoId: string) {
    if (!novaMedidaNome || !novaMedidaValor) return
    setSaving(true)
    try {
      const versao = produto!.versoes!.find(v => v.id === versaoId)!
      const novoJson = { ...versao.atributos_json, [novaMedidaNome]: novaMedidaValor }
      await produtosApi.updateVersao(id, versaoId, { atributos_json: novoJson } as any)

      // Atualiza local
      setProduto(prev => prev ? {
        ...prev,
        versoes: prev.versoes!.map(v =>
          v.id === versaoId ? { ...v, atributos_json: novoJson } : v
        )
      } : prev)
      setAddingMedida(null)
      setNovaMedidaNome('')
      setNovaMedidaValor('')
    } finally { setSaving(false) }
  }

  async function handleRemoveMedida(versaoId: string, chave: string) {
    const versao = produto!.versoes!.find(v => v.id === versaoId)!
    const novoJson = { ...versao.atributos_json }
    delete novoJson[chave]
    await produtosApi.updateVersao(id, versaoId, { atributos_json: novoJson } as any)
    setProduto(prev => prev ? {
      ...prev,
      versoes: prev.versoes!.map(v =>
        v.id === versaoId ? { ...v, atributos_json: novoJson } : v
      )
    } : prev)
  }

  if (loading) return (
    <>
      <TopBar title="Produto" />
      <div className="flex justify-center py-16">
        <div className="w-8 h-8 border-2 border-electric-cyan border-t-transparent rounded-full animate-spin" />
      </div>
    </>
  )

  if (!produto) return (
    <>
      <TopBar title="Produto" />
      <p className="text-center text-steel py-16">Produto não encontrado.</p>
    </>
  )

  // Medidas disponíveis que ainda não foram adicionadas à versão em edição
  function medidasDisponiveis(versao: Versao) {
    return medidas.filter(m => !(m.nome in versao.atributos_json))
  }

  return (
    <>
      <TopBar title={produto.nome} />
      <main className="flex-1 overflow-y-auto p-4 md:p-6 pb-10">
        <div className="max-w-lg flex flex-col gap-4">

          {/* Info do produto */}
          <section className="bg-deep-ocean border border-ocean-depth rounded-2xl p-5">
            <div className="flex justify-between items-start mb-3">
              <div>
                <h2 className="text-sea-foam font-bold text-lg">{produto.nome}</h2>
                <p className="text-steel text-sm">
                  {produto.categoria || ''}
                  {produto.marca ? ` · ${produto.marca}` : ''}
                </p>
              </div>
              <p className="text-electric-cyan font-bold text-lg">
                R$ {Number(produto.preco_base).toFixed(2)}
              </p>
            </div>
            {produto.descricao && (
              <p className="text-steel text-sm mb-2">{produto.descricao}</p>
            )}
            {(produto as any).composicao && (
              <p className="text-steel text-xs">Composição: {(produto as any).composicao}</p>
            )}
            <p className="text-steel text-xs mt-1">
              {produto.controle_estoque
                ? `Estoque total: ${produto.estoque_total} un.`
                : 'Sem controle de estoque'}
            </p>
          </section>

          {/* Variações */}
          <section className="bg-deep-ocean border border-ocean-depth rounded-2xl p-5">
            <h3 className="text-sea-foam font-semibold text-xs uppercase tracking-wider mb-3">
              Variações ({produto.versoes?.length ?? 0})
            </h3>

            <div className="flex flex-col gap-3">
              {produto.versoes?.map(v => {
                const varAtribs  = Object.entries(v.atributos_json).filter(([k]) => ATRIBS_VARIACAO.includes(k))
                const medidasAtribs = Object.entries(v.atributos_json).filter(([k]) => !ATRIBS_VARIACAO.includes(k))
                const label = varAtribs.length
                  ? varAtribs.map(([, val]) => val).join(' / ')
                  : 'Versão única'

                const isAdding = addingMedida === v.id

                return (
                  <div key={v.id} className="bg-midnight rounded-2xl overflow-hidden">

                    {/* Cabeçalho da variação */}
                    <div className="flex items-center justify-between px-4 py-3">
                      <div>
                        <p className="text-sea-foam text-sm font-medium">{label}</p>
                        {v.preco_especifico && (
                          <p className="text-electric-cyan text-xs">
                            R$ {Number(v.preco_especifico).toFixed(2)}
                          </p>
                        )}
                      </div>
                      <p className={`text-xs ${v.estoque_atual <= v.estoque_minimo ? 'text-red-400' : 'text-steel'}`}>
                        {produto.controle_estoque ? `${v.estoque_atual} un.` : '—'}
                      </p>
                    </div>

                    {/* Medidas existentes */}
                    {medidasAtribs.length > 0 && (
                      <div className="px-4 pb-2 flex flex-wrap gap-2">
                        {medidasAtribs.map(([chave, valor]) => (
                          <div
                            key={chave}
                            className="flex items-center gap-1.5 bg-ocean-depth rounded-lg px-3 py-1"
                          >
                            <span className="text-steel text-xs">{chave}:</span>
                            <span className="text-sea-foam text-xs font-medium">{valor}</span>
                            <button
                              onClick={() => handleRemoveMedida(v.id, chave)}
                              className="text-steel hover:text-red-400 ml-1 text-xs"
                            >×</button>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Formulário adicionar medida */}
                    {isAdding ? (
                      <div className="px-4 pb-4 flex flex-col gap-2">
                        <select
                          value={novaMedidaNome}
                          onChange={e => setNovaMedidaNome(e.target.value)}
                          className="min-h-[44px] bg-deep-ocean border border-ocean-depth rounded-xl px-3 text-sm text-sea-foam outline-none"
                        >
                          <option value="">Selecione a medida...</option>
                          {medidasDisponiveis(v).map(m => (
                            <option key={m.id} value={m.nome}>{m.nome}</option>
                          ))}
                        </select>
                        <div className="flex gap-2">
                          <input
                            value={novaMedidaValor}
                            onChange={e => setNovaMedidaValor(e.target.value)}
                            placeholder="Ex: 96cm"
                            className="flex-1 min-h-[44px] bg-deep-ocean border border-ocean-depth rounded-xl px-3 text-sm text-sea-foam placeholder-steel outline-none focus:border-electric-cyan"
                          />
                          <button
                            onClick={() => handleSaveMedida(v.id)}
                            disabled={saving || !novaMedidaNome || !novaMedidaValor}
                            className="min-h-[44px] px-4 bg-electric-cyan text-midnight rounded-xl text-sm font-semibold disabled:opacity-40"
                          >
                            OK
                          </button>
                          <button
                            onClick={() => { setAddingMedida(null); setNovaMedidaNome(''); setNovaMedidaValor('') }}
                            className="min-h-[44px] px-3 text-steel rounded-xl"
                          >×</button>
                        </div>
                      </div>
                    ) : (
                      <div className="px-4 pb-3">
                        <button
                          onClick={() => { setAddingMedida(v.id); setNovaMedidaNome(''); setNovaMedidaValor('') }}
                          className="text-xs text-electric-cyan/70 hover:text-electric-cyan transition-colors"
                        >
                          + Adicionar medida
                        </button>
                      </div>
                    )}

                  </div>
                )
              })}

              {(!produto.versoes || produto.versoes.length === 0) && (
                <p className="text-steel text-sm text-center py-4">Nenhuma variação.</p>
              )}
            </div>
          </section>

          {/* Ações */}
          <div className="flex gap-3">
            <button
              onClick={() => router.push(`/painel/produtos/${id}/editar`)}
              className="flex-1 min-h-[52px] bg-electric-cyan text-midnight rounded-2xl text-sm font-semibold"
            >
              Editar produto
            </button>
            <button
              onClick={handleDelete}
              className="min-h-[52px] px-5 border border-red-500/30 text-red-400 rounded-2xl text-sm"
            >
              Remover
            </button>
          </div>

        </div>
      </main>
    </>
  )
}
