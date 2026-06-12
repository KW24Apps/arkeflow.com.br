import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native'
import { useEffect, useState } from 'react'
import { LinearGradient } from 'expo-linear-gradient'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { sacolasApi, type Sacola } from '../../../../lib/api/sacolas'
import { theme } from '../../../../constants/theme'

function fmtR(v: number) {
  return `R$ ${Number(v).toFixed(2).replace('.', ',')}`
}

function agoMin(iso: string) {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
  if (diff < 1) return 'agora'
  if (diff < 60) return `há ${diff} min`
  const h = Math.floor(diff / 60)
  return h < 24 ? `há ${h}h` : `há ${Math.floor(h / 24)}d`
}

export default function SacolasListScreen() {
  const router = useRouter()
  const [sacolas, setSacolas] = useState<Sacola[]>([])
  const [loading, setLoading] = useState(true)
  const [erro,    setErro]    = useState('')

  async function load() {
    setLoading(true); setErro('')
    try {
      const data = await sacolasApi.listPendentes()
      setSacolas(data)
    } catch {
      setErro('Não foi possível carregar as sacolas.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  return (
    <LinearGradient colors={[theme.colors.bgGradientTop, theme.colors.bgGradientBottom]} style={styles.gradient}>

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color="rgba(255,255,255,0.6)" />
        </TouchableOpacity>
        <Text style={styles.title}>Sacolas</Text>
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
          <TouchableOpacity onPress={load} style={styles.retryBtn}>
            <Text style={styles.retryText}>Tentar novamente</Text>
          </TouchableOpacity>
        </View>
      ) : sacolas.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="bag-outline" size={48} color="rgba(255,255,255,0.15)" />
          <Text style={styles.emptyText}>Nenhuma sacola pendente</Text>
        </View>
      ) : (
        <FlatList
          data={sacolas}
          keyExtractor={i => i.id}
          contentContainerStyle={styles.list}
          renderItem={({ item: s }) => {
            const tot = s.itens.reduce((a, i) => a + Number(i.preco_unitario) * i.quantidade, 0)
            const qtd = s.itens.reduce((a, i) => a + i.quantidade, 0)
            const emAtend = s.status === 'em_atendimento'
            return (
              <View style={styles.card}>
                <View style={styles.cardTop}>
                  <Text style={styles.clienteNome} numberOfLines={1}>{s.cliente_nome ?? 'Sem cliente'}</Text>
                  <View style={[styles.badge, emAtend ? styles.badgeAmber : styles.badgeCyan]}>
                    <Text style={[styles.badgeText, emAtend ? styles.badgeTextAmber : styles.badgeTextCyan]}>
                      {emAtend ? 'No caixa' : 'Aguardando'}
                    </Text>
                  </View>
                </View>
                <Text style={styles.total}>{fmtR(tot)}</Text>
                <Text style={styles.meta}>{qtd} item{qtd !== 1 ? 'ns' : ''} · {s.nome_vendedor ?? '—'}</Text>
                <Text style={styles.ago}>{agoMin(s.criado_em)}</Text>
              </View>
            )
          }}
        />
      )}

      {/* FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push('/(app)/vendas/sacolas/nova')}
        activeOpacity={0.85}
      >
        <Ionicons name="add" size={28} color="#0a0a1a" />
      </TouchableOpacity>
    </LinearGradient>
  )
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingTop: 56,
    paddingBottom: theme.spacing.md,
  },
  backBtn: { padding: 4, marginRight: 8 },
  title: { flex: 1, fontSize: 20, fontWeight: '700', color: '#fff' },
  refreshBtn: { padding: 4 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  erroText: { color: theme.colors.danger, fontSize: 14, textAlign: 'center' },
  retryBtn: {},
  retryText: { color: theme.colors.accent, fontSize: 13 },
  emptyText: { color: theme.colors.textMuted, fontSize: 14 },
  list: { padding: theme.spacing.lg, gap: 10 },
  card: {
    backgroundColor: theme.colors.cardBg,
    borderWidth: 0.5,
    borderColor: theme.colors.cardBorder,
    borderRadius: theme.borderRadius.lg,
    padding: 16,
    gap: 4,
  },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 },
  clienteNome: { flex: 1, fontSize: 14, fontWeight: '600', color: 'rgba(255,255,255,0.85)' },
  badge: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2, borderWidth: 0.5 },
  badgeCyan: { backgroundColor: 'rgba(0,239,255,0.10)', borderColor: 'rgba(0,239,255,0.30)' },
  badgeAmber: { backgroundColor: 'rgba(255,165,0,0.10)', borderColor: 'rgba(255,165,0,0.30)' },
  badgeText: { fontSize: 9, fontWeight: '500', textTransform: 'uppercase', letterSpacing: 0.6 },
  badgeTextCyan: { color: '#0ef' },
  badgeTextAmber: { color: 'rgba(255,165,0,0.85)' },
  total: { fontSize: 18, fontWeight: '700', color: theme.colors.accent },
  meta: { fontSize: 11, color: 'rgba(255,255,255,0.35)' },
  ago: { fontSize: 10, color: 'rgba(255,255,255,0.2)', marginTop: 4 },
  fab: {
    position: 'absolute',
    bottom: 32,
    right: 24,
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: theme.colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: theme.colors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
})
