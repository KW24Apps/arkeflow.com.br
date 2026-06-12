import {
  View, Text, StyleSheet, TouchableOpacity, Alert,
  LayoutAnimation, Platform, UIManager, ScrollView,
} from 'react-native'
import { useState } from 'react'
import { LinearGradient } from 'expo-linear-gradient'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useAuthStore } from '../../lib/store/auth.store'
import { theme } from '../../constants/theme'

if (Platform.OS === 'android') {
  UIManager.setLayoutAnimationEnabledExperimental?.(true)
}

const CARD_SIZE = 148

export default function HomeScreen() {
  const router = useRouter()
  const { usuario, logout } = useAuthStore()

  const [vendaOpen, setVendaOpen] = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [topBarH, setTopBarH] = useState(108)

  const toggleVendas = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)
    setVendaOpen(prev => !prev)
  }

  const initial = usuario?.nome?.charAt(0).toUpperCase() ?? '?'

  async function handleSair() {
    setDropdownOpen(false)
    await logout()
    router.replace('/(auth)/login')
  }

  return (
    <LinearGradient
      colors={[theme.colors.bgGradientTop, theme.colors.bgGradientBottom]}
      style={styles.gradient}
    >
      <View
        style={styles.topBar}
        onLayout={e => setTopBarH(e.nativeEvent.layout.height)}
      >
        <View style={styles.logoCol}>
          <View style={styles.logoRow}>
            <Text style={styles.logoArke}>ARKE</Text>
            <Text style={styles.logoVest}>vest</Text>
          </View>
          {usuario?.nome ? (
            <Text style={styles.userName}>{usuario.nome}</Text>
          ) : null}
        </View>
        <TouchableOpacity
          style={styles.avatarPill}
          onPress={() => setDropdownOpen(v => !v)}
          activeOpacity={0.8}
        >
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>{initial}</Text>
          </View>
          <Ionicons
            name={dropdownOpen ? 'chevron-up' : 'chevron-down'}
            size={14}
            color="rgba(255,255,255,0.7)"
          />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.sectionLabel}>O que vamos fazer hoje?</Text>

        <View style={styles.grid}>

          {/* Row 1: Vendas — collapsed or expanded full width */}
          <View style={vendaOpen ? styles.gridRowExpanded : styles.gridRowCollapsed}>
            <View style={[
              styles.vendasCard,
              vendaOpen ? styles.vendasCardOpen : styles.vendasCardClosed,
            ]}>
              {vendaOpen ? (
                <View style={styles.expandedFace}>
                  <TouchableOpacity
                    style={styles.vendasHeader}
                    onPress={toggleVendas}
                    activeOpacity={0.8}
                  >
                    <View style={styles.vendasHeaderLeft}>
                      <Ionicons name="bag-handle-outline" size={20} color={theme.colors.accent} />
                      <Text style={styles.vendasHeaderLabel}>VENDAS</Text>
                    </View>
                    <Ionicons name="chevron-up" size={18} color={theme.colors.accent} />
                  </TouchableOpacity>

                  <View style={styles.subGrid}>
                    <TouchableOpacity
                      style={styles.subCard}
                      onPress={() => router.push('/(app)/vendas/sacolas')}
                      activeOpacity={0.75}
                    >
                      <Ionicons name="layers-outline" size={22} color={theme.colors.accent} />
                      <Text style={styles.subLabel} numberOfLines={1}>Sacolas</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.subCard}
                      onPress={() => Alert.alert('Em breve', 'Módulo de provas chegando em breve.')}
                      activeOpacity={0.75}
                    >
                      <Ionicons name="shirt-outline" size={22} color={theme.colors.textMuted} />
                      <Text style={[styles.subLabel, styles.subLabelDim]} numberOfLines={1}>Provas</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.subCard}
                      onPress={() => Alert.alert('Em breve', 'Módulo de relatórios chegando em breve.')}
                      activeOpacity={0.75}
                    >
                      <Ionicons name="bar-chart-outline" size={22} color={theme.colors.textMuted} />
                      <Text style={[styles.subLabel, styles.subLabelDim]} numberOfLines={1}>Relatório</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.collapsedFace}
                  onPress={toggleVendas}
                  activeOpacity={0.8}
                >
                  <Ionicons name="bag-handle-outline" size={32} color="rgba(255,255,255,0.5)" />
                  <Text style={styles.cardLabel}>Vendas</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Row 2: Clientes + Suporte — always side by side */}
          <View style={styles.gridRowCollapsed}>
            <TouchableOpacity
              style={[styles.card, { flex: 1, width: undefined }]}
              onPress={() => Alert.alert('Em breve', 'Módulo de clientes chegando em breve.')}
              activeOpacity={0.8}
            >
              <Ionicons name="people-outline" size={32} color="rgba(255,255,255,0.5)" />
              <Text style={styles.cardLabel}>Clientes</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.card, { flex: 1, width: undefined }]}
              onPress={() => Alert.alert('Em breve', 'Módulo de suporte chegando em breve.')}
              activeOpacity={0.8}
            >
              <Ionicons name="headset-outline" size={32} color="rgba(255,255,255,0.5)" />
              <Text style={styles.cardLabel}>Suporte</Text>
            </TouchableOpacity>
          </View>

        </View>
      </ScrollView>

      {/* Overlay — captures outside tap to close dropdown */}
      {dropdownOpen && (
        <TouchableOpacity
          style={[styles.overlay, { top: topBarH }]}
          onPress={() => setDropdownOpen(false)}
          activeOpacity={1}
        />
      )}

      {/* User dropdown card */}
      {dropdownOpen && (
        <View style={[styles.dropdown, { top: topBarH + 8 }]}>
          <Text style={styles.dropName}>{usuario?.nome ?? '—'}</Text>
          <Text style={styles.dropRole}>{usuario?.nivel ?? '—'}</Text>
          <View style={styles.divider} />
          <TouchableOpacity
            style={styles.dropRow}
            onPress={() => {
              setDropdownOpen(false)
              Alert.alert('Em breve', 'Funcionalidade disponível em breve.')
            }}
            activeOpacity={0.7}
          >
            <Ionicons name="person-outline" size={16} color={theme.colors.textMuted} />
            <Text style={styles.dropRowText}>Meus dados</Text>
          </TouchableOpacity>
          <View style={styles.divider} />
          <TouchableOpacity style={styles.dropRow} onPress={handleSair} activeOpacity={0.7}>
            <Ionicons name="log-out-outline" size={16} color={theme.colors.danger} />
            <Text style={[styles.dropRowText, styles.dropRowDanger]}>Sair</Text>
          </TouchableOpacity>
        </View>
      )}
    </LinearGradient>
  )
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.lg,
    paddingTop: 56,
    paddingBottom: theme.spacing.md,
    zIndex: 20,
  },
  logoCol: { flexDirection: 'column' },
  logoRow: { flexDirection: 'row', alignItems: 'flex-end' },
  logoArke: { fontSize: 22, fontWeight: '800', color: '#fff', letterSpacing: 1.5 },
  logoVest: { fontSize: 22, fontWeight: '800', color: theme.colors.accent, letterSpacing: 1.5 },
  userName: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.45)',
    marginTop: 2,
  },

  avatarPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingLeft: 4,
    paddingRight: 10,
    paddingVertical: 4,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderWidth: 0.5,
    borderColor: theme.colors.accent,
    borderRadius: 20,
  },
  avatarCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: '#fff', fontSize: 13, fontWeight: '700' },

  content: { paddingHorizontal: theme.spacing.lg, paddingBottom: 32 },
  sectionLabel: {
    color: theme.colors.textMuted,
    fontSize: 12,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: theme.spacing.md,
    marginTop: theme.spacing.md,
  },

  grid: { flexDirection: 'column', gap: 12 },

  gridRowCollapsed: {
    flexDirection: 'row',
    gap: 12,
  },
  gridRowExpanded: {
    flexDirection: 'column',
  },

  vendasCard: {
    borderRadius: theme.borderRadius.lg,
    overflow: 'hidden',
  },
  vendasCardClosed: {
    flex: 1,
    height: CARD_SIZE,
    backgroundColor: theme.colors.cardBg,
    borderWidth: 0.5,
    borderColor: theme.colors.cardBorder,
  },
  vendasCardOpen: {
    width: '100%',
    backgroundColor: 'rgba(0,60,140,0.25)',
    borderWidth: 1,
    borderColor: 'rgba(0,150,255,0.3)',
  },

  collapsedFace: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  expandedFace: {
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 14,
  },
  vendasHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 40,
    marginBottom: 12,
  },
  vendasHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  vendasHeaderLabel: {
    color: theme.colors.accent,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 1.5,
  },
  subGrid: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  subCard: {
    flex: 1,
    aspectRatio: 1,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  subLabel: {
    color: theme.colors.accent,
    fontSize: 11,
    fontWeight: '600',
  },
  subLabelDim: { color: theme.colors.textMuted },

  card: {
    width: CARD_SIZE,
    height: CARD_SIZE,
    backgroundColor: theme.colors.cardBg,
    borderWidth: 0.5,
    borderColor: theme.colors.cardBorder,
    borderRadius: theme.borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  cardLabel: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 13,
    fontWeight: '600',
  },

  overlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 5,
  },

  dropdown: {
    position: 'absolute',
    right: theme.spacing.lg,
    zIndex: 10,
    backgroundColor: 'rgba(10, 25, 55, 0.97)',
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.15)',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    minWidth: 200,
  },
  dropName: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 2,
  },
  dropRole: {
    color: theme.colors.textMuted,
    fontSize: 12,
    textTransform: 'capitalize',
    marginBottom: 10,
  },
  divider: {
    height: 0.5,
    backgroundColor: 'rgba(255,255,255,0.1)',
    marginVertical: 8,
  },
  dropRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 6,
  },
  dropRowText: {
    color: theme.colors.text,
    fontSize: 14,
  },
  dropRowDanger: {
    color: theme.colors.danger,
  },
})
