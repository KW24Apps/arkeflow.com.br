import {
  View, Text, TextInput, StyleSheet, TouchableOpacity,
  ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native'
import { useState, useRef } from 'react'
import { LinearGradient } from 'expo-linear-gradient'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { theme } from '../../../../constants/theme'
import { clientesApi, type ClienteSimples } from '../../../../lib/api/clientes'
import { produtosApi, type ProdutoSimples, type VersaoProduto } from '../../../../lib/api/produtos'
import { sacolasApi, type SacolaItem } from '../../../../lib/api/sacolas'

function fmtR(v: number) {
  return `R$ ${v.toFixed(2).replace('.', ',')}`
}

function fmtAtrib(a: Record<string, string>) {
  return Object.values(a).join(' / ')
}

export default function NovaSacolaScreen() {
  const router = useRouter()

  const [step, setStep] = useState<1 | 2>(1)

  // Step 1 — client
  const [clienteId,   setClienteId]   = useState<string | null>(null)
  const [clienteNome, setClienteNome] = useState('')
  const [busca,       setBusca]       = useState('')
  const [resultados,  setResultados]  = useState<ClienteSimples[]>([])
  const [buscando,    setBuscando]    = useState(false)
  const [criando,     setCriando]     = useState(false)

  // Step 2 — products
  const [itens,               setItens]               = useState<SacolaItem[]>([])
  const [buscaProduto,        setBuscaProduto]        = useState('')
  const [resultadosProdutos,  setResultadosProdutos]  = useState<ProdutoSimples[]>([])
  const [buscandoProduto,     setBuscandoProduto]     = useState(false)
  const [versaoSeletor,       setVersaoSeletor]       = useState<ProdutoSimples | null>(null)
  const [salvando,            setSalvando]            = useState(false)
  const [erro,                setErro]                = useState('')

  const debounceCliente = useRef<ReturnType<typeof setTimeout> | null>(null)
  const debounceProduto = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ── Step 1: client search ─────────────────────────────────────────────────

  function onBuscaChange(q: string) {
    setBusca(q)
    if (debounceCliente.current) clearTimeout(debounceCliente.current)
    if (!q.trim()) { setResultados([]); return }
    debounceCliente.current = setTimeout(async () => {
      setBuscando(true)
      try { setResultados(await clientesApi.buscar(q.trim())) }
      catch { setResultados([]) }
      finally { setBuscando(false) }
    }, 400)
  }

  async function handleCriarCliente() {
    if (!busca.trim() || criando) return
    setCriando(true)
    try {
      const c = await clientesApi.criar({ nome: busca.trim() })
      setClienteId(c.id)
      setClienteNome(c.nome)
      setStep(2)
    } catch {
      // user can retry
    } finally {
      setCriando(false)
    }
  }

  function selecionarCliente(c: ClienteSimples) {
    setClienteId(c.id)
    setClienteNome(c.nome)
    setStep(2)
  }

  function continuarSemCliente() {
    setClienteId(null)
    setClienteNome('')
    setStep(2)
  }

  // ── Step 2: product search ────────────────────────────────────────────────

  function onBuscaProdutoChange(q: string) {
    setBuscaProduto(q)
    setVersaoSeletor(null)
    if (debounceProduto.current) clearTimeout(debounceProduto.current)
    if (!q.trim()) { setResultadosProdutos([]); return }
    debounceProduto.current = setTimeout(async () => {
      setBuscandoProduto(true)
      try { setResultadosProdutos(await produtosApi.buscar(q.trim())) }
      catch { setResultadosProdutos([]) }
      finally { setBuscandoProduto(false) }
    }, 400)
  }

  function addVersao(produto: ProdutoSimples, versao: VersaoProduto) {
    setItens(prev => {
      const idx = prev.findIndex(i => i.versao_id === versao.id)
      if (idx >= 0) {
        const next = [...prev]
        next[idx] = { ...next[idx], quantidade: next[idx].quantidade + 1 }
        return next
      }
      return [...prev, {
        versao_id:      versao.id,
        produto_id:     produto.id,
        nome:           produto.nome,
        atributos:      versao.atributos,
        preco_unitario: versao.preco,
        quantidade:     1,
        codigo_barras:  produto.codigo_barras,
      }]
    })
    setBuscaProduto('')
    setResultadosProdutos([])
    setVersaoSeletor(null)
  }

  function onSelectProduto(produto: ProdutoSimples) {
    const ativas = produto.versoes.filter(v => v.ativo)
    if (ativas.length === 0) return
    if (ativas.length === 1) {
      addVersao(produto, ativas[0])
    } else {
      setVersaoSeletor(produto)
      setResultadosProdutos([])
    }
  }

  function changeQtd(versao_id: string, delta: number) {
    setItens(prev => prev.map(i =>
      i.versao_id === versao_id
        ? { ...i, quantidade: Math.max(1, i.quantidade + delta) }
        : i
    ))
  }

  function removeItem(versao_id: string) {
    setItens(prev => prev.filter(i => i.versao_id !== versao_id))
  }

  // ── Save ──────────────────────────────────────────────────────────────────

  const total = itens.reduce((a, i) => a + i.preco_unitario * i.quantidade, 0)

  async function handleSalvar() {
    if (itens.length === 0 || salvando) return
    setSalvando(true); setErro('')
    try {
      await sacolasApi.create({
        cliente_id:   clienteId,
        cliente_nome: clienteNome || null,
        itens,
      })
      router.back()
    } catch {
      setErro('Erro ao salvar sacola. Tente novamente.')
      setSalvando(false)
    }
  }

  // ── STEP 1 ────────────────────────────────────────────────────────────────

  if (step === 1) {
    return (
      <LinearGradient colors={[theme.colors.bgGradientTop, theme.colors.bgGradientBottom]} style={styles.gradient}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={22} color="rgba(255,255,255,0.6)" />
          </TouchableOpacity>
          <Text style={styles.title}>Nova sacola</Text>
          <View style={{ width: 30 }} />
        </View>

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1 }}
        >
          <View style={styles.searchBox}>
            <TextInput
              style={styles.input}
              value={busca}
              onChangeText={onBuscaChange}
              placeholder="Buscar cliente pelo nome..."
              placeholderTextColor={theme.colors.textFaint}
              autoFocus
              returnKeyType="search"
            />
          </View>

          {buscando ? (
            <ActivityIndicator color={theme.colors.accent} style={{ marginTop: 20 }} />
          ) : (
            <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 100 }}>
              {resultados.map((c, idx) => (
                <TouchableOpacity
                  key={c.id}
                  style={[styles.resultRow, idx > 0 && styles.resultSep]}
                  onPress={() => selecionarCliente(c)}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.resultNome}>{c.nome}</Text>
                    {c.telefone ? <Text style={styles.resultSub}>{c.telefone}</Text> : null}
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={theme.colors.textFaint} />
                </TouchableOpacity>
              ))}

              {busca.trim() ? (
                <TouchableOpacity
                  style={[styles.criarBtn, resultados.length > 0 && { marginTop: 12 }]}
                  onPress={handleCriarCliente}
                  disabled={criando}
                >
                  {criando
                    ? <ActivityIndicator size="small" color={theme.colors.accent} />
                    : <Text style={styles.criarText}>+ Criar cliente "{busca.trim()}"</Text>
                  }
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={styles.resultRow}
                  onPress={continuarSemCliente}
                >
                  <Text style={[styles.resultNome, { color: theme.colors.textMuted }]}>
                    Continuar sem cliente
                  </Text>
                  <Ionicons name="chevron-forward" size={16} color={theme.colors.textFaint} />
                </TouchableOpacity>
              )}
            </ScrollView>
          )}
        </KeyboardAvoidingView>
      </LinearGradient>
    )
  }

  // ── STEP 2 ────────────────────────────────────────────────────────────────

  return (
    <LinearGradient colors={[theme.colors.bgGradientTop, theme.colors.bgGradientBottom]} style={styles.gradient}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => setStep(1)} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color="rgba(255,255,255,0.6)" />
        </TouchableOpacity>
        <Text style={styles.title} numberOfLines={1}>
          {clienteNome || 'Sem cliente'}
        </Text>
        <TouchableOpacity onPress={() => { setStep(1); setBusca('') }} style={styles.trocarBtn}>
          <Text style={styles.trocarText}>trocar</Text>
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <View style={{ flex: 1 }}>

          {/* Items list */}
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={styles.itemsContent}
            keyboardShouldPersistTaps="handled"
          >
            {itens.length === 0 ? (
              <Text style={styles.emptyItems}>Nenhum item adicionado</Text>
            ) : (
              itens.map(item => (
                <View key={item.versao_id} style={styles.itemRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.itemNome} numberOfLines={1}>{item.nome}</Text>
                    {Object.keys(item.atributos).length > 0 && (
                      <Text style={styles.itemAtrib}>{fmtAtrib(item.atributos)}</Text>
                    )}
                    <Text style={styles.itemPreco}>{fmtR(item.preco_unitario)}</Text>
                  </View>
                  <View style={styles.qtdRow}>
                    <TouchableOpacity style={styles.qtdBtn} onPress={() => changeQtd(item.versao_id, -1)}>
                      <Text style={styles.qtdBtnText}>−</Text>
                    </TouchableOpacity>
                    <Text style={styles.qtdVal}>{item.quantidade}</Text>
                    <TouchableOpacity style={styles.qtdBtn} onPress={() => changeQtd(item.versao_id, 1)}>
                      <Text style={styles.qtdBtnText}>+</Text>
                    </TouchableOpacity>
                  </View>
                  <TouchableOpacity style={styles.removeBtn} onPress={() => removeItem(item.versao_id)}>
                    <Ionicons name="close-circle-outline" size={20} color="rgba(255,100,100,0.55)" />
                  </TouchableOpacity>
                </View>
              ))
            )}
          </ScrollView>

          {/* Version picker */}
          {versaoSeletor && (
            <View style={styles.versaoContainer}>
              <Text style={styles.versaoTitle}>{versaoSeletor.nome} — escolha a variação:</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8 }}>
                {versaoSeletor.versoes.filter(v => v.ativo).map(v => (
                  <TouchableOpacity
                    key={v.id}
                    style={styles.versaoPill}
                    onPress={() => addVersao(versaoSeletor, v)}
                  >
                    <Text style={styles.versaoPillText}>
                      {fmtAtrib(v.atributos) || 'Padrão'} · {fmtR(v.preco)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <TouchableOpacity onPress={() => setVersaoSeletor(null)} style={{ marginTop: 10 }}>
                <Text style={styles.versaoCancelar}>Cancelar</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Product search */}
          <View style={styles.prodSearchArea}>
            {resultadosProdutos.length > 0 && (
              <ScrollView
                style={styles.prodResults}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                {resultadosProdutos.map((p, idx) => (
                  <TouchableOpacity
                    key={p.id}
                    style={[styles.resultRow, idx > 0 && styles.resultSep, { paddingHorizontal: 12 }]}
                    onPress={() => onSelectProduto(p)}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={styles.resultNome}>{p.nome}</Text>
                      <Text style={styles.resultSub}>
                        {p.versoes.filter(v => v.ativo).length} variação{p.versoes.filter(v => v.ativo).length !== 1 ? 'ões' : ''}
                      </Text>
                    </View>
                    <Ionicons name="add-circle-outline" size={20} color={theme.colors.accent} />
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}

            <View style={styles.prodInputRow}>
              <TextInput
                style={[styles.input, { flex: 1 }]}
                value={buscaProduto}
                onChangeText={onBuscaProdutoChange}
                placeholder="Buscar produto..."
                placeholderTextColor={theme.colors.textFaint}
                returnKeyType="search"
              />
              {buscandoProduto && (
                <ActivityIndicator size="small" color={theme.colors.accent} style={{ marginLeft: 8 }} />
              )}
            </View>
          </View>

          {/* Error */}
          {erro ? <Text style={styles.erroText}>{erro}</Text> : null}

          {/* Bottom bar */}
          <View style={styles.bottomBar}>
            <View>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.totalValue}>{fmtR(total)}</Text>
            </View>
            <TouchableOpacity
              style={[styles.salvarBtn, (itens.length === 0 || salvando) && styles.salvarBtnDisabled]}
              onPress={handleSalvar}
              disabled={itens.length === 0 || salvando}
              activeOpacity={0.8}
            >
              {salvando
                ? <ActivityIndicator size="small" color="#0a0a1a" />
                : <Text style={styles.salvarText}>Salvar sacola</Text>
              }
            </TouchableOpacity>
          </View>

        </View>
      </KeyboardAvoidingView>
    </LinearGradient>
  )
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingTop: 56,
    paddingBottom: theme.spacing.md,
  },
  backBtn:   { padding: 4, marginRight: 8 },
  title:     { flex: 1, fontSize: 20, fontWeight: '700', color: '#fff' },
  trocarBtn: { paddingHorizontal: 8, paddingVertical: 4 },
  trocarText:{ color: theme.colors.accent, fontSize: 12 },

  // Input
  searchBox: { paddingHorizontal: theme.spacing.lg, paddingBottom: theme.spacing.sm },
  input: {
    backgroundColor: theme.colors.inputBg,
    borderWidth: 0.5,
    borderColor: theme.colors.inputBorder,
    borderRadius: theme.borderRadius.sm,
    paddingHorizontal: 14,
    paddingVertical: 13,
    color: theme.colors.text,
    fontSize: 15,
  },

  // Result rows (shared step 1 + product results)
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: 14,
    gap: 8,
  },
  resultSep:  { borderTopWidth: 0.5, borderTopColor: 'rgba(255,255,255,0.07)' },
  resultNome: { fontSize: 14, fontWeight: '600', color: 'rgba(255,255,255,0.85)' },
  resultSub:  { fontSize: 12, color: theme.colors.textMuted, marginTop: 2 },

  // "Criar" button
  criarBtn: {
    marginHorizontal: theme.spacing.lg,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: theme.colors.accent,
    borderRadius: theme.borderRadius.sm,
    paddingVertical: 13,
    alignItems: 'center',
  },
  criarText: { color: theme.colors.accent, fontSize: 14, fontWeight: '500' },

  // Items
  itemsContent: { padding: theme.spacing.lg, paddingBottom: 8, gap: 0 },
  emptyItems:   { color: theme.colors.textMuted, fontSize: 13, textAlign: 'center', marginTop: 32 },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(255,255,255,0.07)',
    gap: 8,
  },
  itemNome:  { fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.85)' },
  itemAtrib: { fontSize: 11, color: theme.colors.textMuted, marginTop: 1 },
  itemPreco: { fontSize: 13, color: theme.colors.accent, fontWeight: '600', marginTop: 3 },
  qtdRow:    { flexDirection: 'row', alignItems: 'center', gap: 6 },
  qtdBtn: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center', justifyContent: 'center',
  },
  qtdBtnText: { color: '#fff', fontSize: 17, lineHeight: 22 },
  qtdVal:     { color: '#fff', fontSize: 14, fontWeight: '600', minWidth: 22, textAlign: 'center' },
  removeBtn:  { padding: 4 },

  // Version selector
  versaoContainer: {
    backgroundColor: 'rgba(0,200,255,0.06)',
    borderTopWidth: 0.5,
    borderTopColor: 'rgba(0,200,255,0.18)',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
  },
  versaoTitle:      { fontSize: 12, fontWeight: '600', color: 'rgba(255,255,255,0.6)' },
  versaoPill: {
    backgroundColor: 'rgba(0,200,255,0.13)',
    borderWidth: 0.5,
    borderColor: 'rgba(0,200,255,0.35)',
    borderRadius: theme.borderRadius.full,
    paddingHorizontal: 12,
    paddingVertical: 7,
    marginRight: 8,
  },
  versaoPillText: { fontSize: 12, color: theme.colors.accent },
  versaoCancelar: { fontSize: 12, color: theme.colors.textMuted },

  // Product search area
  prodSearchArea: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.sm,
    paddingBottom: theme.spacing.sm,
    borderTopWidth: 0.5,
    borderTopColor: 'rgba(255,255,255,0.07)',
  },
  prodResults: {
    maxHeight: 200,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: theme.borderRadius.sm,
    marginBottom: 8,
    borderWidth: 0.5,
    borderColor: theme.colors.cardBorder,
  },
  prodInputRow: { flexDirection: 'row', alignItems: 'center' },

  // Error
  erroText: {
    color: theme.colors.danger,
    fontSize: 12,
    textAlign: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: 6,
  },

  // Bottom bar
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.md,
    paddingBottom: Platform.OS === 'ios' ? 30 : theme.spacing.md,
    borderTopWidth: 0.5,
    borderTopColor: 'rgba(255,255,255,0.09)',
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
  totalLabel: { fontSize: 10, color: theme.colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.6 },
  totalValue: { fontSize: 22, fontWeight: '700', color: theme.colors.accent },
  salvarBtn: {
    backgroundColor: theme.colors.accent,
    paddingHorizontal: 20,
    paddingVertical: 13,
    borderRadius: theme.borderRadius.md,
    minWidth: 148,
    alignItems: 'center',
  },
  salvarBtnDisabled: { opacity: 0.35 },
  salvarText: { fontSize: 14, fontWeight: '700', color: '#0a0a1a' },
})
