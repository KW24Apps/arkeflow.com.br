import { View, Text, StyleSheet, TouchableOpacity } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { theme } from '../../../../constants/theme'

export default function NovaSacolaScreen() {
  const router = useRouter()
  return (
    <LinearGradient colors={[theme.colors.bgGradientTop, theme.colors.bgGradientBottom]} style={styles.gradient}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color="rgba(255,255,255,0.6)" />
        </TouchableOpacity>
        <Text style={styles.title}>Nova sacola</Text>
        <View style={{ width: 30 }} />
      </View>
      <View style={styles.center}>
        <Ionicons name="construct-outline" size={48} color="rgba(255,255,255,0.15)" />
        <Text style={styles.comingSoon}>Em desenvolvimento</Text>
        <Text style={styles.sub}>O builder de sacolas mobile chegará em breve.</Text>
      </View>
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
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, paddingHorizontal: 32 },
  comingSoon: { fontSize: 16, fontWeight: '600', color: 'rgba(255,255,255,0.5)' },
  sub: { fontSize: 13, color: theme.colors.textMuted, textAlign: 'center', lineHeight: 20 },
})
