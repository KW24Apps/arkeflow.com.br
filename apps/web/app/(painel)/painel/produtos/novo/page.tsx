'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { TopBar } from '@/components/layout/TopBar'
import { produtosApi, type Produto } from '@/lib/api/produtos'
import { catalogosApi, type ItemCatalogo } from '@/lib/api/catalogos'
import { ComposicaoForm, type ItemComposicao } from '@/components/painel/ComposicaoForm'
import { formatCurrency, parseCurrency, initCurrency } from '@/lib/utils/currency'

const GENEROS = ['', 'Masculino', 'Feminino', 'Infantil', 'Bebê', 'Unissex']

const CARD = {
  background: 'rgba(8,18,30,0.48)',
  backdropFilter: 'blur(8px)',
  border: '0.5px solid rgba(255,255,255,0.09)',
  borderRadius: '10px',
  padding: '16px',
}

const INPUT: React.CSSProperties = {
  background: 'rgba(8,18,30,0.5)',
  border: '0.5px solid rgba(255,255,255,0.12)',
  borderRadius: '8px',
  padding: '9px 12px',
  fontSize: '13px',
  color: 'rgba(255,255,255,0.75)',
  width: '100%',
  outline: 'none',
}

function Lbl({ children }: { children: React.ReactNode }) {
  return <label style={{ display: 'block', fontSize: '9px', textTransform: 'uppercase' as const, letterSpacing: '0.1em', color: 'rgba(255,255,255,0.35)', marginBottom: '4px' }}>{children}</label>
}

function GlassInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input {...props} style={{ ...INPUT, ...props.style }} className="outline-none"
      onFocus={e => { e.currentTarget.style.borderColor = 'rgba(0,239,255,0.4)'; props.onFocus?.(e) }}
      onBlur={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'; props.onBlur?.(e) }}
    />
  )
}

function GlassSelect(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select {...props} style={{ ...INPUT, ...props.style }} className="outline-none"
      onFocus={e => (e.currentTarget.style.borderColor = 'rgba(0,239,255,0.4)')}
      onBlur={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)')}
    />
  )
}

export default function NovoProdutoPage() {
  const router = useRouter()

  const [produtoId,       setProdutoId]       = useState<string | null>(null)
  const [produto,         setProduto]         = useState<Produto | null>(null)
  const [salvandoProduto, setSalvandoProduto] = useState(false)
  const [erroProduto,     setErroProduto]     = useState('')

  const [nome,            setNome]            = useState('')
  const [tipoId,          setTipoId]          = useState('')
  const [genero,          setGenero]          = useState('')
  const [marca,           setMarca]           = useState('')
  const [composicaoItens, setComposicaoItens] = useState<ItemComposicao[]>([])
  const [descricao,       setDescricao]       = useState('')
  const [preco,           setPreco]           = useState('')
  const [controleEstoque, setControleEstoque] = useState(true)
  const [aceitaDesconto,  setAceitaDesconto]  = useState(true)

  const [tipos, setTipos] = useState<ItemCatalogo[]>([])

  useEffect(() => {
    catalogosApi.list('tipos_produto').then(setTipos)
  }, [])

  async function salvarProduto(goToList: boolean) {
    setErroProduto('')
    if (!nome.trim()) { setErroProduto('Informe o nome do produto.'); return }
    if (!preco)       { setErroProduto('Informe o preço base.'); return }
    if (!tipoId)      { setErroProduto('Selecione o tipo do produto.'); return }
    const totalComp = composicaoItens.reduce((s, i) => s + i.percentual, 0)
    if (composicaoItens.length > 0 && totalComp !== 100) {
      setErroProduto(`A composição precisa totalizar 100% (atual: ${totalComp}%).`); return
    }
    setSalvandoProduto(true)
    try {
      if (produtoId) {
        await produtosApi.update(produtoId, {
          nome, tipo_id: tipoId, genero: genero || null, marca: marca || undefined,
          descricao: descricao || undefined,
          composicao_itens: composicaoItens as any,
          preco_base: parseCurrency(preco) as any,
          controle_estoque: controleEstoque,
          aceita_desconto: aceitaDesconto,
        } as any)
        const p = await produtosApi.get(produtoId)
        setProduto(p)
        if (goToList) router.push('/painel/produtos')
      } else {
        const p = await produtosApi.create({
          nome, tipo_id: tipoId, genero: genero || undefined, marca: marca || undefined,
          descricao: descricao || undefined,
          composicao_itens: composicaoItens.length ? composicaoItens : undefined,
          preco_base: parseCurrency(preco),
          controle_estoque: controleEstoque,
          aceita_desconto: aceitaDesconto,
        } as any)
        setProdutoId(p!.id); setProduto(p!)
        if (goToList) {
          router.push('/painel/produtos')
        } else {
          router.replace(`/painel/produtos/${p!.id}`)
        }
      }
    } catch (err: any) {
      setErroProduto(err?.response?.data?.error ?? 'Erro ao salvar produto.')
    } finally { setSalvandoProduto(false) }
  }

  return (
    <>
      <TopBar />
      <main className="flex-1 overflow-hidden flex flex-col">

        <div className="flex-1 overflow-y-auto p-3">
          {erroProduto && <p style={{ fontSize: '12px', color: 'rgba(248,113,113,0.85)', textAlign: 'center', marginBottom: '8px' }}>{erroProduto}</p>}
          <div className="grid grid-cols-2 gap-3 items-start">

            {/* LEFT: Informações do produto */}
            <div style={CARD} className="flex flex-col gap-3">
              <p style={{ fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.3)' }}>Informações</p>

              <div className="flex flex-col">
                <Lbl>Nome *</Lbl>
                <GlassInput value={nome} onChange={e => setNome(e.target.value)} placeholder="Nome do produto" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col">
                  <Lbl>Tipo *</Lbl>
                  <GlassSelect value={tipoId} onChange={e => setTipoId(e.target.value)}>
                    <option value="">Tipo...</option>
                    {tipos.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
                  </GlassSelect>
                </div>
                <div className="flex flex-col">
                  <Lbl>Gênero</Lbl>
                  <GlassSelect value={genero} onChange={e => setGenero(e.target.value)}>
                    {GENEROS.map(g => <option key={g} value={g}>{g || 'Gênero...'}</option>)}
                  </GlassSelect>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col">
                  <Lbl>Marca</Lbl>
                  <GlassInput value={marca} onChange={e => setMarca(e.target.value)} placeholder="Ex: Nike" />
                </div>
                <div className="flex flex-col">
                  <Lbl>Preço base (R$) *</Lbl>
                  <GlassInput type="text" inputMode="numeric" value={preco}
                    onChange={e => setPreco(formatCurrency(e.target.value))}
                    onFocus={e => { e.currentTarget.select(); e.currentTarget.style.borderColor = 'rgba(0,239,255,0.4)' }}
                    placeholder="0,00"
                  />
                </div>
              </div>

              <div className="flex flex-col">
                <Lbl>Descrição</Lbl>
                <textarea value={descricao} onChange={e => setDescricao(e.target.value)}
                  placeholder="Detalhes do produto..." rows={2}
                  style={{ ...INPUT, resize: 'none' } as React.CSSProperties}
                  onFocus={e => (e.currentTarget.style.borderColor = 'rgba(0,239,255,0.4)')}
                  onBlur={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)')}
                />
              </div>

              <ComposicaoForm value={composicaoItens} onChange={setComposicaoItens} />

              <div style={{ background: 'rgba(8,18,30,0.35)', border: '0.5px solid rgba(255,255,255,0.07)', borderRadius: '8px', padding: '10px 12px' }} className="flex items-center justify-between">
                <div>
                  <p style={{ fontSize: '12px', fontWeight: 500, color: 'rgba(255,255,255,0.7)' }}>Controle de estoque</p>
                  <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', marginTop: '1px' }}>Desative para produtos sem controle de quantidade</p>
                </div>
                <button type="button" onClick={() => setControleEstoque(v => !v)}
                  className="shrink-0 relative transition-colors"
                  style={{ width: '40px', height: '22px', borderRadius: '9999px', border: 'none', background: controleEstoque ? 'rgba(0,212,212,0.7)' : 'rgba(255,255,255,0.1)' }}>
                  <span className="absolute top-[3px] w-[16px] h-[16px] bg-white rounded-full transition-all"
                    style={{ left: controleEstoque ? '21px' : '3px' }} />
                </button>
              </div>

              <div style={{ background: 'rgba(8,18,30,0.35)', border: '0.5px solid rgba(255,255,255,0.07)', borderRadius: '8px', padding: '10px 12px' }} className="flex items-center justify-between">
                <div>
                  <p style={{ fontSize: '12px', fontWeight: 500, color: 'rgba(255,255,255,0.7)' }}>Permitir desconto</p>
                  <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', marginTop: '1px' }}>Desative para produtos que nunca entram no desconto do caixa</p>
                </div>
                <button type="button" onClick={() => setAceitaDesconto(v => !v)}
                  className="shrink-0 relative transition-colors"
                  style={{ width: '40px', height: '22px', borderRadius: '9999px', border: 'none', background: aceitaDesconto ? 'rgba(0,212,212,0.7)' : 'rgba(255,255,255,0.1)' }}>
                  <span className="absolute top-[3px] w-[16px] h-[16px] bg-white rounded-full transition-all"
                    style={{ left: aceitaDesconto ? '21px' : '3px' }} />
                </button>
              </div>
            </div>

            {/* RIGHT: Variações placeholder */}
            <div style={CARD} className="flex flex-col gap-3">
              <p style={{ fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.3)' }}>Variações</p>
              <div className="flex flex-col items-center justify-center py-12"
                style={{ border: '1px dashed rgba(255,255,255,0.12)', borderRadius: '8px' }}>
                <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.3)', textAlign: 'center' }}>Variações disponíveis após salvar o produto</p>
                <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.2)', marginTop: '6px', textAlign: 'center' }}>Tamanhos, cores e estoques por combinação</p>
              </div>
            </div>

          </div>
        </div>

        {/* Fixed footer */}
        <div className="shrink-0 flex gap-3 px-4 py-3"
          style={{ background: 'rgba(8,18,30,0.65)', backdropFilter: 'blur(8px)', borderTop: '0.5px solid rgba(255,255,255,0.07)' }}>
          <button type="button" onClick={() => router.push('/painel/produtos')}
            className="flex-1 min-h-[44px]"
            style={{ background: 'rgba(255,255,255,0.06)', border: '0.5px solid rgba(255,255,255,0.12)', borderRadius: '8px', color: 'rgba(255,255,255,0.5)', fontSize: '13px' }}>
            Cancelar
          </button>
          <button onClick={() => salvarProduto(false)} disabled={salvandoProduto}
            className="flex-[2] min-h-[44px] disabled:opacity-40 transition-opacity"
            style={{ background: 'rgba(0,239,255,0.12)', border: '0.5px solid rgba(0,239,255,0.35)', borderRadius: '8px', color: 'rgba(0,239,255,0.85)', fontSize: '13px', fontWeight: 600 }}>
            {salvandoProduto ? 'Salvando...' : 'Aplicar'}
          </button>
          <button onClick={() => salvarProduto(true)} disabled={salvandoProduto}
            className="flex-[2] min-h-[44px] disabled:opacity-40 transition-opacity"
            style={{ background: 'rgba(0,239,255,0.85)', borderRadius: '8px', color: '#0a0a1a', fontSize: '13px', fontWeight: 600, border: 'none' }}>
            {salvandoProduto ? 'Salvando...' : 'Salvar'}
          </button>
        </div>

      </main>
    </>
  )
}
