'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { TopBar } from '@/components/layout/TopBar'
import { estoqueApi, type NFePreview, type NotaFiscalEntrada } from '@/lib/api/estoque'
import { fornecedoresApi, type Fornecedor } from '@/lib/api/fornecedores'

type PageView   = 'idle' | 'previewing' | 'confirming' | 'confirmed'
type FornStatus = 'loading' | 'novo' | 'existente'

interface ReceitaData {
  razao_social:   string
  nome_fantasia:  string
  logradouro:     string
  numero:         string
  complemento:    string
  bairro:         string
  municipio:      string
  uf:             string
  cep:            string
  email:          string
  ddd_telefone_1: string
}

// ── helpers ──────────────────────────────────────────────────────────────────

function fmtCNPJ(v: string) {
  const d = v.replace(/\D/g, '')
  if (d.length !== 14) return v
  return `${d.slice(0,2)}.${d.slice(2,5)}.${d.slice(5,8)}/${d.slice(8,12)}-${d.slice(12)}`
}

function fmtDate(iso: string) {
  if (!iso) return ''
  const [y, m, d] = iso.slice(0, 10).split('-')
  return `${d}/${m}/${y}`
}

function fmtR(n: number) {
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function fmtPhone(raw: string) {
  const d = raw.replace(/\D/g, '').slice(0, 11)
  if (!d) return ''
  if (d.length <= 10) return `(${d.slice(0,2)}) ${d.slice(2,6)}-${d.slice(6)}`
  return `(${d.slice(0,2)}) ${d.slice(2,7)}-${d.slice(7)}`
}

// ── style constants ───────────────────────────────────────────────────────────

const CARD: React.CSSProperties = {
  background: 'rgba(8,18,30,0.48)',
  border: '0.5px solid rgba(255,255,255,0.09)',
  borderRadius: '12px',
  padding: '16px',
}

const CHIP: React.CSSProperties = {
  fontSize: '10px',
  background: 'rgba(255,255,255,0.06)',
  border: '0.5px solid rgba(255,255,255,0.1)',
  borderRadius: '6px',
  padding: '2px 7px',
  color: 'rgba(255,255,255,0.45)',
  marginLeft: '4px',
  display: 'inline-block',
}

// ── component ────────────────────────────────────────────────────────────────

export default function NfePage() {
  const router = useRouter()

  const [view,             setView]             = useState<PageView>('idle')
  const [xmlContent,       setXmlContent]       = useState('')
  const [preview,          setPreview]          = useState<NFePreview | null>(null)
  const [previewLoading,   setPreviewLoading]   = useState(false)
  const [previewError,     setPreviewError]     = useState('')
  const [dragOver,         setDragOver]         = useState(false)

  const [fornStatus,       setFornStatus]       = useState<FornStatus | null>(null)
  const [fornecedor,       setFornecedor]       = useState<Fornecedor | null>(null)
  const [receitaData,      setReceitaData]      = useState<ReceitaData | null>(null)
  const [criando,          setCriando]          = useState(false)
  const [fornCriado,       setFornCriado]       = useState(false)

  const [confirmError,     setConfirmError]     = useState('')

  const [history,          setHistory]          = useState<NotaFiscalEntrada[]>([])
  const [histLoading,      setHistLoading]      = useState(true)

  const fileInputRef = useRef<HTMLInputElement>(null)

  function loadHistory() {
    estoqueApi.nfe.listar()
      .then(setHistory)
      .catch(() => {})
      .finally(() => setHistLoading(false))
  }

  useEffect(() => { loadHistory() }, [])

  // ── file processing ─────────────────────────────────────────────────────────

  async function processFile(file: File) {
    const isXml = file.name.toLowerCase().endsWith('.xml') || file.type === 'text/xml' || file.type === 'application/xml'
    if (!isXml) {
      setPreviewError('Selecione um arquivo .xml válido.')
      return
    }
    setPreviewError('')
    setPreviewLoading(true)
    const xml = await file.text()
    try {
      const data = await estoqueApi.nfe.preview(xml)
      setXmlContent(xml)
      setPreview(data)
      setView('previewing')
      setFornCriado(false)
      setFornecedor(null)
      setReceitaData(null)
      lookupSupplier(data.header.emitente_cnpj)
    } catch (err: any) {
      setPreviewError(err?.response?.data?.error ?? 'Erro ao processar XML.')
    } finally {
      setPreviewLoading(false)
    }
  }

  // ── supplier lookup ─────────────────────────────────────────────────────────

  async function lookupSupplier(cnpjRaw: string) {
    setFornStatus('loading')
    const [fornRes, receitaRes] = await Promise.allSettled([
      fornecedoresApi.list(cnpjRaw),
      fetch(`https://minhareceita.org/${cnpjRaw}`).then(r => r.ok ? r.json() : null),
    ])
    const found = fornRes.status === 'fulfilled'
      ? fornRes.value.find(f => f.cnpj === cnpjRaw) ?? null
      : null
    const rec: ReceitaData | null = receitaRes.status === 'fulfilled' ? receitaRes.value : null
    setFornecedor(found)
    setReceitaData(rec)
    setFornStatus(found ? 'existente' : 'novo')
  }

  // ── create supplier ─────────────────────────────────────────────────────────

  async function handleCriarFornecedor() {
    if (!preview) return
    setCriando(true)
    try {
      const cnpjRaw = preview.header.emitente_cnpj
      const tel     = receitaData?.ddd_telefone_1 ? fmtPhone(receitaData.ddd_telefone_1) : undefined
      const f = await fornecedoresApi.create({
        razao_social:  receitaData?.razao_social  || preview.header.emitente_nome,
        nome_fantasia: receitaData?.nome_fantasia || undefined,
        cnpj:          cnpjRaw,
        email:         receitaData?.email         || undefined,
        telefones:     tel ? [tel] : [],
        logradouro:    receitaData?.logradouro    || undefined,
        numero:        receitaData?.numero        || undefined,
        complemento:   receitaData?.complemento   || undefined,
        bairro:        receitaData?.bairro        || undefined,
        cidade:        receitaData?.municipio     || undefined,
        estado:        receitaData?.uf            || undefined,
        cep:           receitaData?.cep           || undefined,
      } as any)
      setFornecedor(f)
      setFornStatus('existente')
      setFornCriado(true)
    } catch (err: any) {
      setPreviewError(err?.response?.data?.error ?? 'Erro ao criar fornecedor.')
    } finally {
      setCriando(false)
    }
  }

  // ── confirm flow ────────────────────────────────────────────────────────────
  // Flow: salvar(xml+header+itens) → itens(nota_id) → confirmar(nota_id+item_ids)
  // salvar is required because confirmar needs DB UUIDs from notas_fiscais_entrada_itens

  async function handleConfirmar() {
    if (!preview || !xmlContent) return
    setConfirmError('')
    setView('confirming')
    try {
      // Update existing supplier's razao_social from Receita (non-blocking, silent on error)
      if (fornecedor && receitaData && !fornCriado) {
        fornecedoresApi.update(fornecedor.id, {
          razao_social:  receitaData.razao_social  || fornecedor.razao_social,
          nome_fantasia: receitaData.nome_fantasia || fornecedor.nome_fantasia || undefined,
        } as any).catch(() => {})
      }

      // 1. Save nota → get nota_id (UPSERT — safe to call even if nota_id_pendente exists)
      const { nota_id } = await estoqueApi.nfe.salvar({
        xml:    xmlContent,
        header: preview.header,
        itens:  preview.itens,
      })

      // 2. Fetch saved items to get their DB UUIDs (required by confirmar)
      const savedItens = await estoqueApi.nfe.itens(nota_id)

      // 3. Confirm stock entries — only matched items get processed
      await estoqueApi.nfe.confirmar({
        nota_id,
        itens: savedItens.map(i => ({
          id:        i.id,
          versao_id: i.versao_id,
          confirmar: i.matched,
        })),
      })

      setView('confirmed')
      loadHistory()
      setTimeout(() => {
        setView('idle')
        setPreview(null)
        setXmlContent('')
        setPreviewError('')
        setConfirmError('')
        setFornStatus(null)
        setFornecedor(null)
        setReceitaData(null)
        setFornCriado(false)
        if (fileInputRef.current) fileInputRef.current.value = ''
      }, 2500)
    } catch (err: any) {
      setConfirmError(err?.response?.data?.error ?? 'Erro ao confirmar entrada.')
      setView('previewing')
    }
  }

  function handleReset() {
    setView('idle')
    setPreview(null)
    setXmlContent('')
    setPreviewError('')
    setConfirmError('')
    setFornStatus(null)
    setFornecedor(null)
    setReceitaData(null)
    setFornCriado(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) processFile(file)
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) processFile(file)
  }

  // ── derived ────────────────────────────────────────────────────────────────

  const matchedCount   = preview?.itens.filter(i => i.matched).length ?? 0
  const unmatchedCount = (preview?.itens.length ?? 0) - matchedCount
  const busy           = view === 'confirming'

  function statusBadge(status: NotaFiscalEntrada['status']) {
    if (status === 'confirmada') return { bg: 'rgba(100,220,160,0.12)', border: 'rgba(100,220,160,0.3)', color: 'rgba(100,220,160,0.9)',  label: 'confirmada' }
    if (status === 'cancelada')  return { bg: 'rgba(240,100,100,0.1)',  border: 'rgba(240,100,100,0.3)', color: 'rgba(240,100,100,0.85)', label: 'cancelada' }
    return                              { bg: 'rgba(234,179,8,0.1)',    border: 'rgba(234,179,8,0.3)',   color: 'rgba(234,179,8,0.9)',    label: 'pendente' }
  }

  // ── render ──────────────────────────────────────────────────────────────────

  return (
    <>
      <TopBar />
      <main className="flex-1 overflow-y-auto p-4 md:p-6 pb-8">

        {/* Page header */}
        <div className="flex items-center gap-3 mb-5">
          <button
            onClick={() => router.push('/painel/estoque')}
            style={{ background: 'rgba(255,255,255,0.06)', border: '0.5px solid rgba(255,255,255,0.12)', borderRadius: '8px', padding: '6px 12px', fontSize: '12px', color: 'rgba(255,255,255,0.5)', cursor: 'pointer' }}
          >
            ← Estoque
          </button>
          <p style={{ fontSize: '15px', fontWeight: 600, color: 'rgba(255,255,255,0.85)' }}>Importar NF-e</p>
        </div>

        {/* Two-column layout */}
        <div className="flex flex-col md:flex-row gap-5 items-start">

          {/* ── LEFT COLUMN ─────────────────────────────────────── */}
          <div className="w-full md:w-80 shrink-0 flex flex-col gap-4">

            {/* Upload zone */}
            <div
              onClick={() => !previewLoading && fileInputRef.current?.click()}
              onDragOver={e => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              style={{
                border: `1.5px dashed ${dragOver ? '#0ef' : previewError ? 'rgba(240,100,100,0.45)' : 'rgba(255,255,255,0.18)'}`,
                borderRadius: '14px',
                padding: '28px 20px',
                textAlign: 'center',
                cursor: previewLoading ? 'default' : 'pointer',
                background: dragOver ? 'rgba(0,239,255,0.05)' : 'rgba(8,18,30,0.3)',
                transition: 'border-color 150ms, background 150ms',
                opacity: (view === 'previewing' || busy) ? 0.6 : 1,
              }}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xml"
                style={{ display: 'none' }}
                onChange={handleFileChange}
              />
              {previewLoading ? (
                <>
                  <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '10px' }}>
                    <div className="w-6 h-6 border-2 border-electric-cyan border-t-transparent rounded-full animate-spin" />
                  </div>
                  <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.45)' }}>Processando XML...</p>
                </>
              ) : (
                <>
                  <p style={{ fontSize: '26px', color: 'rgba(255,255,255,0.2)', marginBottom: '8px', lineHeight: 1 }}>↑</p>
                  <p style={{ fontSize: '13px', fontWeight: 500, color: 'rgba(255,255,255,0.65)', marginBottom: '4px' }}>
                    Selecionar arquivo XML
                  </p>
                  <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.28)' }}>
                    Arraste ou clique para carregar NF-e
                  </p>
                  {previewError && (
                    <p style={{ fontSize: '12px', color: 'rgba(240,100,100,0.85)', marginTop: '10px' }}>
                      {previewError}
                    </p>
                  )}
                </>
              )}
            </div>

            {/* History list */}
            <div>
              <p style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(255,255,255,0.3)', marginBottom: '8px' }}>
                Histórico
              </p>
              {histLoading ? (
                <div className="flex justify-center py-4">
                  <div className="w-5 h-5 border-2 border-electric-cyan border-t-transparent rounded-full animate-spin" />
                </div>
              ) : history.length === 0 ? (
                <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.22)', textAlign: 'center', padding: '16px 0' }}>
                  Nenhuma nota importada
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {history.map(nota => {
                    const badge = statusBadge(nota.status)
                    return (
                      <div key={nota.id} style={{ ...CARD, padding: '10px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontSize: '12px', fontWeight: 500, color: 'rgba(255,255,255,0.78)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {nota.emitente_nome}
                          </p>
                          <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.33)', marginTop: '2px' }}>
                            {fmtDate(nota.data_emissao)} · {nota.total_itens} iten{nota.total_itens !== 1 ? 's' : ''}
                          </p>
                        </div>
                        <div style={{ textAlign: 'right', flexShrink: 0 }}>
                          <p style={{ fontSize: '12px', fontWeight: 600, color: 'rgba(100,220,160,0.9)' }}>
                            {fmtR(Number(nota.vl_total))}
                          </p>
                          <span style={{ fontSize: '9px', background: badge.bg, border: `0.5px solid ${badge.border}`, color: badge.color, borderRadius: '999px', padding: '1px 6px', display: 'inline-block', marginTop: '3px' }}>
                            {badge.label}
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          {/* ── RIGHT COLUMN ────────────────────────────────────── */}
          {(view === 'previewing' || busy || view === 'confirmed') && preview && (
            <div className="flex-1 flex flex-col gap-4 min-w-0">

              {/* Confirmed state */}
              {view === 'confirmed' && (
                <div style={{ background: 'rgba(100,220,160,0.08)', border: '0.5px solid rgba(100,220,160,0.3)', borderRadius: '14px', padding: '32px 24px', textAlign: 'center' }}>
                  <p style={{ fontSize: '32px', color: 'rgba(100,220,160,0.9)', lineHeight: 1, marginBottom: '10px' }}>✓</p>
                  <p style={{ fontSize: '16px', fontWeight: 600, color: 'rgba(100,220,160,0.9)' }}>Entrada confirmada</p>
                  <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', marginTop: '6px' }}>
                    {matchedCount} item{matchedCount !== 1 ? 's' : ''} adicionado{matchedCount !== 1 ? 's' : ''} ao estoque
                  </p>
                </div>
              )}

              {view !== 'confirmed' && (
                <>
                  {/* Nota header card */}
                  <div style={CARD}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '10px' }}>
                      <div style={{ flex: 1, minWidth: 0, marginRight: '12px' }}>
                        <p style={{ fontSize: '14px', fontWeight: 600, color: 'rgba(255,255,255,0.9)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {preview.header.emitente_nome}
                        </p>
                        <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)', marginTop: '2px' }}>
                          CNPJ {fmtCNPJ(preview.header.emitente_cnpj)}
                        </p>
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <p style={{ fontSize: '20px', fontWeight: 700, color: 'rgba(100,220,160,0.9)' }}>
                          {fmtR(preview.header.vl_total)}
                        </p>
                        <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)', marginTop: '2px' }}>
                          emissão {fmtDate(preview.header.data_emissao)}
                        </p>
                      </div>
                    </div>
                    <p style={{ fontFamily: 'monospace', fontSize: '10px', color: 'rgba(255,255,255,0.22)', wordBreak: 'break-all' }}>
                      NF {preview.header.numero}-{preview.header.serie} · {preview.header.chave_acesso}
                    </p>
                    {preview.nota_id_pendente && (
                      <p style={{ fontSize: '11px', color: 'rgba(234,179,8,0.8)', marginTop: '8px' }}>
                        ⚠ Esta nota já foi importada anteriormente e está pendente de confirmação.
                      </p>
                    )}
                  </div>

                  {/* Supplier card */}
                  {fornStatus === 'loading' && (
                    <div style={{ ...CARD, display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div className="w-4 h-4 border-2 border-electric-cyan border-t-transparent rounded-full animate-spin shrink-0" />
                      <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>Verificando fornecedor...</p>
                    </div>
                  )}

                  {fornStatus === 'existente' && (
                    <div style={{ background: 'rgba(100,220,160,0.07)', border: `0.5px solid ${fornCriado ? 'rgba(100,220,160,0.4)' : 'rgba(100,220,160,0.18)'}`, borderRadius: '12px', padding: '12px 14px' }}>
                      <p style={{ fontSize: '12px', fontWeight: 500, color: 'rgba(100,220,160,0.9)' }}>
                        {fornCriado ? '✓ Fornecedor criado' : '✓ Fornecedor identificado'}
                      </p>
                      <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.45)', marginTop: '3px' }}>
                        {fornecedor?.razao_social}
                      </p>
                      {!fornCriado && receitaData && (
                        <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.28)', marginTop: '3px' }}>
                          Razão social será sincronizada com a Receita Federal ao confirmar.
                        </p>
                      )}
                    </div>
                  )}

                  {fornStatus === 'novo' && (
                    <div style={{ background: 'rgba(234,179,8,0.06)', border: '0.5px solid rgba(234,179,8,0.22)', borderRadius: '12px', padding: '12px 14px' }}>
                      <p style={{ fontSize: '12px', fontWeight: 500, color: 'rgba(234,179,8,0.9)' }}>Fornecedor não cadastrado</p>
                      <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', marginTop: '3px' }}>
                        {receitaData?.razao_social ?? preview.header.emitente_nome}
                      </p>
                      <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', marginTop: '2px' }}>
                        CNPJ {fmtCNPJ(preview.header.emitente_cnpj)}
                      </p>
                      <button
                        onClick={handleCriarFornecedor}
                        disabled={criando || busy}
                        style={{ marginTop: '10px', minHeight: '34px', padding: '0 14px', background: 'rgba(234,179,8,0.1)', border: '0.5px solid rgba(234,179,8,0.35)', borderRadius: '8px', color: 'rgba(234,179,8,0.9)', fontSize: '12px', cursor: 'pointer', opacity: criando ? 0.6 : 1 }}
                      >
                        {criando ? 'Criando...' : 'Criar fornecedor'}
                      </button>
                    </div>
                  )}

                  {/* Item list */}
                  <div style={{ ...CARD, padding: 0, overflow: 'hidden' }}>
                    <div style={{ padding: '12px 14px', borderBottom: '0.5px solid rgba(255,255,255,0.07)' }}>
                      <p style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.07em', color: 'rgba(255,255,255,0.35)' }}>
                        Itens da nota
                      </p>
                    </div>
                    {preview.itens.map(item => (
                      <div
                        key={item.numero_item}
                        style={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: '10px',
                          padding: '10px 14px',
                          borderBottom: '0.5px solid rgba(255,255,255,0.04)',
                          background: item.matched ? 'transparent' : 'rgba(234,179,8,0.03)',
                        }}
                      >
                        {/* Number */}
                        <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.2)', width: '18px', flexShrink: 0, paddingTop: '2px' }}>
                          {item.numero_item}
                        </span>

                        {/* Description */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.32)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {item.xprod}
                          </p>
                          {item.matched && item.versao && (
                            <p style={{ fontSize: '12px', fontWeight: 500, color: 'rgba(255,255,255,0.8)', marginTop: '3px' }}>
                              {item.versao.produto_nome}
                              {Object.entries(item.versao.atributos_json ?? {}).map(([, v]) => (
                                <span key={String(v)} style={CHIP}>{String(v)}</span>
                              ))}
                            </p>
                          )}
                        </div>

                        {/* Qty + cost */}
                        <div style={{ textAlign: 'right', flexShrink: 0 }}>
                          <p style={{ fontSize: '12px', fontWeight: 500, color: 'rgba(255,255,255,0.65)' }}>
                            {item.qcom} {item.ucom}
                          </p>
                          <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.28)', marginTop: '1px' }}>
                            {fmtR(item.vuncom)}/un
                          </p>
                        </div>

                        {/* Match chip */}
                        <span style={{
                          fontSize: '9px',
                          borderRadius: '999px',
                          padding: '2px 7px',
                          flexShrink: 0,
                          background: item.matched ? 'rgba(100,220,160,0.1)'  : 'rgba(234,179,8,0.1)',
                          border:     `0.5px solid ${item.matched ? 'rgba(100,220,160,0.3)'  : 'rgba(234,179,8,0.3)'}`,
                          color:      item.matched ? 'rgba(100,220,160,0.9)'  : 'rgba(234,179,8,0.9)',
                        }}>
                          {item.matched ? '✓ encontrado' : '⚠ sem match'}
                        </span>
                      </div>
                    ))}
                    <div style={{ padding: '10px 14px' }}>
                      <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>
                        <span style={{ color: 'rgba(100,220,160,0.8)' }}>{matchedCount} encontrado{matchedCount !== 1 ? 's' : ''}</span>
                        {' · '}
                        <span style={{ color: unmatchedCount > 0 ? 'rgba(234,179,8,0.8)' : 'rgba(255,255,255,0.3)' }}>
                          {unmatchedCount} sem match
                        </span>
                      </p>
                    </div>
                  </div>

                  {/* Confirm error */}
                  {confirmError && (
                    <p style={{ fontSize: '12px', color: 'rgba(240,100,100,0.85)', textAlign: 'center' }}>
                      {confirmError}
                    </p>
                  )}

                  {/* Action buttons */}
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button
                      onClick={handleReset}
                      disabled={busy}
                      style={{ flex: 1, minHeight: '44px', background: 'rgba(255,255,255,0.04)', border: '0.5px solid rgba(255,255,255,0.12)', borderRadius: '10px', color: 'rgba(255,255,255,0.6)', fontSize: '13px', cursor: busy ? 'default' : 'pointer', opacity: busy ? 0.4 : 1 }}
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={handleConfirmar}
                      disabled={busy}
                      style={{ flex: 2, minHeight: '44px', background: 'rgba(0,239,255,0.15)', border: '0.5px solid rgba(0,239,255,0.4)', borderRadius: '10px', color: '#0ef', fontSize: '13px', fontWeight: 600, cursor: busy ? 'not-allowed' : 'pointer', opacity: busy ? 0.7 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                    >
                      {busy ? (
                        <>
                          <div className="w-4 h-4 border-2 border-electric-cyan border-t-transparent rounded-full animate-spin" />
                          Confirmando...
                        </>
                      ) : 'Confirmar entrada de estoque'}
                    </button>
                  </div>

                  {/* Disclaimer */}
                  <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.22)', textAlign: 'center', lineHeight: 1.6 }}>
                    Itens sem match serão ignorados. O custo médio ponderado móvel (CMPM) será recalculado automaticamente para os itens vinculados.
                  </p>
                </>
              )}
            </div>
          )}
        </div>
      </main>
    </>
  )
}
