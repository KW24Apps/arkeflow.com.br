import {
  View, Text, TextInput, StyleSheet, TouchableOpacity,
  ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, Modal,
} from 'react-native'
import { useState, useRef, useEffect } from 'react'
import { LinearGradient } from 'expo-linear-gradient'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { theme } from '../../../../constants/theme'
import { clientesApi, type ClienteSimples } from '../../../../lib/api/clientes'
import { produtosApi, type ProdutoSimples, type VersaoProduto } from '../../../../lib/api/produtos'
import { sacolasApi, type SacolaItem } from '../../../../lib/api/sacolas'

function fmtR(v: number) {
  return `R$ ${v.toFixed(2).replace('.', ',')}`
}

function fmtAtrib(a: Record<string, string> | string | null | undefined): string {
  if (!a) return ''
  const obj = typeof a === 'string' ? (() => { try { return JSON.parse(a) } catch { return {} } })() : a
  return Object.entries(obj).map(([k, v]) => `${k}: ${v}`).join(' · ')
}

export default function EditarSacolaScreen() {
  const router = useRouter()
  const { id } = useLocalSearchParams<{ id: string }>()

  const [carregando,    setCarregando]    = useState(true)
  const [erroCarregar,  setErroCarregar]  = useState('')

  // Client
  const [clienteId,        setClienteId]        = useState<string | null>(null)
  const [clienteNome,      setClienteNome]      = useState('')
  const [showTrocarModal,  setShowTrocarModal]  = useState(false)

  // Client search inside trocar modal
  const [busca,      setBusca]      = useState('')
  const [resultados, setResultados] = useState<ClienteSimples[]>([])
  const [buscando,   setBuscando]   = useState(false)

  // Products
  const [itens,              setItens]              = useState<SacolaItem[]>([])
  const [buscaProduto,       setBuscaProduto]       = useState('')
  const [resultadosProdutos, setResultadosProdutos] = useState<ProdutoSimples[]>([])
  const [buscandoProduto,    setBuscandoProduto]    = useState(false)
  const [versaoSeletor,      setVersaoSeletor]      = useState<ProdutoSimples | null>(null)
  const [infoItem,           setInfoItem]           = useState<typeof itens[0] | null>(null)

  const [salvando, setSalvando] = useState(false)
  const [erro,     setErro]     = useState('')

  const debounceCliente = useRef<ReturnType<typeof setTimeout> | null>(null)
  const debounceProduto = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!id) return
    sacolasApi.get(id)
      .then(s => {
        setClienteId(s.cliente_id)
        setClienteNome(s.cliente_nome ?? '')
        setItens(s.itens)
      })
      .catch(() => setErroCarregar('Não foi possível carregar a sacola.'))
      .finally(() => setCarregando(false))
  }, [id])

  // ── Client search ──────────────────────────────────────────────────────────

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

  function selecionarCliente(c: ClienteSimples) {
    setClienteId(c.id)
    setClienteNome(c.nome)
    setShowTrocarModal(false)
    setBusca('')
    setResultados([])
  }

  function closeTrocarModal() {
    setShowTrocarModal(false)
    setBusca('')
    setResultados([])
  }

  // ── Product management ─────────────────────────────────────────────────────

  function onBuscaProdutoChange(q: string) {
    setBuscaProduto(q)
    setVersaoSeletor(null)
    if (debounceProduto.current) clearTimeout(debounceProduto.current)
    if (!q.trim()) { setResultadosProdutos([]); return }
    debounceProduto.current = setTimeout(async () => {
      setBuscandoProduto(true)
      try {
        const res = await produtosApi.buscar(q.trim())
        setResultadosProdutos(Array.isArray(res) ? res : [])
      } catch {
        setResultadosProdutos([])
      } finally {
        setBuscandoProduto(false)
      }
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
    if (!clienteId) {
      setErro('Selecione um cliente para salvar a sacola.')
      return
    }
    setSalvando(true); setErro('')
    try {
      await sacolasApi.update(id, { itens })
      router.back()
    } catch {
      setErro('Erro ao salvar sacola. Tente novamente.')
      setSalvando(false)
    }
  }

  // ── Loading / error ────────────────────────────────────────────────────────

  if (carregando) {
    return (
      <LinearGradient colors={[theme.colors.bgGradientTop, theme.colors.bgGradientBottom]} style={styles.gradient}>
        <View style={styles.center}>
          <ActivityIndicator color={theme.colors.accent} size="large" />
        </View>
      </LinearGradient>
    )
  }

  if (erroCarregar) {
    return (
      <LinearGradient colors={[theme.colors.bgGradientTop, theme.colors.bgGradientBottom]} style={styles.gradient}>
        <View style={styles.center}>
          <Text style={styles.erroText}>{erroCarregar}</Text>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.linkText}>Voltar</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    )
  }

  const produtosValidos = resultadosProdutos
    .filter(p => p && p.id)
    .map(p => ({ ...p, versoes: Array.isArray(p.versoes) ? p.versoes : [] }))

  // ── Main render ────────────────────────────────────────────────────────────

  return (
    <LinearGradient colors={[theme.colors.bgGradientTop, theme.colors.bgGradientBottom]} style={styles.gradient}>

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color="rgba(255,255,255,0.6)" />
        </TouchableOpacity>
        <Text style={styles.title}>Editar sacola</Text>
      </View>

      {/* Client sub-header */}
      <View style={styles.clienteRow}>
        {clienteId ? (
          <TouchableOpacity
            onPress={() => router.push(`/(app)/clientes/${clienteId}?returnTo=sacola&sacolaId=${id}`)}
            style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 5 }}
            activeOpacity={0.6}
          >
            <Text style={styles.clienteRowNome} numberOfLines={1}>{clienteNome}</Text>
            <Ionicons name="create-outline" size={12} color="rgba(255,255,255,0.25)" />
          </TouchableOpacity>
        ) : (
          <Text style={[styles.clienteRowNome, { flex: 1 }]} numberOfLines={1}>Sem cliente</Text>
        )}
        <TouchableOpacity
          onPress={() => setShowTrocarModal(true)}
          style={styles.trocarBtn}
          activeOpacity={0.7}
        >
          <Text style={styles.trocarBtnText}>trocar</Text>
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
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Text style={[styles.itemNome, { flex: 1 }]} numberOfLines={1}>{item.nome}</Text>
                      <TouchableOpacity onPress={() => setInfoItem(item)} style={styles.infoBtn}>
                        <Ionicons name="information-circle-outline" size={16} color="rgba(255,255,255,0.3)" />
                      </TouchableOpacity>
                    </View>
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
              <Text style={styles.versaoTitle}>{versaoSeletor.nome}</Text>
              <Text style={styles.versaoSubtitle}>Escolha a variação:</Text>
              <View style={styles.versaoGrid}>
                {versaoSeletor.versoes.filter(v => v.ativo).map(v => (
                  <TouchableOpacity
                    key={v.id}
                    style={styles.versaoCard}
                    onPress={() => addVersao(versaoSeletor, v)}
                    activeOpacity={0.7}
                  >
                    {Object.entries(
                      typeof v.atributos === 'string'
                        ? (() => { try { return JSON.parse(v.atributos) } catch { return {} } })()
                        : (v.atributos ?? {})
                    ).map(([key, val]) => (
                      <View key={key} style={styles.versaoAtribRow}>
                        <Text style={styles.versaoAtribLabel}>{key.toUpperCase()}</Text>
                        <Text style={styles.versaoAtribVal}>{String(val)}</Text>
                      </View>
                    ))}
                    <View style={styles.versaoDivider} />
                    <Text style={styles.versaoCardPreco}>{fmtR(v.preco)}</Text>
                    <Text style={styles.versaoEstoque}>{v.estoque_atual} em estoque</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <TouchableOpacity onPress={() => setVersaoSeletor(null)} style={styles.versaoCancelarBtn}>
                <Text style={styles.versaoCancelar}>Cancelar</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Product search */}
          <View style={styles.prodSearchArea}>
            {produtosValidos.length > 0 && (
              <ScrollView
                style={styles.prodResults}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                {produtosValidos.map((p, idx) => (
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

      {/* Trocar cliente modal */}
      <Modal
        visible={showTrocarModal}
        transparent
        animationType="slide"
        onRequestClose={closeTrocarModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Trocar cliente</Text>
              <TouchableOpacity onPress={closeTrocarModal}>
                <Ionicons name="close" size={22} color="rgba(255,255,255,0.5)" />
              </TouchableOpacity>
            </View>
            <TextInput
              style={styles.input}
              value={busca}
              onChangeText={onBuscaChange}
              placeholder="Buscar cliente pelo nome..."
              placeholderTextColor={theme.colors.textFaint}
              autoFocus
              returnKeyType="search"
            />
            {buscando ? (
              <ActivityIndicator color={theme.colors.accent} style={{ marginTop: 16 }} />
            ) : (
              <ScrollView
                keyboardShouldPersistTaps="handled"
                style={{ marginTop: 8, maxHeight: 300 }}
              >
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
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* Info item modal */}
      <Modal
        visible={!!infoItem}
        transparent
        animationType="fade"
        onRequestClose={() => setInfoItem(null)}
      >
        <TouchableOpacity style={styles.infoOverlay} activeOpacity={1} onPress={() => setInfoItem(null)}>
          <View style={styles.infoModal}>
            <Text style={styles.infoModalNome}>{infoItem?.nome}</Text>
            {Object.entries(
              typeof infoItem?.atributos === 'string'
                ? (() => { try { return JSON.parse(infoItem.atributos) } catch { return {} } })()
                : (infoItem?.atributos ?? {})
            ).map(([k, v]) => (
              <View key={k} style={styles.infoRow}>
                <Text style={styles.infoKey}>{k}</Text>
                <Text style={styles.infoVal}>{String(v)}</Text>
              </View>
            ))}
            <View style={styles.infoDivider} />
            <Text style={styles.infoPreco}>{fmtR(infoItem?.preco_unitario ?? 0)} por unidade</Text>
            <TouchableOpacity style={styles.infoFechar} onPress={() => setInfoItem(null)}>
              <Text style={styles.infoFecharText}>Fechar</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

    </LinearGradient>
  )
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  center:   { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingTop: 56,
    paddingBottom: 8,
  },
  backBtn: { padding: 4, marginRight: 8 },
  title:   { flex: 1, fontSize: 20, fontWeight: '700', color: '#fff' },

  clienteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.md,
    gap: 10,
  },
  clienteRowNome: {
    flex: 1,
    fontSize: 13,
    color: 'rgba(255,255,255,0.55)',
    fontWeight: '500',
  },
  trocarBtn: {
    backgroundColor: 'rgba(0,239,255,0.08)',
    borderWidth: 0.5,
    borderColor: 'rgba(0,239,255,0.35)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  trocarBtnText: {
    fontSize: 12,
    color: theme.colors.accent,
    fontWeight: '500',
  },

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

  versaoContainer: {
    backgroundColor: 'rgba(0,200,255,0.06)',
    borderTopWidth: 0.5,
    borderTopColor: 'rgba(0,200,255,0.18)',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
  },
  versaoTitle:    { fontSize: 13, fontWeight: '700', color: 'rgba(255,255,255,0.85)' },
  versaoSubtitle: { fontSize: 11, color: theme.colors.textMuted, marginTop: 2 },
  versaoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
    marginTop: 10,
  },
  versaoCard: {
    width: '30%',
    minHeight: 120,
    backgroundColor: 'rgba(0,200,255,0.08)',
    borderWidth: 0.5,
    borderColor: 'rgba(0,200,255,0.2)',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
    gap: 4,
  },
  versaoAtribRow:    { alignItems: 'center', marginBottom: 4 },
  versaoAtribLabel:  { fontSize: 9, color: 'rgba(255,255,255,0.35)', letterSpacing: 0.8, textTransform: 'uppercase' },
  versaoAtribVal:    { fontSize: 15, color: 'rgba(255,255,255,0.9)', fontWeight: '600', textAlign: 'center' },
  versaoDivider:     { height: 0.5, backgroundColor: 'rgba(255,255,255,0.08)', width: '100%', marginVertical: 4 },
  versaoCardPreco:   { fontSize: 10, color: 'rgba(255,255,255,0.5)', marginTop: 3, textAlign: 'center' },
  versaoEstoque:     { fontSize: 10, color: 'rgba(255,255,255,0.3)', textAlign: 'center' },
  versaoCancelarBtn: { marginTop: 10, alignItems: 'center' },
  versaoCancelar:    { fontSize: 12, color: theme.colors.textMuted },

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

  erroText: {
    color: theme.colors.danger,
    fontSize: 12,
    textAlign: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: 6,
    marginTop: 4,
  },
  linkText: { color: theme.colors.accent, fontSize: 13 },

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

  // Trocar modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#0d1f3c',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  modalTitle: { fontSize: 16, fontWeight: '700', color: 'rgba(255,255,255,0.9)' },

  // Info item modal
  infoBtn:        { padding: 4, marginLeft: 4 },
  infoOverlay:    { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 32 },
  infoModal:      { backgroundColor: '#0d1f3c', borderRadius: 14, padding: 20, width: '100%', borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.1)' },
  infoModalNome:  { fontSize: 16, fontWeight: '700', color: 'rgba(255,255,255,0.9)', marginBottom: 14, textAlign: 'center' },
  infoRow:        { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 7, borderBottomWidth: 0.5, borderBottomColor: 'rgba(255,255,255,0.06)' },
  infoKey:        { fontSize: 12, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: 0.5 },
  infoVal:        { fontSize: 13, color: 'rgba(255,255,255,0.85)', fontWeight: '500' },
  infoDivider:    { height: 0.5, backgroundColor: 'rgba(255,255,255,0.08)', marginVertical: 12 },
  infoPreco:      { fontSize: 13, color: theme.colors.accent, textAlign: 'center', marginBottom: 16 },
  infoFechar:     { backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 8, padding: 10, alignItems: 'center' },
  infoFecharText: { fontSize: 13, color: 'rgba(255,255,255,0.5)' },
})
