import {
  View, Text, StyleSheet, TouchableOpacity, Alert,
  Animated, ScrollView,
} from 'react-native'
import { useRef, useState } from 'react'
import { LinearGradient } from 'expo-linear-gradient'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useAuthStore } from '../../lib/store/auth.store'
import { theme } from '../../constants/theme'

const CARD_SIZE = 148
const EXPANDED_HEIGHT = 178

export default function HomeScreen() {
  const router = useRouter()
  const { usuario, logout } = useAuthStore()

  const [vendaOpen, setVendaOpen] = useState(false)
  const expandAnim = useRef(new Animated.Value(0)).current

  const openVendas = () => {
    setVendaOpen(true)
    Animated.spring(expandAnim, {
      toValue: 1,
      useNativeDriver: false,
      bounciness: 5,
    }).start()
  }

  const closeVendas = () => {
    Animated.spring(expandAnim, {
      toValue: 0,
      useNativeDriver: false,
      bounciness: 2,
    }).start(() => setVendaOpen(false))
  }

  const cardHeight = expandAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [CARD_SIZE, EXPANDED_HEIGHT],
  })

  const initial = usuario?.nome?.charAt(0).toUpperCase() ?? '?'

  function handleAvatar() {
    Alert.alert(
      usuario?.nome ?? 'Usuário',
      '',
      [
        { text: 'Meus dados', style: 'default', onPress: () => Alert.alert('Em breve') },
        {
          text: 'Sair',
          style: 'destructive',
          onPress: () => { logout(); router.replace('/(auth)/login') },
        },
        { text: 'Cancelar', style: 'cancel' },
      ]
    )
  }

  return (
    <LinearGradient
      colors={[theme.colors.bgGradientTop, theme.colors.bgGradientBottom]}
      style={styles.gradient}
    >
      <View style={styles.topBar}>
        <View style={styles.logoRow}>
          <Text style={styles.logoArke}>ARKE</Text>
          <Text style={styles.logoVest}>vest</Text>
        </View>
        <TouchableOpacity style={styles.avatarPill} onPress={handleAvatar} activeOpacity={0.8}>
          <Text style={styles.avatarText}>{initial}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.sectionLabel}>O que vamos fazer hoje?</Text>

        <View style={styles.grid}>

          {/* Vendas card — collapses to CARD_SIZE, expands to full width */}
          <Animated.View style={[
            styles.vendasCard,
            vendaOpen ? styles.vendasCardOpen : styles.vendasCardClosed,
            { height: cardHeight },
          ]}>
            {vendaOpen ? (
              <View style={styles.expandedFace}>
                {/* Header — tap to collapse */}
                <TouchableOpacity
                  style={styles.vendasHeader}
                  onPress={closeVendas}
                  activeOpacity={0.8}
                >
                  <View style={styles.vendasHeaderLeft}>
                    <Ionicons name="bag-handle-outline" size={20} color={theme.colors.accent} />
                    <Text style={styles.vendasHeaderLabel}>VENDAS</Text>
                  </View>
                  <Ionicons name="chevron-up" size={18} color={theme.colors.accent} />
                </TouchableOpacity>

                {/* Sub-cards: Sacolas / Provas / Relatório */}
                <View style={styles.subGrid}>
                  <TouchableOpacity
                    style={styles.subCard}
                    onPress={() => router.push('/(app)/vendas/sacolas')}
                    activeOpacity={0.75}
                  >
                    <Ionicons name="layers-outline" size={22} color={theme.colors.accent} />
                    <Text style={styles.subLabel}>Sacolas</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.subCard}
                    onPress={() => Alert.alert('Em breve', 'Módulo de provas chegando em breve.')}
                    activeOpacity={0.75}
                  >
                    <Ionicons name="shirt-outline" size={22} color={theme.colors.textMuted} />
                    <Text style={[styles.subLabel, styles.subLabelDim]}>Provas</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.subCard}
                    onPress={() => Alert.alert('Em breve', 'Módulo de relatórios chegando em breve.')}
                    activeOpacity={0.75}
                  >
                    <Ionicons name="bar-chart-outline" size={22} color={theme.colors.textMuted} />
                    <Text style={[styles.subLabel, styles.subLabelDim]}>Relatório</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.collapsedFace}
                onPress={openVendas}
                activeOpacity={0.8}
              >
                <Ionicons name="bag-handle-outline" size={32} color="rgba(255,255,255,0.5)" />
                <Text style={styles.cardLabel}>Vendas</Text>
              </TouchableOpacity>
            )}
          </Animated.View>

          {/* Clientes card — always visible, below Vendas when expanded */}
          <TouchableOpacity
            style={styles.card}
            onPress={() => {
              if (vendaOpen) closeVendas()
              Alert.alert('Em breve', 'Módulo de clientes chegando em breve.')
            }}
            activeOpacity={0.8}
          >
            <Ionicons name="people-outline" size={32} color="rgba(255,255,255,0.5)" />
            <Text style={styles.cardLabel}>Clientes</Text>
          </TouchableOpacity>

        </View>
      </ScrollView>
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
  },
  logoRow: { flexDirection: 'row', alignItems: 'flex-end' },
  logoArke: { fontSize: 22, fontWeight: '800', color: '#fff', letterSpacing: 1.5 },
  logoVest: { fontSize: 22, fontWeight: '800', color: theme.colors.accent, letterSpacing: 1.5 },
  avatarPill: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: '#fff', fontSize: 15, fontWeight: '700' },
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

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },

  // Vendas animated card
  vendasCard: {
    borderRadius: theme.borderRadius.lg,
    overflow: 'hidden',
  },
  vendasCardClosed: {
    width: CARD_SIZE,
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
    flex: 1,
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
  },
  subCard: {
    flex: 1,
    height: 96,
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

  // Clientes (and any future same-row card)
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
})
