import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Modal, Dimensions } from 'react-native'
import { useState, useCallback } from 'react'
import { LinearGradient } from 'expo-linear-gradient'
import { useRouter } from 'expo-router'
import { useFocusEffect } from '@react-navigation/native'
import { Ionicons } from '@expo/vector-icons'
import { useAuthStore } from '../../../lib/store/auth.store'
import { vendasApi, type VendaMobile } from '../../../lib/api/vendas'
import { theme } from '../../../constants/theme'

const { width } = Dimensions.get('window')
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
  const [vendas,       setVendas]       = useState<VendaMobile[]>([])
  const [loading,      setLoading]      = useState(true)
  const [erro,         setErro]         = useState('')
  const [detalheVenda, setDetalheVenda] = useState<VendaMobile | null>(null)

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
              onPress={() => setDetalheVenda(v)}
            >
              <Text style={styles.cardHora}>{fmtHora(v.criado_em)}</Text>
              <Text style={styles.cardCliente} numberOfLines={2}>{v.cliente_nome ?? 'Sem cliente'}</Text>
              <Text style={styles.cardTotal}>{fmtR(Number(v.total))}</Text>
              <Text style={styles.cardItens}>{v.total_itens} it.</Text>
            </TouchableOpacity>
          )}
        />
      )}

      {/* Detalhe de venda */}
      <Modal visible={!!detalheVenda} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalCliente}>{detalheVenda?.cliente_nome ?? 'Sem cliente'}</Text>
            <View style={styles.modalDivider} />
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
            <TouchableOpacity style={styles.modalBtn} onPress={() => setDetalheVenda(null)}>
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
  modalCliente:  { fontSize: 17, fontWeight: '700', color: '#fff', textAlign: 'center' },
  modalDivider:  { height: 0.5, backgroundColor: 'rgba(255,255,255,0.08)' },
  modalRow:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  modalLabel:    { fontSize: 13, color: theme.colors.textMuted },
  modalVal:      { fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.85)' },
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
