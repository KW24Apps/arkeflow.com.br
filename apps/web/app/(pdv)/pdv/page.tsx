'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { usePDVStore } from '@/store/pdv.store'
import { api } from '@/lib/api/client'
import { clientesApi, type Cliente } from '@/lib/api/clientes'

interface VersaoResult {
  versao_id: string
  produto_id: string
  produto_nome: string
  atributos_json: Record<string, string>
  preco_base: string
  preco_especifico: string | null
  codigo_barras: string | null
  estoque_atual: number
  controle_estoque: boolean
}

interface ProdutoSearch {
  id: string
  nome: string
  preco_base: string
  total_versoes: number
  versoes?: any[]
}

export default function PDVPage() {
  const router = useRouter()
  const { itens, cliente_id, cliente_nome, addItem, removeItem, setQtd, setCliente, limpar } = usePDVStore()

  const inputRef      = useRef<HTMLInputElement>(null)
  const [input, setInput]           = useState('')
  const [buscando, setBuscando]     = useState(false)
  const [resultados, setResultados] = useState<ProdutoSearch[]>([])
  const [erro, setErro]             = useState('')
  const [scanAtivo, setScanAtivo]   = useState(false)
  const videoRef                    = useRef<HTMLVideoElement>(null)
  const streamRef                   = useRef<MediaStream | null>(null)

  // Mantém o foco no input para o scanner físico funcionar
  useEffect(() => {
    inputRef.current?.focus()
    return () => stopCamera()
  }, [])

  const total = itens.reduce((s, i) => s + i.preco_unitario * i.quantidade, 0)

  // Busca produto por código de barras
  async function buscarPorCodigo(codigo: string) {
    try {
      const { data } = await api.get<VersaoResult>(`/produtos/barcode/${encodeURIComponent(codigo)}`)
      const preco = data.preco_especifico ? parseFloat(data.preco_especifico) : parseFloat(data.preco_base)
      addItem({
        versao_id:      data.versao_id ?? codigo,
        produto_id:     data.produto_id,
        nome:           data.produto_nome,
        atributos:      data.atributos_json ?? {},
        preco_unitario: preco,
        codigo_barras:  data.codigo_barras,
      })
      setErro('')
      return true
    } catch {
      return false
    }
  }

  // Busca por texto
  async function buscarPorTexto(q: string) {
    if (!q.trim()) { setResultados([]); return }
    setBuscando(true)
    try {
      const { data } = await api.get<ProdutoSearch[]>(`/produtos?q=${encodeURIComponent(q)}&todos=false`)
      setResultados(data)
    } finally { setBuscando(false) }
  }

  // Handler do input: Enter = busca por código/barras
  async function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key !== 'Enter') return
    e.preventDefault()
    const codigo = input.trim()
    if (!codigo) return

    setResultados([])
    const encontrou = await buscarPorCodigo(codigo)
    if (!encontrou) {
      setErro(`Código "${codigo}" não encontrado.`)
    }
    setInput('')
    inputRef.current?.focus()
  }

  // Seleciona produto da busca (quando tem variação única)
  async function selecionarProduto(p: ProdutoSearch) {
    try {
      const { data } = await api.get<any>(`/produtos/${p.id}`)
      if (data.versoes?.length === 1) {
        const v = data.versoes[0]
        const preco = v.preco_especifico ? parseFloat(v.preco_especifico) : parseFloat(data.preco_base)
        addItem({ versao_id: v.id, produto_id: p.id, nome: p.nome, atributos: v.atributos_json, preco_unitario: preco, codigo_barras: v.codigo_barras })
        setResultados([])
        setInput('')
      } else {
        // Múltiplas variações — navega para seleção
        router.push(`/pdv/produto/${p.id}`)
      }
    } catch {}
    inputRef.current?.focus()
  }

  // Scanner de câmera usando BarcodeDetector (nativo em Android/Chrome)
  async function toggleCamera() {
    if (scanAtivo) { stopCamera(); return }
    if (!('BarcodeDetector' in window)) {
      setErro('Câmera/scanner não suportado neste dispositivo. Use o leitor físico.')
      return
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
      streamRef.current = stream
      setScanAtivo(true)
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.play()
        scanLoop()
      }
    } catch {
      setErro('Não foi possível acessar a câmera.')
    }
  }

  const scanLoop = useCallback(async () => {
    if (!videoRef.current || !streamRef.current) return
    try {
      const detector = new (window as any).BarcodeDetector({ formats: ['ean_13', 'ean_8', 'code_128', 'qr_code'] })
      const loop = async () => {
        if (!streamRef.current) return
        const codes = await detector.detect(videoRef.current!)
        if (codes.length > 0) {
          stopCamera()
          await buscarPorCodigo(codes[0].rawValue)
        } else {
          requestAnimationFrame(loop)
        }
      }
      loop()
    } catch {}
  }, [])

  function stopCamera() {
    streamRef.current?.getTracks().forEach(t => t.stop())
    streamRef.current = null
    setScanAtivo(false)
  }

  return (
    <div className="flex flex-col h-full">

      {/* Input de scan/busca */}
      <div className="p-3 bg-deep-ocean border-b border-ocean-depth flex gap-2 sticky top-0 z-10">
        <div className="flex-1 relative">
          <input
            ref={inputRef}
            value={input}
            onChange={e => { setInput(e.target.value); buscarPorTexto(e.target.value) }}
            onKeyDown={handleKeyDown}
            placeholder="Código de barras ou nome do produto..."
            autoComplete="off"
            className="w-full min-h-[52px] bg-midnight border border-ocean-depth rounded-xl px-4 pr-10 text-sm text-sea-foam placeholder-steel outline-none focus:border-electric-cyan"
          />
          {input && (
            <button onClick={() => { setInput(''); setResultados([]); inputRef.current?.focus() }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-steel hover:text-sea-foam text-xl">×</button>
          )}
        </div>
        <button onClick={toggleCamera}
          title="Escanear com câmera"
          className={`min-h-[52px] min-w-[52px] rounded-xl text-xl flex items-center justify-center transition-colors ${
            scanAtivo ? 'bg-electric-cyan text-midnight' : 'bg-ocean-depth text-sea-foam'
          }`}>
          📷
        </button>
      </div>

      {/* Câmera */}
      {scanAtivo && (
        <div className="relative bg-black">
          <video ref={videoRef} className="w-full max-h-48 object-cover" playsInline muted />
          <div className="absolute inset-0 border-4 border-electric-cyan/50 pointer-events-none" />
          <p className="absolute bottom-2 left-0 right-0 text-center text-electric-cyan text-xs">Aponte para o código de barras</p>
        </div>
      )}

      {/* Resultados da busca */}
      {resultados.length > 0 && (
        <div className="mx-3 mt-2 bg-deep-ocean border border-ocean-depth rounded-2xl overflow-hidden z-10 relative">
          {resultados.slice(0, 5).map(p => (
            <button key={p.id} onClick={() => selecionarProduto(p)}
              className="w-full flex items-center justify-between px-4 py-3 hover:bg-ocean-depth transition-colors border-b border-ocean-depth last:border-0 text-left">
              <div>
                <p className="text-sea-foam text-sm font-medium">{p.nome}</p>
                <p className="text-steel text-xs">{p.total_versoes} var.</p>
              </div>
              <p className="text-electric-cyan text-sm font-semibold">R$ {Number(p.preco_base).toFixed(2)}</p>
            </button>
          ))}
        </div>
      )}

      {erro && (
        <p className="mx-3 mt-2 text-red-400 text-xs text-center">{erro}</p>
      )}

      {/* Cliente */}
      <div className="mx-3 mt-3">
        {cliente_id ? (
          <div className="flex items-center justify-between bg-electric-cyan/10 border border-electric-cyan/30 rounded-xl px-4 py-2">
            <p className="text-sea-foam text-sm">👤 {cliente_nome}</p>
            <button onClick={() => setCliente(null, null)} className="text-steel hover:text-sea-foam text-xs">Remover</button>
          </div>
        ) : (
          <button onClick={() => router.push('/pdv/cliente')}
            className="w-full min-h-[44px] border border-ocean-depth rounded-xl text-steel text-sm hover:border-teal-current transition-colors">
            + Vincular cliente (opcional)
          </button>
        )}
      </div>

      {/* Sacola */}
      <div className="flex-1 overflow-y-auto px-3 py-2">
        {itens.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <span className="text-4xl opacity-30">🛒</span>
            <p className="text-steel text-sm">Sacola vazia</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {itens.map(item => {
              const label = Object.values(item.atributos).join(' / ') || 'Versão única'
              return (
                <div key={item.versao_id} className="bg-deep-ocean border border-ocean-depth rounded-2xl p-3 flex gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sea-foam text-sm font-medium truncate">{item.nome}</p>
                    <p className="text-steel text-xs">{label}</p>
                    <p className="text-electric-cyan text-sm font-semibold mt-0.5">
                      R$ {(item.preco_unitario * item.quantidade).toFixed(2)}
                    </p>
                  </div>
                  {/* Controle de quantidade */}
                  <div className="flex items-center gap-2 shrink-0">
                    <button onClick={() => setQtd(item.versao_id, item.quantidade - 1)}
                      className="w-9 h-9 bg-ocean-depth text-sea-foam rounded-xl text-lg font-bold flex items-center justify-center">−</button>
                    <span className="text-sea-foam font-semibold w-6 text-center text-sm">{item.quantidade}</span>
                    <button onClick={() => setQtd(item.versao_id, item.quantidade + 1)}
                      className="w-9 h-9 bg-ocean-depth text-sea-foam rounded-xl text-lg font-bold flex items-center justify-center">+</button>
                    <button onClick={() => removeItem(item.versao_id)}
                      className="w-9 h-9 text-steel hover:text-red-400 rounded-xl flex items-center justify-center">🗑️</button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Rodapé: total + finalizar */}
      <div className="p-3 bg-deep-ocean border-t border-ocean-depth">
        {itens.length > 0 && (
          <div className="flex items-center justify-between mb-3 px-1">
            <div>
              <p className="text-steel text-xs">{itens.reduce((s, i) => s + i.quantidade, 0)} item(ns)</p>
              <p className="text-sea-foam font-bold text-xl">R$ {total.toFixed(2)}</p>
            </div>
            <button onClick={limpar} className="text-steel text-xs hover:text-red-400">Limpar</button>
          </div>
        )}
        <button
          disabled={itens.length === 0}
          onClick={() => router.push('/pdv/checkout')}
          className="w-full min-h-[56px] bg-electric-cyan text-midnight rounded-2xl text-base font-bold disabled:opacity-30 active:scale-[0.98] transition-transform"
        >
          {itens.length === 0 ? 'Sacola vazia' : 'Fechar Venda →'}
        </button>
      </div>

    </div>
  )
}
