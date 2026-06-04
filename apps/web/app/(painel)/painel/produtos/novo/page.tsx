'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { TopBar } from '@/components/layout/TopBar'
import { Input } from '@/components/ui/Input'
import { produtosApi, type Produto, type Versao } from '@/lib/api/produtos'
import { catalogosApi, type ItemCatalogo } from '@/lib/api/catalogos'

type FormMedida  = { nome: string; valor: string }
type EditandoForm = null | 'novo' | string

interface VersaoForm {
  tamanho_id: string; cor_id: string
  estoque_atual: string; estoque_minimo: string; preco_especifico: string
  medidas: FormMedida[]
}

const FORM_VAZIO: VersaoForm = {
  tamanho_id: '', cor_id: '', estoque_atual: '', estoque_minimo: '', preco_especifico: '', medidas: []
}

const ATRIBS_VAR = ['Tamanho', 'Cor']

export default function NovoProdutoPage() {
  const router = useRouter()

  // Estado do produto (null = ainda não foi salvo)
  const [produtoId,       setProdutoId]       = useState<string | null>(null)
  const [produto,         setProduto]         = useState<Produto | null>(null)
  const [salvandoProduto, setSalvandoProduto] = useState(false)
  const [erroProduto,     setErroProduto]     = useState('')

  // Campos do produto
  const [nome,            setNome]            = useState('')
  const [tipoId,          setTipoId]          = useState('')
  const [marca,           setMarca]           = useState('')
  const [composicao,      setComposicao]      = useState('')
  const [descricao,       setDescricao]       = useState('')
  const [preco,           setPreco]           = useState('')
  const [controleEstoque, setControleEstoque] = useState(true)

  // Catálogos
  const [tipos,       setTipos]       = useState<ItemCatalogo[]>([])
  const [tamanhos,    setTamanhos]    = useState<ItemCatalogo[]>([])
  const [cores,       setCores]       = useState<ItemCatalogo[]>([])
  const [medidas,     setMedidas]     = useState<ItemCatalogo[]>([])
  const [composicoes, setComposicoes] = useState<ItemCatalogo[]>([])

  // Formulário de variação
  const [editandoForm, setEditandoForm] = useState<EditandoForm>(null)
  const [form,         setForm]         = useState<VersaoForm>(FORM_VAZIO)
  const [salvandoVar,  setSalvandoVar]  = useState(false)
  const [erroForm,     setErroForm]     = useState('')

  useEffect(() => {
    Promise.all([
      catalogosApi.list('tipos_produto'),
      catalogosApi.list('tamanhos'),
      catalogosApi.list('cores'),
      catalogosApi.list('medidas'),
      catalogosApi.list('composicoes'),
    ]).then(([tp, tam, c, med, comp]) => {
      setTipos(tp); setTamanhos(tam); setCores(c); setMedidas(med); setComposicoes(comp)
    })
  }, [])

  // Salva o produto e retorna o ID — usado tanto pelo botão quanto pelo + Adicionar
  async function salvarProduto(): Promise<string | null> {
    setErroProduto('')
    if (!nome.trim()) { setErroProduto('Informe o nome do produto.'); return null }
    if (!preco)       { setErroProduto('Informe o preço base.'); return null }

    setSalvandoProduto(true)
    try {
      if (produtoId) {
        // Já existe — só atualiza
        await produtosApi.update(produtoId, {
          nome, tipo_id: tipoId || null, marca: marca || undefined,
          composicao: composicao || undefined, descricao: descricao || undefined,
          preco_base: parseFloat(preco.replace(',', '.')) as any,
          controle_estoque: controleEstoque,
        })
        const p = await produtosApi.get(produtoId)
        setProduto(p)
        return produtoId
      } else {
        // Cria novo e atualiza URL sem mudar de tela
        const p = await produtosApi.create({
          nome, tipo_id: tipoId || undefined, marca: marca || undefined,
          composicao: composicao || undefined, descricao: descricao || undefined,
          preco_base: parseFloat(preco.replace(',', '.')),
          controle_estoque: controleEstoque,
        })
        setProdutoId(p!.id)
        setProduto(p!)
        router.replace(`/painel/produtos/${p!.id}`)  // atualiza URL sem navegar
        return p!.id
      }
    } catch (err: any) {
      setErroProduto(err?.response?.data?.error ?? 'Erro ao salvar produto.')
      return null
    } finally { setSalvandoProduto(false) }
  }

  // "+ Adicionar variação" — salva o produto primeiro se necessário
  async function handleAbrirNovaVariacao() {
    let pid = produtoId
    if (!pid) {
      pid = await salvarProduto()
      if (!pid) return   // validação falhou
    }
    setForm(FORM_VAZIO); setErroForm('')
    setEditandoForm('novo')
  }

  function fecharForm() { setEditandoForm(null); setForm(FORM_VAZIO) }

  async function handleSalvarVariacao() {
    if (!produtoId) return
    setErroForm('')
    if (controleEstoque && editandoForm === 'novo' && !form.estoque_atual) {
      setErroForm('Informe a quantidade em estoque.'); return
    }
    setSalvandoVar(true)
    try {
      const tamanhoNome = form.tamanho_id ? tamanhos.find(t => t.id === form.tamanho_id)?.nome : undefined
      const corNome     = form.cor_id     ? cores.find(c => c.id === form.cor_id)?.nome         : undefined
      const atributos_json: Record<string, string> = {}
      if (tamanhoNome) atributos_json['Tamanho'] = tamanhoNome
      if (corNome)     atributos_json['Cor']     = corNome
      form.medidas.filter(m => m.nome && m.valor).forEach(m => { atributos_json[m.nome] = m.valor })

      const payload = {
        atributos_json,
        estoque_atual:    form.estoque_atual    ? parseInt(form.estoque_atual)                    : 0,
        estoque_minimo:   form.estoque_minimo   ? parseInt(form.estoque_minimo)                   : 0,
        preco_especifico: form.preco_especifico ? parseFloat(form.preco_especifico.replace(',', '.')) : null,
      }

      if (editandoForm !== 'novo') {
        await produtosApi.updateVersao(produtoId, editandoForm!, payload as any)
      } else {
        await produtosApi.createVersao(produtoId, payload as any)
      }
      setProduto(await produtosApi.get(produtoId))
      fecharForm()
    } catch (err: any) {
      setErroForm(err?.response?.data?.error ?? 'Erro ao salvar variação.')
    } finally { setSalvandoVar(false) }
  }

  async function handleDeleteVersao(versaoId: string) {
    if (!produtoId || !confirm('Remover esta variação?')) return
    await produtosApi.deleteVersao(produtoId, versaoId)
    setProduto(prev => prev ? { ...prev, versoes: prev.versoes!.filter(v => v.id !== versaoId) } : prev)
  }

  const medidasDisponiveis = medidas.filter(m => !form.medidas.some(fm => fm.nome === m.nome))

  return (
    <>
      <TopBar title={nome || 'Novo Produto'} />
      <main className="flex-1 overflow-y-auto p-4 md:p-6 pb-10">
        <div className="max-w-lg flex flex-col gap-4">

          {/* ── Informações ── */}
          <section className="bg-deep-ocean border border-ocean-depth rounded-2xl p-5 flex flex-col gap-4">
            <h3 className="text-sea-foam font-semibold text-xs uppercase tracking-wider">Informações do Produto</h3>

            <Input label="Nome *" value={nome} onChange={e => setNome(e.target.value)} placeholder="Nome do produto" />

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-steel uppercase tracking-wider">Tipo</label>
                <select value={tipoId} onChange={e => setTipoId(e.target.value)}
                  className="min-h-[48px] bg-midnight border border-ocean-depth rounded-xl px-3 text-sm text-sea-foam outline-none focus:border-electric-cyan">
                  <option value="">Tipo...</option>
                  {tipos.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
                </select>
              </div>
              <Input label="Marca" value={marca} onChange={e => setMarca(e.target.value)} placeholder="Ex: Nike" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Input label="Preço base (R$) *" type="text" inputMode="decimal"
                value={preco} onChange={e => setPreco(e.target.value)} placeholder="0,00" />
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-steel uppercase tracking-wider">Composição</label>
                <select value={composicao} onChange={e => setComposicao(e.target.value)}
                  className="min-h-[48px] bg-midnight border border-ocean-depth rounded-xl px-3 text-sm text-sea-foam outline-none focus:border-electric-cyan">
                  <option value="">Composição...</option>
                  {composicoes.map(c => <option key={c.id} value={c.nome}>{c.nome}</option>)}
                </select>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-steel uppercase tracking-wider">Descrição</label>
              <textarea value={descricao} onChange={e => setDescricao(e.target.value)}
                placeholder="Detalhes do produto..." rows={2}
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

            {erroProduto && <p className="text-red-400 text-xs text-center">{erroProduto}</p>}

            <div className="flex gap-3">
              <button onClick={() => router.push('/painel/produtos')}
                className="flex-1 min-h-[48px] border border-ocean-depth text-steel rounded-xl text-sm">
                Cancelar
              </button>
              <button onClick={salvarProduto} disabled={salvandoProduto}
                className="flex-1 min-h-[48px] bg-electric-cyan text-midnight rounded-xl text-sm font-semibold disabled:opacity-40">
                {salvandoProduto ? 'Salvando...' : (produtoId ? 'Salvar Alterações' : 'Salvar Produto')}
              </button>
            </div>
          </section>

          {/* ── Variações ── */}
          <section className="bg-deep-ocean border border-ocean-depth rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sea-foam font-semibold text-xs uppercase tracking-wider">
                Variações ({produto?.versoes?.length ?? 0})
              </h3>
              {editandoForm === null && (
                <button onClick={handleAbrirNovaVariacao}
                  className="min-h-[40px] px-4 bg-electric-cyan text-midnight rounded-xl text-sm font-semibold">
                  + Adicionar
                </button>
              )}
            </div>

            {!produtoId && editandoForm === null && (
              <p className="text-steel text-xs text-center py-4">
                Preencha as informações acima e salve para adicionar variações.
              </p>
            )}

            {/* Formulário inline */}
            {editandoForm !== null && (
              <div className="bg-midnight rounded-2xl p-4 mb-4 flex flex-col gap-4">
                <p className="text-sea-foam font-medium text-sm">
                  {editandoForm === 'novo' ? 'Nova variação' : 'Editar variação'}
                </p>

                <div className="flex flex-col gap-2">
                  <label className="text-xs text-steel uppercase tracking-wider">Tamanho</label>
                  <div className="flex flex-wrap gap-2">
                    {tamanhos.map(t => (
                      <button key={t.id} type="button"
                        onClick={() => setForm(f => ({ ...f, tamanho_id: f.tamanho_id === t.id ? '' : t.id }))}
                        className={`min-h-[40px] min-w-[48px] px-3 rounded-xl text-sm font-medium border transition-colors ${
                          form.tamanho_id === t.id ? 'bg-electric-cyan text-midnight border-electric-cyan' : 'border-ocean-depth text-steel hover:text-sea-foam'
                        }`}>{t.nome}</button>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-xs text-steel uppercase tracking-wider">Cor</label>
                  <div className="flex flex-wrap gap-2">
                    {cores.map(c => (
                      <button key={c.id} type="button"
                        onClick={() => setForm(f => ({ ...f, cor_id: f.cor_id === c.id ? '' : c.id }))}
                        className={`min-h-[40px] px-3 rounded-xl text-sm font-medium border transition-colors flex items-center gap-2 ${
                          form.cor_id === c.id ? 'bg-electric-cyan text-midnight border-electric-cyan' : 'border-ocean-depth text-steel hover:text-sea-foam'
                        }`}>
                        {c.hex_cor && <span className="w-3 h-3 rounded-full border border-white/20 shrink-0" style={{ background: c.hex_cor }} />}
                        {c.nome}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: `Qtd${controleEstoque ? ' *' : ''}`, key: 'estoque_atual',    placeholder: '0'    },
                    { label: 'Qtd mín.',                           key: 'estoque_minimo',   placeholder: '0'    },
                    { label: 'Preço',                              key: 'preco_especifico', placeholder: 'Base' },
                  ].map(({ label, key, placeholder }) => (
                    <div key={key} className="flex flex-col gap-1.5">
                      <label className="text-xs text-steel uppercase tracking-wider">{label}</label>
                      <input type={key === 'preco_especifico' ? 'text' : 'number'}
                        inputMode={key === 'preco_especifico' ? 'decimal' : 'numeric'}
                        min="0" value={(form as any)[key]}
                        onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                        placeholder={placeholder}
                        className="min-h-[44px] bg-deep-ocean border border-ocean-depth rounded-xl px-3 text-sm text-sea-foam text-center outline-none focus:border-electric-cyan" />
                    </div>
                  ))}
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-xs text-steel uppercase tracking-wider">Medidas</label>
                  {form.medidas.map((m, i) => (
                    <div key={i} className="flex gap-2 items-center">
                      <select value={m.nome}
                        onChange={e => setForm(f => ({ ...f, medidas: f.medidas.map((x, xi) => xi === i ? { ...x, nome: e.target.value } : x) }))}
                        className="flex-1 min-h-[44px] bg-deep-ocean border border-ocean-depth rounded-xl px-3 text-sm text-sea-foam outline-none">
                        <option value="">Selecione...</option>
                        {medidas.filter(med => med.nome === m.nome || !form.medidas.some((fm, fi) => fi !== i && fm.nome === med.nome))
                          .map(med => <option key={med.id} value={med.nome}>{med.nome}</option>)}
                      </select>
                      <input type="text" value={m.valor} placeholder="Ex: 96cm"
                        onChange={e => setForm(f => ({ ...f, medidas: f.medidas.map((x, xi) => xi === i ? { ...x, valor: e.target.value } : x) }))}
                        className="w-24 min-h-[44px] bg-deep-ocean border border-ocean-depth rounded-xl px-3 text-sm text-sea-foam text-center outline-none focus:border-electric-cyan" />
                      <button onClick={() => setForm(f => ({ ...f, medidas: f.medidas.filter((_, xi) => xi !== i) }))}
                        className="min-h-[44px] min-w-[44px] text-steel hover:text-red-400 text-xl flex items-center justify-center">×</button>
                    </div>
                  ))}
                  {medidasDisponiveis.length > 0 && (
                    <button type="button"
                      onClick={() => setForm(f => ({ ...f, medidas: [...f.medidas, { nome: '', valor: '' }] }))}
                      className="text-xs text-electric-cyan/70 hover:text-electric-cyan self-start min-h-[36px]">
                      + Adicionar medida
                    </button>
                  )}
                </div>

                {erroForm && <p className="text-red-400 text-xs text-center">{erroForm}</p>}

                <div className="flex gap-3">
                  <button onClick={fecharForm}
                    className="flex-1 min-h-[48px] border border-ocean-depth text-steel rounded-xl text-sm">
                    Cancelar
                  </button>
                  <button onClick={handleSalvarVariacao} disabled={salvandoVar}
                    className="flex-1 min-h-[48px] bg-electric-cyan text-midnight rounded-xl text-sm font-semibold disabled:opacity-40">
                    {salvandoVar ? 'Salvando...' : 'Adicionar'}
                  </button>
                </div>
              </div>
            )}

            {/* Lista */}
            <div className="flex flex-col gap-2">
              {produto?.versoes?.map(v => {
                const varAtribs = Object.entries(v.atributos_json).filter(([k]) => ATRIBS_VAR.includes(k))
                const medAtribs = Object.entries(v.atributos_json).filter(([k]) => !ATRIBS_VAR.includes(k))
                const corItem   = v.atributos_json['Cor'] ? cores.find(c => c.nome === v.atributos_json['Cor']) : null
                return (
                  <div key={v.id} className="bg-midnight rounded-2xl p-4">
                    <div className="flex items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap gap-2 mb-1.5">
                          {varAtribs.map(([k, val]) => (
                            <span key={k} className="flex items-center gap-1.5 bg-ocean-depth px-3 py-1 rounded-lg text-xs">
                              {k === 'Cor' && corItem?.hex_cor && <span className="w-3 h-3 rounded-full" style={{ background: corItem.hex_cor }} />}
                              <span className="text-steel">{k}:</span>
                              <span className="text-sea-foam font-medium">{val}</span>
                            </span>
                          ))}
                          {varAtribs.length === 0 && <span className="text-steel text-xs">Versão única</span>}
                        </div>
                        {medAtribs.length > 0 && (
                          <p className="text-xs text-steel mb-1">{medAtribs.map(([k, val]) => `${k}: ${val}`).join(' · ')}</p>
                        )}
                        <div className="flex gap-3 text-xs">
                          {produto.controle_estoque && (
                            <span className={v.estoque_atual <= v.estoque_minimo ? 'text-red-400' : 'text-steel'}>{v.estoque_atual} un.</span>
                          )}
                          {v.preco_especifico && <span className="text-electric-cyan">R$ {Number(v.preco_especifico).toFixed(2)}</span>}
                        </div>
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <button onClick={() => { /* editar via form */ }}
                          className="min-h-[40px] min-w-[40px] text-steel hover:text-electric-cyan rounded-lg hover:bg-ocean-depth transition-colors flex items-center justify-center text-sm">✏️</button>
                        <button onClick={() => handleDeleteVersao(v.id)}
                          className="min-h-[40px] min-w-[40px] text-steel hover:text-red-400 rounded-lg hover:bg-ocean-depth transition-colors flex items-center justify-center text-sm">🗑️</button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </section>

        </div>
      </main>
    </>
  )
}
