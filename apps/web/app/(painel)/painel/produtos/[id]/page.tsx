'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { TopBar } from '@/components/layout/TopBar'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { ConfirmModal } from '@/components/ui/ConfirmModal'
import { produtosApi, type Produto, type Versao } from '@/lib/api/produtos'
import { catalogosApi, type ItemCatalogo } from '@/lib/api/catalogos'
import { ComposicaoForm, type ItemComposicao } from '@/components/painel/ComposicaoForm'

// ─── tipos internos ────────────────────────────────────────────────────────────

type FormMedida   = { nome: string; valor: string }
type EditandoForm = null | 'novo' | string

interface VersaoForm {
  tamanho_id: string; cor_id: string
  estoque_atual: string; estoque_minimo: string; preco_especifico: string
  medidas: FormMedida[]; codigo_barras: string
}

const FORM_VAZIO: VersaoForm = {
  tamanho_id: '', cor_id: '', estoque_atual: '', estoque_minimo: '', preco_especifico: '', medidas: [], codigo_barras: ''
}

const ATRIBS_VAR = ['Tamanho', 'Cor']
const GENEROS    = ['', 'Masculino', 'Feminino', 'Infantil', 'Bebê', 'Unissex']

// ─── glass helpers ─────────────────────────────────────────────────────────────

const CARD = {
  background: 'rgba(8,18,30,0.48)',
  backdropFilter: 'blur(8px)',
  border: '0.5px solid rgba(255,255,255,0.09)',
  borderRadius: '10px',
  padding: '16px',
}

const ROW_STYLE = {
  background: 'rgba(8,18,30,0.35)',
  border: '0.5px solid rgba(255,255,255,0.07)',
  borderRadius: '8px',
}

const INPUT_STYLE = {
  background: 'rgba(8,18,30,0.5)',
  border: '0.5px solid rgba(255,255,255,0.12)',
  borderRadius: '8px',
  padding: '9px 12px',
  fontSize: '13px',
  color: 'rgba(255,255,255,0.75)',
  width: '100%',
  outline: 'none',
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <label style={{ display: 'block', fontSize: '9px', textTransform: 'uppercase' as const, letterSpacing: '0.1em', color: 'rgba(255,255,255,0.35)', marginBottom: '4px' }}>
      {children}
    </label>
  )
}

function GlassInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      style={{ ...INPUT_STYLE, ...props.style }}
      className={props.className}
      onFocus={e => { e.currentTarget.style.borderColor = 'rgba(0,239,255,0.4)' }}
      onBlur={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)' }}
    />
  )
}

function GlassSelect(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      style={{ ...INPUT_STYLE, ...props.style }}
      onFocus={e => { e.currentTarget.style.borderColor = 'rgba(0,239,255,0.4)' }}
      onBlur={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)' }}
    />
  )
}

// ─── componente ────────────────────────────────────────────────────────────────

export default function ProdutoPage() {
  const { id }  = useParams<{ id: string }>()
  const router  = useRouter()

  const [produto,   setProduto]   = useState<Produto | null>(null)
  const [loading,   setLoading]   = useState(true)
  const [salvandoProduto, setSalvandoProduto] = useState(false)
  const [produtoSalvo,    setProdutoSalvo]    = useState(false)

  const [nome,            setNome]            = useState('')
  const [tipoId,          setTipoId]          = useState('')
  const [genero,          setGenero]          = useState('')
  const [marca,           setMarca]           = useState('')
  const [composicaoItens, setComposicaoItens] = useState<ItemComposicao[]>([])
  const [descricao,       setDescricao]       = useState('')
  const [preco,           setPreco]           = useState('')
  const [controleEstoque, setControleEstoque] = useState(true)

  const [tipos,    setTipos]    = useState<ItemCatalogo[]>([])
  const [tamanhos, setTamanhos] = useState<ItemCatalogo[]>([])
  const [cores,    setCores]    = useState<ItemCatalogo[]>([])
  const [medidas,  setMedidas]  = useState<ItemCatalogo[]>([])

  const [modal, setModal] = useState<{ open: boolean; title: string; message: string; confirmLabel: string; onConfirm: () => void }>({ open: false, title: '', message: '', confirmLabel: 'Confirmar', onConfirm: () => {} })
  const [editandoForm,   setEditandoForm]   = useState<EditandoForm>(null)
  const [form,           setForm]           = useState<VersaoForm>(FORM_VAZIO)
  const [salvandoVar,    setSalvandoVar]    = useState(false)
  const [erroForm,       setErroForm]       = useState('')
  const [searchTamanho,  setSearchTamanho]  = useState('')
  const [searchCor,      setSearchCor]      = useState('')

  // ─── carga inicial ──────────────────────────────────────────────────────────
  useEffect(() => {
    Promise.all([
      produtosApi.get(id),
      catalogosApi.list('tipos_produto'),
      catalogosApi.list('tamanhos'),
      catalogosApi.list('cores'),
      catalogosApi.list('medidas'),
    ]).then(([p, tp, tam, c, med]) => {
      setProduto(p)
      setTipos(tp); setTamanhos(tam); setCores(c); setMedidas(med)
      setNome(p.nome)
      setTipoId((p as any).tipo_id ?? '')
      setGenero((p as any).genero ?? '')
      setMarca(p.marca ?? '')
      setComposicaoItens((p as any).composicao_itens ?? [])
      setDescricao(p.descricao ?? '')
      setPreco(Number(p.preco_base).toString())
      setControleEstoque(p.controle_estoque)
      setProdutoSalvo(true)
    }).finally(() => setLoading(false))
  }, [id])

  // ─── salvar produto ─────────────────────────────────────────────────────────
  async function handleSalvarProduto() {
    if (!nome || !preco) return
    const totalComp = (composicaoItens ?? []).reduce((s, i) => s + i.percentual, 0)
    if (composicaoItens.length > 0 && totalComp !== 100) {
      alert(`A composição precisa totalizar 100% (atual: ${totalComp}%).`)
      return
    }
    setSalvandoProduto(true)
    try {
      await produtosApi.update(id, {
        nome,
        tipo_id:          tipoId || null,
        genero:           genero || null,
        marca:            marca || undefined,
        composicao_itens: composicaoItens as any,
        descricao:        descricao || undefined,
        preco_base:       parseFloat(preco.replace(',', '.')) as any,
        controle_estoque: controleEstoque,
      } as any)
      const atualizado = await produtosApi.get(id)
      setProduto(atualizado)
      setProdutoSalvo(true)
    } finally { setSalvandoProduto(false) }
  }

  // ─── variação: abrir form ───────────────────────────────────────────────────
  function abrirNovaVariacao() {
    setForm(FORM_VAZIO); setErroForm('')
    setEditandoForm('novo')
  }

  function abrirEdicao(v: Versao) {
    const tam = v.atributos_json['Tamanho']
      ? tamanhos.find(t => t.nome === v.atributos_json['Tamanho'])?.id ?? '' : ''
    const cor = v.atributos_json['Cor']
      ? cores.find(c => c.nome === v.atributos_json['Cor'])?.id ?? ''       : ''
    const med: FormMedida[] = Object.entries(v.atributos_json)
      .filter(([k]) => !ATRIBS_VAR.includes(k))
      .map(([nome, valor]) => ({ nome, valor }))
    setForm({
      tamanho_id: tam, cor_id: cor,
      estoque_atual: String(v.estoque_atual),
      estoque_minimo: String(v.estoque_minimo),
      preco_especifico: v.preco_especifico ? String(Number(v.preco_especifico)) : '',
      medidas: med,
      codigo_barras: (v as any).codigo_barras ?? '',
    })
    setErroForm('')
    setEditandoForm(v.id)
  }

  function fecharForm() { setEditandoForm(null); setForm(FORM_VAZIO); setSearchTamanho(''); setSearchCor('') }

  // ─── variação: salvar ───────────────────────────────────────────────────────
  async function handleSalvarVariacao() {
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
        estoque_atual:    form.estoque_atual    ? parseInt(form.estoque_atual)                        : 0,
        estoque_minimo:   form.estoque_minimo   ? parseInt(form.estoque_minimo)                       : 0,
        preco_especifico: form.preco_especifico ? parseFloat(form.preco_especifico.replace(',', '.')) : null,
        codigo_barras:    form.codigo_barras    || null,
      }

      if (editandoForm !== 'novo') {
        await produtosApi.updateVersao(id, editandoForm!, payload as any)
      } else {
        await produtosApi.createVersao(id, payload as any)
      }

      setProduto(await produtosApi.get(id))
      fecharForm()
    } catch (err: any) {
      setErroForm(err?.response?.data?.error ?? 'Erro ao salvar variação.')
    } finally { setSalvandoVar(false) }
  }

  async function handleDeleteVersao(versaoId: string) {
    setModal({
      open: true, title: 'Remover variação', message: 'Esta ação não pode ser desfeita.', confirmLabel: 'Remover',
      onConfirm: async () => {
        await produtosApi.deleteVersao(id, versaoId)
        setProduto(prev => prev ? { ...prev, versoes: (prev.versoes ?? []).filter(v => v.id !== versaoId) } : prev)
      },
    })
  }

  async function handleDeleteProduto() {
    await produtosApi.remove(id)
    router.push('/painel/produtos')
  }

  const medidasDisponiveis = medidas.filter(m => !form.medidas.some(fm => fm.nome === m.nome))

  // ─── loading ────────────────────────────────────────────────────────────────
  if (loading) return (
    <>
      <TopBar />
      <div className="flex justify-center py-16">
        <div className="w-8 h-8 border-2 border-electric-cyan border-t-transparent rounded-full animate-spin" />
      </div>
    </>
  )

  // ─── render ─────────────────────────────────────────────────────────────────
  return (
    <>
      <TopBar />
      <main className="flex-1 overflow-hidden flex flex-col">
        <div className="flex-1 overflow-y-auto p-4 md:p-5 pb-3">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 items-start">

          {/* ══ LEFT COLUMN ══════════════════════════════════════════════════ */}
          <div className="flex flex-col gap-3">

            {/* Info card */}
            <div style={CARD}>
              <p style={{ fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.3)', marginBottom: '14px' }}>
                Informações
              </p>

              {/* Nome */}
              <div className="flex flex-col mb-3">
                <Label>Nome *</Label>
                <GlassInput value={nome} onChange={e => setNome(e.target.value)} placeholder="Nome do produto" />
              </div>

              {/* Tipo + Gênero */}
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div className="flex flex-col">
                  <Label>Tipo</Label>
                  <GlassSelect value={tipoId} onChange={e => setTipoId(e.target.value)}>
                    <option value="">Tipo...</option>
                    {tipos.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
                  </GlassSelect>
                </div>
                <div className="flex flex-col">
                  <Label>Gênero</Label>
                  <GlassSelect value={genero} onChange={e => setGenero(e.target.value)}>
                    {GENEROS.map(g => <option key={g} value={g}>{g || 'Gênero...'}</option>)}
                  </GlassSelect>
                </div>
              </div>

              {/* Marca + Preço */}
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div className="flex flex-col">
                  <Label>Marca</Label>
                  <GlassInput value={marca} onChange={e => setMarca(e.target.value)} placeholder="Ex: Nike" />
                </div>
                <div className="flex flex-col">
                  <Label>Preço base (R$) *</Label>
                  <GlassInput
                    type="text" inputMode="decimal"
                    value={preco} onChange={e => setPreco(e.target.value)} placeholder="0,00"
                  />
                </div>
              </div>

              {/* Descrição */}
              <div className="flex flex-col mb-3">
                <Label>Descrição</Label>
                <textarea
                  value={descricao} onChange={e => setDescricao(e.target.value)}
                  placeholder="Detalhes do produto..." rows={2}
                  style={{ ...INPUT_STYLE, resize: 'none' }}
                  onFocus={e => (e.currentTarget.style.borderColor = 'rgba(0,239,255,0.4)')}
                  onBlur={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)')}
                />
              </div>

              {/* Composição */}
              <ComposicaoForm value={composicaoItens} onChange={setComposicaoItens} />
            </div>

            {/* Controle de estoque toggle */}
            <div style={{ ...ROW_STYLE, padding: '10px 12px' }} className="flex items-center justify-between">
              <div>
                <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)', fontWeight: 500 }}>Controle de estoque</p>
                <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', marginTop: '1px' }}>Desative para produtos sem controle de quantidade</p>
              </div>
              <button
                type="button"
                onClick={() => setControleEstoque(v => !v)}
                className="shrink-0 relative transition-colors"
                style={{ width: '40px', height: '22px', borderRadius: '9999px', border: 'none', background: controleEstoque ? 'rgba(0,212,212,0.7)' : 'rgba(255,255,255,0.1)' }}
              >
                <span
                  className="absolute top-[3px] w-[16px] h-[16px] bg-white rounded-full transition-all"
                  style={{ left: controleEstoque ? '21px' : '3px' }}
                />
              </button>
            </div>

          </div>

          {/* ══ RIGHT COLUMN ═════════════════════════════════════════════════ */}
          <div style={CARD} className="flex flex-col gap-3">

            {/* Variations header */}
            <div className="flex items-center justify-between">
              <p style={{ fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.3)' }}>
                Variações ({produto?.versoes?.length ?? 0})
              </p>
              {editandoForm === null && (
                <button
                  onClick={abrirNovaVariacao}
                  style={{ background: 'rgba(255,255,255,0.06)', border: '0.5px solid rgba(255,255,255,0.12)', borderRadius: '8px', padding: '5px 12px', fontSize: '12px', color: 'rgba(255,255,255,0.65)' }}
                >
                  + Adicionar
                </button>
              )}
            </div>

            {/* Existing variations */}
            <div className="flex flex-col gap-1.5">
              {produto?.versoes?.map(v => {
                const varAtribs = Object.entries(v.atributos_json).filter(([k]) => ATRIBS_VAR.includes(k))
                const medAtribs = Object.entries(v.atributos_json).filter(([k]) => !ATRIBS_VAR.includes(k))
                const corItem   = v.atributos_json['Cor'] ? cores.find(c => c.nome === v.atributos_json['Cor']) : null

                return (
                  <div key={v.id} style={{ ...ROW_STYLE, padding: '8px 10px' }} className="flex items-center gap-2">
                    {/* Chips */}
                    <div className="flex flex-wrap gap-1 flex-1 min-w-0">
                      {varAtribs.map(([k, val]) => (
                        <span key={k}
                          style={{
                            fontSize: '11px', padding: '2px 8px', borderRadius: '9999px',
                            background: k === 'Cor' ? 'rgba(168,85,247,0.15)' : 'rgba(0,239,255,0.1)',
                            color:      k === 'Cor' ? 'rgba(168,85,247,0.9)'  : 'rgba(0,239,255,0.8)',
                            border:     k === 'Cor' ? '0.5px solid rgba(168,85,247,0.3)' : '0.5px solid rgba(0,239,255,0.25)',
                          }}
                        >
                          {k === 'Cor' && corItem?.hex_cor && (
                            <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: corItem.hex_cor, marginRight: '4px', verticalAlign: 'middle' }} />
                          )}
                          {val}
                        </span>
                      ))}
                      {varAtribs.length === 0 && (
                        <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>Versão única</span>
                      )}
                      {medAtribs.map(([k, val]) => (
                        <span key={k} style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)' }}>{k}: {val}</span>
                      ))}
                    </div>

                    {/* Stock */}
                    {produto.controle_estoque && (
                      <span style={{
                        fontSize: '11px', flexShrink: 0,
                        color: v.estoque_atual <= v.estoque_minimo ? 'rgba(248,113,113,0.8)' : 'rgba(255,255,255,0.4)',
                      }}>
                        {v.estoque_atual} un.
                      </span>
                    )}
                    {v.preco_especifico && (
                      <span style={{ fontSize: '11px', color: 'rgba(0,239,255,0.7)', flexShrink: 0 }}>
                        R${Number(v.preco_especifico).toFixed(2)}
                      </span>
                    )}

                    {/* Edit + delete */}
                    <div className="flex gap-1 shrink-0">
                      {[
                        { action: () => abrirEdicao(v), icon: '✏️' },
                        { action: () => handleDeleteVersao(v.id), icon: '🗑️' },
                      ].map(({ action, icon }, i) => (
                        <button
                          key={i}
                          onClick={action}
                          className="flex items-center justify-center transition-colors"
                          style={{ width: '28px', height: '28px', borderRadius: '6px', background: 'rgba(255,255,255,0.05)', border: 'none', fontSize: '13px' }}
                        >
                          {icon}
                        </button>
                      ))}
                    </div>
                  </div>
                )
              })}

              {(!produto?.versoes || produto.versoes.length === 0) && editandoForm === null && (
                <div
                  className="flex flex-col items-center justify-center py-8"
                  style={{ border: '1px dashed rgba(255,255,255,0.12)', borderRadius: '8px' }}
                >
                  <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.25)' }}>Nenhuma variação</p>
                  <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.15)', marginTop: '4px' }}>Toque em "+ Adicionar" para começar</p>
                </div>
              )}
            </div>

            {/* Inline variation form */}
            {editandoForm !== null && (
              <div style={{ background: 'rgba(255,255,255,0.03)', border: '0.5px solid rgba(255,255,255,0.08)', borderRadius: '8px', padding: '14px' }} className="flex flex-col gap-4">
                <p style={{ fontSize: '12px', fontWeight: 500, color: 'rgba(255,255,255,0.7)' }}>
                  {editandoForm === 'novo' ? 'Nova variação' : 'Editar variação'}
                </p>

                {/* Tamanho */}
                <div className="flex flex-col gap-2">
                  <Label>Tamanho</Label>
                  <input
                    value={searchTamanho}
                    onChange={e => setSearchTamanho(e.target.value)}
                    placeholder="Buscar tamanho..."
                    style={{ background: 'rgba(8,18,30,0.5)', border: '0.5px solid rgba(255,255,255,0.12)', borderRadius: '20px', padding: '5px 12px', fontSize: '12px', color: 'rgba(255,255,255,0.6)', outline: 'none', width: '100%' }}
                    onFocus={e => (e.currentTarget.style.borderColor = 'rgba(0,239,255,0.4)')}
                    onBlur={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)')}
                  />
                  <div className="flex flex-wrap gap-1.5">
                    {tamanhos.filter(t => t.nome.toLowerCase().includes(searchTamanho.toLowerCase())).map(t => (
                      <button key={t.id} type="button"
                        onClick={() => setForm(f => ({ ...f, tamanho_id: f.tamanho_id === t.id ? '' : t.id }))}
                        className="transition-all"
                        style={{
                          minHeight: '32px', padding: '3px 12px', borderRadius: '9999px', fontSize: '12px', fontWeight: 500,
                          background: form.tamanho_id === t.id ? 'rgba(0,239,255,0.15)' : 'rgba(255,255,255,0.04)',
                          border:     form.tamanho_id === t.id ? '0.5px solid rgba(0,239,255,0.5)' : '0.5px solid rgba(255,255,255,0.1)',
                          color:      form.tamanho_id === t.id ? '#0ef' : 'rgba(255,255,255,0.5)',
                        }}
                      >
                        {t.nome}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Cor */}
                <div className="flex flex-col gap-2">
                  <Label>Cor</Label>
                  <input
                    value={searchCor}
                    onChange={e => setSearchCor(e.target.value)}
                    placeholder="Buscar cor..."
                    style={{ background: 'rgba(8,18,30,0.5)', border: '0.5px solid rgba(255,255,255,0.12)', borderRadius: '20px', padding: '5px 12px', fontSize: '12px', color: 'rgba(255,255,255,0.6)', outline: 'none', width: '100%' }}
                    onFocus={e => (e.currentTarget.style.borderColor = 'rgba(0,239,255,0.4)')}
                    onBlur={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)')}
                  />
                  <div className="flex flex-wrap gap-1.5">
                    {cores.filter(c => c.nome.toLowerCase().includes(searchCor.toLowerCase())).map(c => (
                      <button key={c.id} type="button"
                        onClick={() => setForm(f => ({ ...f, cor_id: f.cor_id === c.id ? '' : c.id }))}
                        className="flex items-center gap-1.5 transition-all"
                        style={{
                          minHeight: '32px', padding: '3px 12px', borderRadius: '9999px', fontSize: '12px', fontWeight: 500,
                          background: form.cor_id === c.id ? 'rgba(168,85,247,0.15)' : 'rgba(255,255,255,0.04)',
                          border:     form.cor_id === c.id ? '0.5px solid rgba(168,85,247,0.5)' : '0.5px solid rgba(255,255,255,0.1)',
                          color:      form.cor_id === c.id ? 'rgba(168,85,247,0.9)' : 'rgba(255,255,255,0.5)',
                        }}
                      >
                        {c.hex_cor && <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: c.hex_cor, border: '0.5px solid rgba(255,255,255,0.2)', flexShrink: 0 }} />}
                        {c.nome}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Estoque + Preço */}
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: `Qtd${controleEstoque ? ' *' : ''}`, key: 'estoque_atual',    placeholder: '0'    },
                    { label: 'Qtd mín.',                           key: 'estoque_minimo',   placeholder: '0'    },
                    { label: 'Preço',                              key: 'preco_especifico', placeholder: 'Base' },
                  ].map(({ label, key, placeholder }) => (
                    <div key={key} className="flex flex-col gap-1">
                      <Label>{label}</Label>
                      <GlassInput
                        type={key === 'preco_especifico' ? 'text' : 'number'}
                        inputMode={key === 'preco_especifico' ? 'decimal' : 'numeric'}
                        min="0"
                        value={(form as any)[key]}
                        onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                        placeholder={placeholder}
                        style={{ ...INPUT_STYLE, textAlign: 'center' }}
                      />
                    </div>
                  ))}
                </div>

                {/* Medidas */}
                {(form.medidas.length > 0 || medidasDisponiveis.length > 0) && (
                  <div className="flex flex-col gap-2">
                    <Label>Medidas</Label>
                    {form.medidas.map((m, i) => (
                      <div key={i} className="flex gap-2 items-center">
                        <GlassSelect
                          value={m.nome}
                          onChange={e => setForm(f => ({ ...f, medidas: f.medidas.map((x, xi) => xi === i ? { ...x, nome: e.target.value } : x) }))}
                          style={{ ...INPUT_STYLE, flex: 1 }}
                        >
                          <option value="">Selecione...</option>
                          {medidas.filter(med => med.nome === m.nome || !form.medidas.some((fm, fi) => fi !== i && fm.nome === med.nome))
                            .map(med => <option key={med.id} value={med.nome}>{med.nome}</option>)}
                        </GlassSelect>
                        <GlassInput
                          type="text" value={m.valor} placeholder="Ex: 96cm"
                          onChange={e => setForm(f => ({ ...f, medidas: f.medidas.map((x, xi) => xi === i ? { ...x, valor: e.target.value } : x) }))}
                          style={{ ...INPUT_STYLE, width: '88px', textAlign: 'center' }}
                        />
                        <button
                          onClick={() => setForm(f => ({ ...f, medidas: f.medidas.filter((_, xi) => xi !== i) }))}
                          style={{ color: 'rgba(255,255,255,0.3)', fontSize: '18px', minWidth: '32px', minHeight: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        >×</button>
                      </div>
                    ))}
                    {medidasDisponiveis.length > 0 && (
                      <button type="button"
                        onClick={() => setForm(f => ({ ...f, medidas: [...f.medidas, { nome: '', valor: '' }] }))}
                        style={{ fontSize: '11px', color: 'rgba(0,239,255,0.6)', textAlign: 'left' }}>
                        + Adicionar medida
                      </button>
                    )}
                  </div>
                )}

                {/* Código de barras */}
                <div className="flex flex-col gap-1">
                  <label style={{ display: 'block', fontSize: '9px', textTransform: 'uppercase' as const, letterSpacing: '0.1em', color: 'rgba(255,255,255,0.35)', marginBottom: '4px' }}>Código de barras</label>
                  <input
                    type="text"
                    value={form.codigo_barras}
                    onChange={e => setForm(f => ({ ...f, codigo_barras: e.target.value }))}
                    placeholder="EAN-13, QR, etc."
                    style={{ background: 'rgba(8,18,30,0.5)', border: '0.5px solid rgba(255,255,255,0.12)', borderRadius: '8px', padding: '9px 12px', fontSize: '13px', color: 'rgba(255,255,255,0.75)', width: '100%', outline: 'none' }}
                    onFocus={e => (e.currentTarget.style.borderColor = 'rgba(0,239,255,0.4)')}
                    onBlur={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)')}
                  />
                </div>

                {erroForm && <p style={{ fontSize: '11px', color: 'rgba(248,113,113,0.8)', textAlign: 'center' }}>{erroForm}</p>}

                <div className="flex gap-2">
                  <button
                    onClick={fecharForm}
                    className="flex-1 min-h-[40px]"
                    style={{ background: 'rgba(255,255,255,0.05)', border: '0.5px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: 'rgba(255,255,255,0.45)', fontSize: '13px' }}
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleSalvarVariacao}
                    disabled={salvandoVar}
                    className="flex-[2] min-h-[40px] disabled:opacity-40"
                    style={{ background: 'rgba(0,239,255,0.85)', borderRadius: '8px', color: '#0a0a1a', fontSize: '13px', fontWeight: 600, border: 'none' }}
                  >
                    {salvandoVar ? 'Salvando...' : (editandoForm === 'novo' ? 'Adicionar' : 'Salvar')}
                  </button>
                </div>
              </div>
            )}
          </div>

        </div>
        </div>

        {/* ── Fixed footer ──────────────────────────────────────────────── */}
        <div
          className="shrink-0 flex gap-3 px-4 py-3"
          style={{ background: 'rgba(8,18,30,0.65)', backdropFilter: 'blur(8px)', borderTop: '0.5px solid rgba(255,255,255,0.07)' }}
        >
          <button
            onClick={() => setModal({ open: true, title: 'Remover produto', message: 'O produto e todas as suas variações serão excluídos permanentemente.', confirmLabel: 'Remover', onConfirm: handleDeleteProduto })}
            className="flex-1 min-h-[44px]"
            style={{ background: 'rgba(240,100,100,0.08)', border: '0.5px solid rgba(240,100,100,0.25)', borderRadius: '8px', color: 'rgba(240,100,100,0.7)', fontSize: '13px' }}
          >
            Remover produto
          </button>
          <button
            onClick={handleSalvarProduto}
            disabled={salvandoProduto || !nome || !preco}
            className="flex-[2] min-h-[44px] disabled:opacity-40 transition-opacity"
            style={{ background: 'rgba(0,239,255,0.85)', borderRadius: '8px', color: '#0a0a1a', fontSize: '13px', fontWeight: 600, border: 'none' }}
          >
            {salvandoProduto ? 'Salvando...' : 'Salvar Alterações'}
          </button>
        </div>
      </main>
      <ConfirmModal
        isOpen={modal.open}
        title={modal.title}
        message={modal.message}
        confirmLabel={modal.confirmLabel}
        confirmStyle="danger"
        onConfirm={() => { setModal(m => ({ ...m, open: false })); modal.onConfirm() }}
        onCancel={() => setModal(m => ({ ...m, open: false }))}
      />
    </>
  )
}
