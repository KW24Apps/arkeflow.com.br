import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Modal, Dimensions, ScrollView } from 'react-native'
import { useState, useCallback } from 'react'
import { LinearGradient } from 'expo-linear-gradient'
import { useRouter } from 'expo-router'
import { useFocusEffect } from '@react-navigation/native'
import { Ionicons } from '@expo/vector-icons'
import { useAuthStore } from '../../../lib/store/auth.store'
import { vendasApi, type VendaMobile, type VendaDetalhe } from '../../../lib/api/vendas'
import { theme } from '../../../constants/theme'

const { width, height } = Dimensions.get('window')
const CARD_GAP  = 8
const PADDING   = 16
const CARD_W    = Math.floor((width - PADDING * 2 - CARD_GAP * 2) / 3)

function fmtR(v: number) {
  return `R$ ${Number(v).toFixed(2).replace('.', ',')}`
}

function fmtHora(iso: string) {
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

export default function RelatorioVendasScreen() {
  const router  = useRouter()
  const usuario = useAuthStore(s => s.usuario)
  const [vendas,          setVendas]          = useState<VendaMobile[]>([])
  const [loading,         setLoading]         = useState(true)
  const [erro,            setErro]            = useState('')
  const [detalheVenda,    setDetalheVenda]    = useState<VendaMobile | null>(null)
  const [detalheCompleto, setDetalheCompleto] = useState<VendaDetalhe | null>(null)
  const [loadingDetalhe,  setLoadingDetalhe]  = useState(false)

  async function load() {
    if (!usuario?.id) return
    setLoading(true); setErro('')
    try {
      const data = await vendasApi.minhasHoje(usuario.id)
      setVendas(data)
    } catch {
      setErro('Não foi possível carregar as vendas.')
    } finally {
      setLoading(false)
    }
  }

  useFocusEffect(useCallback(() => { load() }, [usuario?.id]))

  async function abrirDetalhe(v: VendaMobile) {
    setDetalheVenda(v)
    setDetalheCompleto(null)
    setLoadingDetalhe(true)
    try {
      const d = await vendasApi.getDetalhe(v.id)
      setDetalheCompleto(d)
    } catch {
      setDetalheCompleto(null)
    } finally {
      setLoadingDetalhe(false)
    }
  }

  function fecharModal() {
    setDetalheVenda(null)
    setDetalheCompleto(null)
  }

  const totalHoje = vendas.reduce((s, v) => s + Number(v.total), 0)

  return (
    <LinearGradient colors={[theme.colors.bgGradientTop, theme.colors.bgGradientBottom]} style={styles.gradient}>

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color="rgba(255,255,255,0.6)" />
        </TouchableOpacity>
        <Text style={styles.title}>Minhas vendas de hoje</Text>
        <TouchableOpacity onPress={load} style={styles.refreshBtn}>
          <Ionicons name="refresh-outline" size={20} color="rgba(255,255,255,0.4)" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={theme.colors.accent} size="large" />
        </View>
      ) : erro ? (
        <View style={styles.center}>
          <Text style={styles.erroText}>{erro}</Text>
          <TouchableOpacity onPress={load}>
            <Text style={styles.retryText}>Tentar novamente</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={vendas}
          keyExtractor={v => v.id}
          numColumns={3}
          columnWrapperStyle={styles.row}
          contentContainerStyle={styles.list}
          ListHeaderComponent={
            vendas.length > 0 ? (
              <View style={styles.kpiCard}>
                <Text style={styles.kpiTotal}>{fmtR(totalHoje)}</Text>
                <Text style={styles.kpiCount}>{vendas.length} venda{vendas.length !== 1 ? 's' : ''}</Text>
              </View>
            ) : null
          }
          ListEmptyComponent={
            <View style={styles.center}>
              <Ionicons name="receipt-outline" size={48} color="rgba(255,255,255,0.12)" />
              <Text style={styles.emptyText}>Nenhuma venda hoje</Text>
            </View>
          }
          renderItem={({ item: v }) => (
            <TouchableOpacity
              style={styles.card}
              activeOpacity={0.75}
              onPress={() => abrirDetalhe(v)}
            >
              <Text style={styles.cardHora}>{fmtHora(v.criado_em)}</Text>
              <Text style={styles.cardCliente} numberOfLines={2}>{v.cliente_nome ?? 'Sem cliente'}</Text>
              <Text style={styles.cardTotal}>{fmtR(Number(v.total))}</Text>
              <Text style={styles.cardItens}>{v.total_itens} it.</Text>
            </TouchableOpacity>
          )}
        />
      )}

      {/* ── Detalhe de venda ── */}
      <Modal visible={!!detalheVenda} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { maxHeight: height * 0.88 }]}>

            {/* ── Header: cliente + hora + vendedor ── */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalCliente}>
                {detalheCompleto?.cliente_nome ?? detalheVenda?.cliente_nome ?? 'Sem cliente'}
              </Text>
              {!!detalheVenda?.cliente_telefone && (
                <Text style={styles.modalSubInfo}>{detalheVenda.cliente_telefone}</Text>
              )}
              <Text style={styles.modalSubInfo}>
                {detalheVenda ? fmtHora(detalheVenda.criado_em) : ''}
                {(detalheCompleto?.vendedor_nome ?? detalheVenda?.vendedor_nome)
                  ? ` · ${detalheCompleto?.vendedor_nome ?? detalheVenda?.vendedor_nome}`
                  : ''}
              </Text>
            </View>

            <View style={styles.modalDivider} />

            {/* ── Body ── */}
            {loadingDetalhe ? (
              <View style={styles.modalLoadingRow}>
                <ActivityIndicator color={theme.colors.accent} size="small" />
              </View>
            ) : detalheCompleto ? (
              <ScrollView showsVerticalScrollIndicator={false} style={{ flexShrink: 1 }}>

                {/* ── PRODUTOS ── */}
                <Text style={styles.sectionLabel}>PRODUTOS</Text>
                {detalheCompleto.itens.map((item, idx) => {
                  const atribs   = Object.values(item.atributos_json ?? {}).join(' · ')
                  const itemTotal = Number(item.preco_unitario) * item.quantidade
                  return (
                    <View key={idx} style={styles.produtoBlock}>
                      <View style={styles.modalRow}>
                        <View style={styles.produtoLeft}>
                          <Text style={styles.produtoNome}>{item.produto_nome}</Text>
                          {!!atribs && <Text style={styles.produtoAtribs}>{atribs}</Text>}
                        </View>
                        <Text style={styles.modalVal} numberOfLines={1}>
                          {item.quantidade}× {fmtR(Number(item.preco_unitario))}
                        </Text>
                      </View>
                      {Number(item.desconto_item) > 0 && (
                        <View style={[styles.modalRow, styles.indented]}>
                          <Text style={styles.descontoLabel}>{item.promocao_nome ?? 'Promoção'}</Text>
                          <Text style={styles.greenVal}>-{fmtR(Number(item.desconto_item))}</Text>
                        </View>
                      )}
                    </View>
                  )
                })}

                <View style={styles.modalDivider} />

                {/* ── TOTAIS ── */}
                <View style={styles.modalRow}>
                  <Text style={styles.modalLabel}>Subtotal</Text>
                  <Text style={styles.modalVal}>{fmtR(Number(detalheCompleto.subtotal))}</Text>
                </View>

                {Number(detalheCompleto.desconto_promocao) > 0 && (
                  <View style={styles.modalRow}>
                    <Text style={styles.modalLabel}>Promoção</Text>
                    <Text style={styles.greenVal}>-{fmtR(Number(detalheCompleto.desconto_promocao))}</Text>
                  </View>
                )}

                {Number(detalheCompleto.desconto_pagamento) > 0 && (
                  <View style={styles.modalRow}>
                    <Text style={styles.modalLabel}>Desconto</Text>
                    <Text style={styles.greenVal}>-{fmtR(Number(detalheCompleto.desconto_pagamento))}</Text>
                  </View>
                )}

                {Number(detalheCompleto.cashback_usado) > 0 && (
                  <View style={styles.modalRow}>
                    <Text style={styles.modalLabel}>Cashback usado</Text>
                    <Text style={styles.greenVal}>-{fmtR(Number(detalheCompleto.cashback_usado))}</Text>
                  </View>
                )}

                <View style={styles.modalRow}>
                  <Text style={[styles.modalLabel, { fontWeight: '700', color: 'rgba(255,255,255,0.85)' }]}>Total</Text>
                  <Text style={[styles.modalVal, { color: theme.colors.accent }]}>{fmtR(Number(detalheCompleto.total))}</Text>
                </View>

                <View style={styles.modalDivider} />

                {/* ── PAGAMENTO ── */}
                <Text style={styles.sectionLabel}>PAGAMENTO</Text>
                {detalheCompleto.pagamentos.map((pag, idx) => (
                  <View key={idx} style={styles.produtoBlock}>
                    <View style={styles.modalRow}>
                      <Text style={styles.modalLabel}>{pag.forma_nome}</Text>
                      <Text style={styles.modalVal}>{fmtR(Number(pag.valor))}</Text>
                    </View>
                    {Number(pag.troco) > 0 && (
                      <View style={[styles.modalRow, styles.indented]}>
                        <Text style={styles.descontoLabel}>troco</Text>
                        <Text style={styles.greenVal}>{fmtR(Number(pag.troco))}</Text>
                      </View>
                    )}
                    {pag.tipo === 'dinheiro' && pag.valor_recebido != null && (
                      <View style={[styles.modalRow, styles.indented]}>
                        <Text style={styles.mutedText}>entrou na gaveta</Text>
                        <Text style={styles.mutedText}>
                          {fmtR(Number(pag.valor_recebido) - Number(pag.troco ?? 0))}
                        </Text>
                      </View>
                    )}
                  </View>
                ))}

                {Number(detalheCompleto.cashback_gerado) > 0 && (
                  <View style={styles.modalRow}>
                    <Text style={styles.modalLabel}>Cashback gerado</Text>
                    <Text style={styles.greenVal}>+{fmtR(Number(detalheCompleto.cashback_gerado))}</Text>
                  </View>
                )}

                <View style={{ height: 8 }} />
              </ScrollView>

            ) : (
              /* fallback — basic info quando detalhe falhou */
              <View style={{ gap: 12 }}>
                <View style={styles.modalRow}>
                  <Text style={styles.modalLabel}>Hora</Text>
                  <Text style={styles.modalVal}>{detalheVenda ? fmtHora(detalheVenda.criado_em) : ''}</Text>
                </View>
                <View style={styles.modalRow}>
                  <Text style={styles.modalLabel}>Total</Text>
                  <Text style={[styles.modalVal, { color: theme.colors.accent }]}>{detalheVenda ? fmtR(Number(detalheVenda.total)) : ''}</Text>
                </View>
                <View style={styles.modalRow}>
                  <Text style={styles.modalLabel}>Itens</Text>
                  <Text style={styles.modalVal}>{detalheVenda?.total_itens}</Text>
                </View>
              </View>
            )}

            <TouchableOpacity style={styles.modalBtn} onPress={fecharModal}>
              <Text style={styles.modalBtnText}>← Voltar</Text>
            </TouchableOpacity>

          </View>
        </View>
      </Modal>

    </LinearGradient>
  )
}

const styles = StyleSheet.create({
  gradient:    { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: PADDING,
    paddingTop: 56,
    paddingBottom: theme.spacing.md,
  },
  backBtn:     { padding: 4, marginRight: 8 },
  title:       { flex: 1, fontSize: 18, fontWeight: '700', color: '#fff' },
  refreshBtn:  { padding: 4 },
  center:      { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  erroText:    { color: theme.colors.danger, fontSize: 14, textAlign: 'center' },
  retryText:   { color: theme.colors.accent, fontSize: 13 },
  emptyText:   { color: theme.colors.textMuted, fontSize: 14, marginTop: 8 },
  list:        { padding: PADDING, gap: CARD_GAP },
  row:         { gap: CARD_GAP },
  kpiCard: {
    backgroundColor: theme.colors.cardBg,
    borderWidth: 0.5,
    borderColor: 'rgba(0,200,255,0.25)',
    borderRadius: theme.borderRadius.lg,
    padding: 16,
    marginBottom: CARD_GAP,
    alignItems: 'center',
  },
  kpiTotal:    { fontSize: 28, fontWeight: '800', color: theme.colors.accent, letterSpacing: -0.5 },
  kpiCount:    { fontSize: 12, color: theme.colors.textMuted, marginTop: 2 },
  card: {
    width: CARD_W,
    backgroundColor: theme.colors.cardBg,
    borderWidth: 0.5,
    borderColor: theme.colors.cardBorder,
    borderRadius: theme.borderRadius.md,
    padding: 10,
    gap: 3,
    alignItems: 'center',
  },
  cardHora:    { fontSize: 10, color: theme.colors.textFaint, alignSelf: 'flex-start' },
  cardCliente: { fontSize: 11, color: 'rgba(255,255,255,0.7)', textAlign: 'center', lineHeight: 14 },
  cardTotal:   { fontSize: 13, fontWeight: '700', color: theme.colors.accent },
  cardItens:   { fontSize: 10, color: theme.colors.textFaint },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.72)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  modalCard: {
    width: '100%',
    backgroundColor: theme.colors.cardBg,
    borderWidth: 0.5,
    borderColor: 'rgba(0,200,255,0.2)',
    borderRadius: theme.borderRadius.lg,
    padding: 20,
    gap: 12,
  },
  modalHeader:   { alignItems: 'center', gap: 3 },
  modalCliente:  { fontSize: 17, fontWeight: '700', color: '#fff', textAlign: 'center' },
  modalSubInfo:  { fontSize: 12, color: theme.colors.textMuted, textAlign: 'center' },
  modalDivider:  { height: 0.5, backgroundColor: 'rgba(255,255,255,0.08)' },
  modalLoadingRow: { alignItems: 'center', paddingVertical: 16 },

  modalRow:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 6 },
  indented:     { paddingLeft: 14, marginTop: -2 },
  modalLabel:   { fontSize: 13, color: theme.colors.textMuted, flex: 1 },
  modalVal:     { fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.85)' },

  sectionLabel: {
    fontSize: 9, textTransform: 'uppercase', letterSpacing: 1,
    color: 'rgba(255,255,255,0.3)', marginBottom: 6, marginTop: 2,
  },
  produtoBlock:  { marginBottom: 4 },
  produtoLeft:   { flex: 1, paddingRight: 8 },
  produtoNome:   { fontSize: 13, color: 'rgba(255,255,255,0.8)', fontWeight: '500' },
  produtoAtribs: { fontSize: 11, color: theme.colors.textFaint, marginTop: 1 },
  descontoLabel: { fontSize: 12, color: theme.colors.textMuted, fontStyle: 'italic' },
  greenVal:      { fontSize: 13, fontWeight: '600', color: 'rgba(100,220,160,0.9)' },
  mutedText:     { fontSize: 12, color: theme.colors.textFaint, fontStyle: 'italic' },

  modalBtn: {
    marginTop: 4,
    alignSelf: 'center',
    paddingVertical: 10,
    paddingHorizontal: 24,
    backgroundColor: 'rgba(0,239,255,0.1)',
    borderWidth: 0.5,
    borderColor: 'rgba(0,239,255,0.3)',
    borderRadius: theme.borderRadius.md,
  },
  modalBtnText:  { fontSize: 13, color: theme.colors.accent, fontWeight: '600' },
})
