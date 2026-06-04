'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { TopBar } from '@/components/layout/TopBar'
import { produtosApi, type Produto, type Versao } from '@/lib/api/produtos'
import { catalogosApi, type ItemCatalogo } from '@/lib/api/catalogos'

type FormMedida = { nome: string; valor: string }

interface VersaoForm {
  tamanho_id:       string
  cor_id:           string
  estoque_atual:    string
  estoque_minimo:   string
  preco_especifico: string
  medidas:          FormMedida[]
}

const FORM_VAZIO: VersaoForm = {
  tamanho_id: '', cor_id: '', estoque_atual: '', estoque_minimo: '', preco_especifico: '', medidas: []
}

const ATRIBS_VAR = ['Tamanho', 'Cor']

export default function ProdutoDetalhe() {
  const { id }  = useParams<{ id: string }>()
  const router  = useRouter()

  const [produto,   setProduto]   = useState<Produto | null>(null)
  const [tamanhos,  setTamanhos]  = useState<ItemCatalogo[]>([])
  const [cores,     setCores]     = useState<ItemCatalogo[]>([])
  const [medidas,   setMedidas]   = useState<ItemCatalogo[]>([])
  const [loading,   setLoading]   = useState(true)

  // Formulário de variação
  const [formAberto,    setFormAberto]    = useState(false)
  const [editandoId,    setEditandoId]    = useState<string | null>(null)
  const [form,          setForm]          = useState<VersaoForm>(FORM_VAZIO)
  const [salvando,      setSalvando]      = useState(false)
  const [erroForm,      setErroForm]      = useState('')

  useEffect(() => {
    Promise.all([
      produtosApi.get(id),
      catalogosApi.list('tamanhos'),
      catalogosApi.list('cores'),
      catalogosApi.list('medidas'),
    ]).then(([p, t, c, m]) => {
      setProduto(p); setTamanhos(t); setCores(c); setMedidas(m)
    }).finally(() => setLoading(false))
  }, [id])

  function abrirNovaVariacao() {
    setForm(FORM_VAZIO)
    setEditandoId(null)
    setErroForm('')
    setFormAberto(true)
  }

  function abrirEdicao(v: Versao) {
    const tamanhoNome = v.atributos_json['Tamanho']
    const corNome     = v.atributos_json['Cor']
    const tam = tamanhoNome ? tamanhos.find(t => t.nome === tamanhoNome)?.id ?? '' : ''
    const cor = corNome     ? cores.find(c => c.nome === corNome)?.id ?? ''     : ''

    const medidasExist: FormMedida[] = Object.entries(v.atributos_json)
      .filter(([k]) => !ATRIBS_VAR.includes(k))
      .map(([nome, valor]) => ({ nome, valor }))

    setForm({
      tamanho_id:       tam,
      cor_id:           cor,
      estoque_atual:    String(v.estoque_atual),
      estoque_minimo:   String(v.estoque_minimo),
      preco_especifico: v.preco_especifico ? String(Number(v.preco_especifico)) : '',
      medidas:          medidasExist,
    })
    setEditandoId(v.id)
    setErroForm('')
    setFormAberto(true)
  }

  function fecharForm() {
    setFormAberto(false)
    setEditandoId(null)
    setForm(FORM_VAZIO)
  }

  function addMedidaForm() {
    setForm(f => ({ ...f, medidas: [...f.medidas, { nome: '', valor: '' }] }))
  }

  function updateMedidaForm(i: number, campo: 'nome' | 'valor', valor: string) {
    setForm(f => ({
      ...f,
      medidas: f.medidas.map((m, idx) => idx === i ? { ...m, [campo]: valor } : m)
    }))
  }

  function removeMedidaForm(i: number) {
    setForm(f => ({ ...f, medidas: f.medidas.filter((_, idx) => idx !== i) }))
  }

  // Medidas disponíveis que ainda não foram adicionadas no form atual
  const medidasDisponiveis = medidas.filter(
    m => !form.medidas.some(fm => fm.nome === m.nome)
  )

  async function handleSalvarVariacao() {
    setErroForm('')

    if (produto?.controle_estoque && !editandoId && !form.estoque_atual) {
      setErroForm('Informe a quantidade em estoque.')
      return
    }

    setSalvando(true)
    try {
      const tamanhoNome = form.tamanho_id ? tamanhos.find(t => t.id === form.tamanho_id)?.nome : undefined
      const corNome     = form.cor_id     ? cores.find(c => c.id === form.cor_id)?.nome     : undefined

      const atributos_json: Record<string, string> = {}
      if (tamanhoNome) atributos_json['Tamanho'] = tamanhoNome
      if (corNome)     atributos_json['Cor']     = corNome
      form.medidas.filter(m => m.nome && m.valor).forEach(m => { atributos_json[m.nome] = m.valor })

      const payload = {
        atributos_json,
        estoque_atual:    form.estoque_atual    ? parseInt(form.estoque_atual)              : 0,
        estoque_minimo:   form.estoque_minimo   ? parseInt(form.estoque_minimo)             : 0,
        preco_especifico: form.preco_especifico ? parseFloat(form.preco_especifico.replace(',', '.')) : null,
      }

      if (editandoId) {
        await produtosApi.updateVersao(id, editandoId, payload as any)
      } else {
        await produtosApi.createVersao(id, payload as any)
      }

      // Recarrega produto
      const atualizado = await produtosApi.get(id)
      setProduto(atualizado)
      fecharForm()
    } catch (err: any) {
      setErroForm(err?.response?.data?.error ?? 'Erro ao salvar variação.')
    } finally {
      setSalvando(false)
    }
  }

  async function handleDeleteVersao(versaoId: string) {
    if (!confirm('Remover esta variação?')) return
    await produtosApi.deleteVersao(id, versaoId)
    setProduto(prev => prev ? {
      ...prev,
      versoes: prev.versoes!.filter(v => v.id !== versaoId)
    } : prev)
  }

  async function handleDeleteProduto() {
    if (!confirm('Remover este produto?')) return
    await produtosApi.remove(id)
    router.push('/painel/produtos')
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

  return (
    <>
      <TopBar title={produto.nome} />
      <main className="flex-1 overflow-y-auto p-4 md:p-6 pb-10">
        <div className="max-w-lg flex flex-col gap-4">

          {/* Info do produto */}
          <section className="bg-deep-ocean border border-ocean-depth rounded-2xl p-5">
            <div className="flex justify-between items-start mb-2">
              <div className="flex-1 min-w-0">
                <h2 className="text-sea-foam font-bold text-lg truncate">{produto.nome}</h2>
                <p className="text-steel text-sm">
                  {(produto as any).tipo?.nome || ''}
                  {produto.marca ? ` · ${produto.marca}` : ''}
                </p>
              </div>
              <p className="text-electric-cyan font-bold text-lg ml-3 shrink-0">
                R$ {Number(produto.preco_base).toFixed(2)}
              </p>
            </div>
            {produto.descricao && <p className="text-steel text-sm mt-1">{produto.descricao}</p>}
            {(produto as any).composicao && (
              <p className="text-steel text-xs mt-1">Composição: {(produto as any).composicao}</p>
            )}
            <div className="flex gap-3 mt-3">
              <button onClick={() => router.push(`/painel/produtos/${id}/editar`)}
                className="text-xs text-electric-cyan/70 hover:text-electric-cyan">
                Editar produto
              </button>
              <button onClick={handleDeleteProduto} className="text-xs text-red-400/60 hover:text-red-400">
                Remover
              </button>
            </div>
          </section>

          {/* Variações */}
          <section className="bg-deep-ocean border border-ocean-depth rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sea-foam font-semibold text-xs uppercase tracking-wider">
                Variações ({produto.versoes?.length ?? 0})
              </h3>
              {!formAberto && (
                <button onClick={abrirNovaVariacao}
                  className="min-h-[40px] px-4 bg-electric-cyan text-midnight rounded-xl text-sm font-semibold">
                  + Adicionar
                </button>
              )}
            </div>

            {/* Formulário inline */}
            {formAberto && (
              <div className="bg-midnight rounded-2xl p-4 mb-4 flex flex-col gap-4">
                <p className="text-sea-foam font-medium text-sm">
                  {editandoId ? 'Editar variação' : 'Nova variação'}
                </p>

                {/* Tamanho */}
                <div className="flex flex-col gap-2">
                  <label className="text-xs text-steel uppercase tracking-wider">Tamanho</label>
                  <div className="flex flex-wrap gap-2">
                    {tamanhos.map(t => (
                      <button key={t.id} type="button"
                        onClick={() => setForm(f => ({ ...f, tamanho_id: f.tamanho_id === t.id ? '' : t.id }))}
                        className={`min-h-[40px] min-w-[48px] px-3 rounded-xl text-sm font-medium border transition-colors ${
                          form.tamanho_id === t.id
                            ? 'bg-electric-cyan text-midnight border-electric-cyan'
                            : 'border-ocean-depth text-steel hover:text-sea-foam'
                        }`}>
                        {t.nome}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Cor */}
                <div className="flex flex-col gap-2">
                  <label className="text-xs text-steel uppercase tracking-wider">Cor</label>
                  <div className="flex flex-wrap gap-2">
                    {cores.map(c => (
                      <button key={c.id} type="button"
                        onClick={() => setForm(f => ({ ...f, cor_id: f.cor_id === c.id ? '' : c.id }))}
                        className={`min-h-[40px] px-3 rounded-xl text-sm font-medium border transition-colors flex items-center gap-2 ${
                          form.cor_id === c.id
                            ? 'bg-electric-cyan text-midnight border-electric-cyan'
                            : 'border-ocean-depth text-steel hover:text-sea-foam'
                        }`}>
                        {c.hex_cor && (
                          <span className="w-3 h-3 rounded-full border border-white/20 shrink-0"
                            style={{ background: c.hex_cor }} />
                        )}
                        {c.nome}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Estoque e Preço */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs text-steel uppercase tracking-wider">
                      Qtd {produto.controle_estoque ? '*' : ''}
                    </label>
                    <input type="number" min="0" value={form.estoque_atual}
                      onChange={e => setForm(f => ({ ...f, estoque_atual: e.target.value }))}
                      placeholder="0"
                      className="min-h-[44px] bg-deep-ocean border border-ocean-depth rounded-xl px-3 text-sm text-sea-foam text-center outline-none focus:border-electric-cyan" />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs text-steel uppercase tracking-wider">Qtd mín.</label>
                    <input type="number" min="0" value={form.estoque_minimo}
                      onChange={e => setForm(f => ({ ...f, estoque_minimo: e.target.value }))}
                      placeholder="0"
                      className="min-h-[44px] bg-deep-ocean border border-ocean-depth rounded-xl px-3 text-sm text-sea-foam text-center outline-none focus:border-electric-cyan" />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs text-steel uppercase tracking-wider">Preço</label>
                    <input type="text" inputMode="decimal" value={form.preco_especifico}
                      onChange={e => setForm(f => ({ ...f, preco_especifico: e.target.value }))}
                      placeholder="Base"
                      className="min-h-[44px] bg-deep-ocean border border-ocean-depth rounded-xl px-3 text-sm text-sea-foam text-center outline-none focus:border-electric-cyan" />
                  </div>
                </div>

                {/* Medidas */}
                <div className="flex flex-col gap-2">
                  <label className="text-xs text-steel uppercase tracking-wider">Medidas</label>

                  {form.medidas.map((m, i) => (
                    <div key={i} className="flex gap-2 items-center">
                      <select value={m.nome} onChange={e => updateMedidaForm(i, 'nome', e.target.value)}
                        className="flex-1 min-h-[44px] bg-deep-ocean border border-ocean-depth rounded-xl px-3 text-sm text-sea-foam outline-none">
                        <option value="">Selecione...</option>
                        {medidas.filter(med => med.nome === m.nome || !form.medidas.some((fm, fi) => fi !== i && fm.nome === med.nome))
                          .map(med => <option key={med.id} value={med.nome}>{med.nome}</option>)}
                      </select>
                      <input type="text" value={m.valor} onChange={e => updateMedidaForm(i, 'valor', e.target.value)}
                        placeholder="Ex: 96cm"
                        className="w-24 min-h-[44px] bg-deep-ocean border border-ocean-depth rounded-xl px-3 text-sm text-sea-foam text-center outline-none focus:border-electric-cyan" />
                      <button onClick={() => removeMedidaForm(i)} className="text-steel hover:text-red-400 text-xl px-1 min-h-[44px]">×</button>
                    </div>
                  ))}

                  {medidasDisponiveis.length > 0 && (
                    <button type="button" onClick={addMedidaForm}
                      className="text-xs text-electric-cyan/70 hover:text-electric-cyan self-start min-h-[36px]">
                      + Adicionar medida
                    </button>
                  )}
                </div>

                {erroForm && <p className="text-red-400 text-xs text-center">{erroForm}</p>}

                <div className="flex gap-3 pt-1">
                  <button onClick={fecharForm}
                    className="flex-1 min-h-[48px] border border-ocean-depth text-steel rounded-xl text-sm">
                    Cancelar
                  </button>
                  <button onClick={handleSalvarVariacao} disabled={salvando}
                    className="flex-1 min-h-[48px] bg-electric-cyan text-midnight rounded-xl text-sm font-semibold disabled:opacity-40">
                    {salvando ? 'Salvando...' : (editandoId ? 'Salvar' : 'Adicionar')}
                  </button>
                </div>
              </div>
            )}

            {/* Lista de variações */}
            <div className="flex flex-col gap-2">
              {produto.versoes?.map(v => {
                const varAtribs = Object.entries(v.atributos_json).filter(([k]) => ATRIBS_VAR.includes(k))
                const medAtribs = Object.entries(v.atributos_json).filter(([k]) => !ATRIBS_VAR.includes(k))
                const label = varAtribs.length
                  ? varAtribs.map(([, val]) => val).join(' / ')
                  : 'Versão única'

                const corNome = v.atributos_json['Cor']
                const corItem = corNome ? cores.find(c => c.nome === corNome) : null

                return (
                  <div key={v.id} className="bg-midnight rounded-2xl p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        {/* Tags de variação */}
                        <div className="flex flex-wrap gap-2 mb-2">
                          {varAtribs.map(([k, val]) => (
                            <span key={k} className="flex items-center gap-1.5 bg-ocean-depth px-3 py-1 rounded-lg text-xs">
                              {k === 'Cor' && corItem?.hex_cor && (
                                <span className="w-3 h-3 rounded-full" style={{ background: corItem.hex_cor }} />
                              )}
                              <span className="text-steel">{k}:</span>
                              <span className="text-sea-foam font-medium">{val}</span>
                            </span>
                          ))}
                          {varAtribs.length === 0 && (
                            <span className="text-steel text-xs">Versão única</span>
                          )}
                        </div>

                        {/* Medidas */}
                        {medAtribs.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mb-2">
                            {medAtribs.map(([k, val]) => (
                              <span key={k} className="text-xs text-steel">
                                {k}: <span className="text-sea-foam">{val}</span>
                                {medAtribs.indexOf(medAtribs.find(m => m[0] === k)!) < medAtribs.length - 1 ? ' · ' : ''}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Estoque e preço */}
                        <div className="flex gap-3 text-xs">
                          {produto.controle_estoque && (
                            <span className={v.estoque_atual <= v.estoque_minimo ? 'text-red-400' : 'text-steel'}>
                              Estoque: {v.estoque_atual} un.
                            </span>
                          )}
                          {v.preco_especifico && (
                            <span className="text-electric-cyan">
                              R$ {Number(v.preco_especifico).toFixed(2)}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Ações */}
                      <div className="flex gap-1 shrink-0">
                        <button onClick={() => abrirEdicao(v)}
                          className="min-h-[40px] min-w-[40px] text-steel hover:text-electric-cyan text-xs px-2 rounded-lg hover:bg-ocean-depth transition-colors">
                          ✏️
                        </button>
                        <button onClick={() => handleDeleteVersao(v.id)}
                          className="min-h-[40px] min-w-[40px] text-steel hover:text-red-400 text-xs px-2 rounded-lg hover:bg-ocean-depth transition-colors">
                          🗑️
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}

              {(!produto.versoes || produto.versoes.length === 0) && !formAberto && (
                <div className="flex flex-col items-center py-8 gap-2">
                  <p className="text-steel text-sm">Nenhuma variação ainda</p>
                  <p className="text-steel text-xs">Toque em "+ Adicionar" para começar</p>
                </div>
              )}
            </div>
          </section>

        </div>
      </main>
    </>
  )
}
