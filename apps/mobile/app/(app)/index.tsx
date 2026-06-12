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

const EXPAND_HEIGHT = 128

export default function HomeScreen() {
  const router = useRouter()
  const { usuario, logout } = useAuthStore()

  const [vendaOpen, setVendaOpen] = useState(false)
  const expandAnim = useRef(new Animated.Value(0)).current

  const toggleVenda = () => {
    Animated.spring(expandAnim, {
      toValue: vendaOpen ? 0 : 1,
      useNativeDriver: false,
      bounciness: 4,
    }).start()
    setVendaOpen(v => !v)
  }

  const expandHeight = expandAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, EXPAND_HEIGHT],
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
          onPress: () => {
            logout()
            router.replace('/(auth)/login')
          },
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
      {/* TopBar */}
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

        {/* Cards grid */}
        <View style={styles.grid}>

          {/* Vendas card — expandable */}
          <View style={styles.cardWrapper}>
            <TouchableOpacity
              style={[styles.card, vendaOpen && styles.cardActive]}
              onPress={toggleVenda}
              activeOpacity={0.8}
            >
              <Ionicons
                name="bag-handle-outline"
                size={32}
                color={vendaOpen ? theme.colors.accent : 'rgba(255,255,255,0.5)'}
              />
              <Text style={[styles.cardLabel, vendaOpen && styles.cardLabelActive]}>Vendas</Text>
              <Ionicons
                name={vendaOpen ? 'chevron-up' : 'chevron-down'}
                size={14}
                color={vendaOpen ? theme.colors.accent : theme.colors.textFaint}
                style={styles.chevron}
              />
            </TouchableOpacity>

            {/* Sub-cards */}
            <Animated.View style={[styles.subCards, { height: expandHeight, overflow: 'hidden' }]}>
              <View style={styles.subRow}>
                <TouchableOpacity
                  style={styles.subCard}
                  onPress={() => router.push('/(app)/vendas/sacolas')}
                  activeOpacity={0.8}
                >
                  <Ionicons name="layers-outline" size={20} color={theme.colors.accent} />
                  <Text style={styles.subLabel}>Sacolas</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.subCard}
                  onPress={() => Alert.alert('Em breve', 'Módulo de provas chegando em breve.')}
                  activeOpacity={0.8}
                >
                  <Ionicons name="shirt-outline" size={20} color={theme.colors.textMuted} />
                  <Text style={[styles.subLabel, { color: theme.colors.textMuted }]}>Provas</Text>
                </TouchableOpacity>
              </View>
            </Animated.View>
          </View>

          {/* Clientes card */}
          <TouchableOpacity
            style={styles.card}
            onPress={() => Alert.alert('Em breve', 'Módulo de clientes chegando em breve.')}
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

const CARD_SIZE = 148

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
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  cardWrapper: { flexDirection: 'column' },
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
  cardActive: {
    backgroundColor: 'rgba(0,200,255,0.07)',
    borderColor: 'rgba(0,200,255,0.25)',
  },
  cardLabel: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 13,
    fontWeight: '600',
  },
  cardLabelActive: { color: theme.colors.accent },
  chevron: { position: 'absolute', bottom: 10 },
  subCards: {
    width: CARD_SIZE,
  },
  subRow: {
    flexDirection: 'row',
    gap: 6,
    paddingTop: 8,
  },
  subCard: {
    flex: 1,
    height: CARD_SIZE * 0.7,
    backgroundColor: theme.colors.cardBg,
    borderWidth: 0.5,
    borderColor: theme.colors.cardBorder,
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
})
