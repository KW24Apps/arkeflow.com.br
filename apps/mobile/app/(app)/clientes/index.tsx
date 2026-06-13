import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, ActivityIndicator,
} from 'react-native'
import { useState, useRef } from 'react'
import { LinearGradient } from 'expo-linear-gradient'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { clientesApi, type ClienteSimples } from '../../../lib/api/clientes'
import { theme } from '../../../constants/theme'

export default function ClientesListScreen() {
  const router = useRouter()

  const [clientes, setClientes] = useState<ClienteSimples[]>([])
  const [busca,    setBusca]    = useState('')
  const [buscando, setBuscando] = useState(false)
  const [buscado,  setBuscado]  = useState(false)

  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null)

  function onBuscaChange(q: string) {
    setBusca(q)
    if (debounce.current) clearTimeout(debounce.current)
    if (!q.trim()) { setClientes([]); setBuscado(false); return }
    debounce.current = setTimeout(async () => {
      setBuscando(true)
      try {
        const res = await clientesApi.buscar(q.trim())
        setClientes(Array.isArray(res) ? res : [])
        setBuscado(true)
      } catch {
        setClientes([]); setBuscado(true)
      } finally {
        setBuscando(false)
      }
    }, 400)
  }

  async function refresh() {
    if (!busca.trim()) return
    setBuscando(true)
    try { setClientes(await clientesApi.buscar(busca.trim())) }
    catch { setClientes([]) }
    finally { setBuscando(false) }
  }

  return (
    <LinearGradient colors={[theme.colors.bgGradientTop, theme.colors.bgGradientBottom]} style={styles.gradient}>

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color="rgba(255,255,255,0.6)" />
        </TouchableOpacity>
        <Text style={styles.title}>Clientes</Text>
        <TouchableOpacity onPress={refresh} style={styles.refreshBtn}>
          <Ionicons name="refresh-outline" size={20} color="rgba(255,255,255,0.4)" />
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={styles.searchBox}>
        <Ionicons name="search-outline" size={16} color={theme.colors.textFaint} style={{ marginRight: 8 }} />
        <TextInput
          style={styles.searchInput}
          value={busca}
          onChangeText={onBuscaChange}
          placeholder="Buscar por nome, telefone ou CPF..."
          placeholderTextColor={theme.colors.textFaint}
          returnKeyType="search"
          autoCapitalize="none"
        />
        {busca.length > 0 && (
          <TouchableOpacity onPress={() => onBuscaChange('')} style={{ padding: 4 }}>
            <Ionicons name="close-circle" size={16} color={theme.colors.textFaint} />
          </TouchableOpacity>
        )}
      </View>

      {buscando ? (
        <View style={styles.center}>
          <ActivityIndicator color={theme.colors.accent} size="large" />
        </View>
      ) : !buscado ? (
        <View style={styles.center}>
          <Ionicons name="people-outline" size={48} color="rgba(255,255,255,0.1)" />
          <Text style={styles.hint}>Busque por nome, telefone ou CPF</Text>
        </View>
      ) : clientes.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyText}>Nenhum cliente encontrado</Text>
        </View>
      ) : (
        <FlatList
          data={clientes}
          keyExtractor={c => c.id}
          contentContainerStyle={styles.list}
          keyboardShouldPersistTaps="handled"
          ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
          renderItem={({ item: c }) => (
            <TouchableOpacity
              style={styles.card}
              onPress={() => router.push(`/(app)/clientes/${c.id}`)}
              activeOpacity={0.8}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.nome}>{c.nome}</Text>
                <Text style={styles.sub}>{c.telefone ?? c.cpf ?? '—'}</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={theme.colors.textFaint} />
            </TouchableOpacity>
          )}
        />
      )}

      {/* FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push('/(app)/clientes/novo')}
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
    paddingBottom: theme.spacing.sm,
  },
  backBtn:    { padding: 4, marginRight: 8 },
  title:      { flex: 1, fontSize: 20, fontWeight: '700', color: '#fff' },
  refreshBtn: { padding: 4 },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.md,
    backgroundColor: theme.colors.inputBg,
    borderWidth: 0.5,
    borderColor: theme.colors.inputBorder,
    borderRadius: theme.borderRadius.sm,
    paddingHorizontal: 12,
  },
  searchInput: { flex: 1, paddingVertical: 13, color: theme.colors.text, fontSize: 15 },
  center:    { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  hint:      { color: theme.colors.textMuted, fontSize: 13, textAlign: 'center' },
  emptyText: { color: theme.colors.textMuted, fontSize: 14 },
  list: { paddingHorizontal: theme.spacing.lg, paddingBottom: 100 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.cardBg,
    borderWidth: 0.5,
    borderColor: theme.colors.cardBorder,
    borderRadius: theme.borderRadius.md,
    padding: 14,
    gap: 8,
  },
  nome: { fontSize: 14, fontWeight: '600', color: 'rgba(255,255,255,0.85)' },
  sub:  { fontSize: 12, color: theme.colors.textMuted, marginTop: 2 },
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
