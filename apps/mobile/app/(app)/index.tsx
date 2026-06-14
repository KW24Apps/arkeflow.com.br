import {
  View, Text, StyleSheet, TouchableOpacity, Alert,
  ScrollView, useWindowDimensions, Modal,
} from 'react-native'
import { useState, useEffect } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { LinearGradient } from 'expo-linear-gradient'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useAuthStore } from '../../lib/store/auth.store'
import { theme } from '../../constants/theme'

type Submenu = {
  id: string
  label: string
  icon: keyof typeof Ionicons.glyphMap
  route: string
}

type MenuItem = {
  id: string
  label: string
  icon: keyof typeof Ionicons.glyphMap
  route: string | null
  submenus: Submenu[]
}

const menuItems: MenuItem[] = [
  {
    id: 'vendas',
    label: 'Vendas',
    icon: 'bag-handle-outline',
    route: null,
    submenus: [
      { id: 'sacolas',   label: 'Sacolas',   icon: 'layers-outline',    route: '/(app)/vendas/sacolas' },
      { id: 'relatorio', label: 'Relatório', icon: 'bar-chart-outline', route: '/(app)/vendas/relatorio' },
    ],
  },
  {
    id: 'clientes',
    label: 'Clientes',
    icon: 'people-outline',
    route: '/(app)/clientes',
    submenus: [],
  },
]

const LAYOUT_OPTIONS = [
  { cols: 2, label: '2 por linha',  sub: '3 submenus quando expandido' },
  { cols: 3, label: '3 por linha',  sub: '4 submenus quando expandido' },
  { cols: 4, label: '4 por linha',  sub: '5 submenus quando expandido' },
]

function chunkN<T>(arr: T[], n: number): T[][] {
  const result: T[][] = []
  for (let i = 0; i < arr.length; i += n) result.push(arr.slice(i, i + n))
  return result
}

export default function HomeScreen() {
  const router = useRouter()
  const { usuario, logout } = useAuthStore()
  const { width: screenWidth } = useWindowDimensions()

  const [colsMenu,        setColsMenu]        = useState(2)
  const [activeId,        setActiveId]        = useState<string | null>(null)
  const [dropdownOpen,    setDropdownOpen]    = useState(false)
  const [showConfigModal, setShowConfigModal] = useState(false)
  const [topBarH,         setTopBarH]         = useState(108)

  useEffect(() => {
    AsyncStorage.getItem('layout_cols').then(v => {
      if (v) setColsMenu(Number(v))
    })
  }, [])

  function saveLayout(cols: number) {
    setColsMenu(cols)
    AsyncStorage.setItem('layout_cols', String(cols))
  }

  const PADDING      = 20
  const GAP          = 12
  const CARD_PADDING = 14
  const SUBMENU_GAP  = 8
  const colsSubmenu  = colsMenu + 1
  const CARD_SIZE    = (screenWidth - PADDING * 2 - GAP * (colsMenu - 1)) / colsMenu
  const EXPANDED_SIZE = screenWidth - PADDING * 2
  const SUBMENU_SIZE = (EXPANDED_SIZE - CARD_PADDING * 2 - SUBMENU_GAP * (colsSubmenu - 1)) / colsSubmenu

  const initial = usuario?.nome?.charAt(0).toUpperCase() ?? '?'

  async function handleSair() {
    setDropdownOpen(false)
    await logout()
    router.replace('/(auth)/login')
  }

  function onPressMenu(item: MenuItem) {
    if (item.submenus.length > 0) {
      setActiveId(prev => (prev === item.id ? null : item.id))
    } else {
      setActiveId(item.id)
      if (item.route) router.push(item.route as Parameters<typeof router.push>[0])
    }
  }

  function onPressSubmenu(sub: Submenu) {
    router.push(sub.route as Parameters<typeof router.push>[0])
  }

  const activeItem = menuItems.find(m => m.id === activeId && m.submenus.length > 0) ?? null
  const otherItems = activeItem ? menuItems.filter(m => m.id !== activeId) : menuItems

  return (
    <LinearGradient
      colors={[theme.colors.bgGradientTop, theme.colors.bgGradientBottom]}
      style={styles.gradient}
    >
      <View style={styles.topBar} onLayout={e => setTopBarH(e.nativeEvent.layout.height)}>
        <View style={styles.logoCol}>
          <View style={styles.logoRow}>
            <Text style={styles.logoArke}>ARKE</Text>
            <Text style={styles.logoVest}>vest</Text>
          </View>
          {usuario?.nome ? <Text style={styles.userName}>{usuario.nome}</Text> : null}
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

      <ScrollView
        contentContainerStyle={[styles.content, { paddingHorizontal: PADDING }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.sectionLabel}>O que vamos fazer hoje?</Text>
        <View style={styles.grid}>

          {activeItem && (
            <View style={[styles.expandedCard, { width: EXPANDED_SIZE }]}>
              <TouchableOpacity
                style={styles.expandedHeader}
                onPress={() => onPressMenu(activeItem)}
                activeOpacity={0.8}
              >
                <View style={styles.expandedHeaderLeft}>
                  <Ionicons name={activeItem.icon} size={20} color={theme.colors.accent} />
                  <Text style={styles.expandedHeaderLabel}>{activeItem.label.toUpperCase()}</Text>
                </View>
                <Ionicons name="chevron-up" size={18} color={theme.colors.accent} />
              </TouchableOpacity>
              <View style={{ gap: SUBMENU_GAP, marginTop: 8 }}>
                {chunkN(activeItem.submenus, colsSubmenu).map((row, rowIdx) => (
                  <View key={rowIdx} style={[styles.subRow, { gap: SUBMENU_GAP }]}>
                    {row.map(sub => (
                      <TouchableOpacity
                        key={sub.id}
                        style={[styles.subCard, { width: SUBMENU_SIZE, height: SUBMENU_SIZE }]}
                        onPress={() => onPressSubmenu(sub)}
                        activeOpacity={0.75}
                      >
                        <Ionicons name={sub.icon} size={22} color={theme.colors.accent} />
                        <Text style={styles.subLabel} numberOfLines={1}>{sub.label}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                ))}
              </View>
            </View>
          )}

          {chunkN(otherItems, colsMenu).map(row => (
            <View key={row.map(p => p.id).join('-')} style={[styles.gridRow, { gap: GAP }]}>
              {row.map(item => {
                const isActive = activeId === item.id
                return (
                  <TouchableOpacity
                    key={item.id}
                    style={[
                      styles.card,
                      isActive && styles.cardActive,
                      { width: CARD_SIZE, height: CARD_SIZE },
                    ]}
                    onPress={() => onPressMenu(item)}
                    activeOpacity={0.8}
                  >
                    <Ionicons
                      name={item.icon}
                      size={32}
                      color={isActive ? theme.colors.accent : 'rgba(255,255,255,0.5)'}
                    />
                    <Text style={[styles.cardLabel, isActive && styles.cardLabelActive]}>
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                )
              })}
            </View>
          ))}

        </View>
      </ScrollView>

      {dropdownOpen && (
        <TouchableOpacity
          style={[styles.overlay, { top: topBarH }]}
          onPress={() => setDropdownOpen(false)}
          activeOpacity={1}
        />
      )}

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
          <TouchableOpacity
            style={styles.dropRow}
            onPress={() => { setDropdownOpen(false); setShowConfigModal(true) }}
            activeOpacity={0.7}
          >
            <Ionicons name="grid-outline" size={16} color={theme.colors.textMuted} />
            <Text style={styles.dropRowText}>Configurações</Text>
          </TouchableOpacity>
          <View style={styles.divider} />
          <TouchableOpacity style={styles.dropRow} onPress={handleSair} activeOpacity={0.7}>
            <Ionicons name="log-out-outline" size={16} color={theme.colors.danger} />
            <Text style={[styles.dropRowText, styles.dropRowDanger]}>Sair</Text>
          </TouchableOpacity>
        </View>
      )}

      <Modal
        visible={showConfigModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowConfigModal(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={StyleSheet.absoluteFillObject}
            onPress={() => setShowConfigModal(false)}
            activeOpacity={1}
          />
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Layout da tela inicial</Text>
            {LAYOUT_OPTIONS.map(opt => (
              <TouchableOpacity
                key={opt.cols}
                style={styles.modalRow}
                onPress={() => { saveLayout(opt.cols); setShowConfigModal(false) }}
                activeOpacity={0.7}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.modalRowLabel}>{opt.label}</Text>
                  <Text style={styles.modalRowSub}>{opt.sub}</Text>
                </View>
                {colsMenu === opt.cols && (
                  <Ionicons name="checkmark-circle" size={20} color={theme.colors.accent} />
                )}
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              style={styles.modalClose}
              onPress={() => setShowConfigModal(false)}
              activeOpacity={0.7}
            >
              <Text style={styles.modalCloseText}>Fechar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </LinearGradient>
  )
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },

  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 56,
    paddingBottom: theme.spacing.md,
    zIndex: 20,
  },
  logoCol: { flexDirection: 'column' },
  logoRow: { flexDirection: 'row', alignItems: 'flex-end' },
  logoArke: { fontSize: 22, fontWeight: '800', color: '#fff', letterSpacing: 1.5 },
  logoVest: { fontSize: 22, fontWeight: '800', color: theme.colors.accent, letterSpacing: 1.5 },
  userName: { fontSize: 13, color: 'rgba(255,255,255,0.45)', marginTop: 2 },

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

  content: { paddingBottom: 32 },
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

  gridRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },

  card: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: theme.borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  cardActive: {
    backgroundColor: 'rgba(0,239,255,0.08)',
    borderColor: 'rgba(0,239,255,0.45)',
    borderWidth: 1,
  },
  cardLabel: { color: 'rgba(255,255,255,0.6)', fontSize: 13, fontWeight: '600' },
  cardLabelActive: { color: theme.colors.accent },

  expandedCard: {
    backgroundColor: 'rgba(0,239,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(0,239,255,0.45)',
    borderRadius: theme.borderRadius.lg,
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 14,
  },
  expandedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 40,
    marginBottom: 12,
  },
  expandedHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  expandedHeaderLabel: {
    color: theme.colors.accent,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 1.5,
  },

  subRow: { flexDirection: 'row' },
  subCard: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  subLabel: { color: theme.colors.accent, fontSize: 11, fontWeight: '600' },

  overlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 5,
  },
  dropdown: {
    position: 'absolute',
    right: 20,
    zIndex: 10,
    backgroundColor: 'rgba(10, 25, 55, 0.97)',
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.15)',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    minWidth: 200,
  },
  dropName: { color: '#fff', fontSize: 15, fontWeight: '700', marginBottom: 2 },
  dropRole: { color: theme.colors.textMuted, fontSize: 12, textTransform: 'capitalize', marginBottom: 10 },
  divider: { height: 0.5, backgroundColor: 'rgba(255,255,255,0.1)', marginVertical: 8 },
  dropRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6 },
  dropRowText: { color: theme.colors.text, fontSize: 14 },
  dropRowDanger: { color: theme.colors.danger },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCard: {
    width: 320,
    backgroundColor: 'rgba(10, 20, 50, 0.98)',
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.15)',
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 16,
  },
  modalTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 16,
  },
  modalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderTopWidth: 0.5,
    borderTopColor: 'rgba(255,255,255,0.08)',
  },
  modalRowLabel: { fontSize: 14, fontWeight: '600', color: '#fff' },
  modalRowSub:   { fontSize: 12, color: theme.colors.textMuted, marginTop: 2 },
  modalClose: {
    marginTop: 12,
    paddingVertical: 12,
    borderTopWidth: 0.5,
    borderTopColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
  },
  modalCloseText: { fontSize: 14, color: theme.colors.textMuted },
})
