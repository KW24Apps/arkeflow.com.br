import { TouchableOpacity, Text, ActivityIndicator, StyleSheet, ViewStyle } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { theme } from '../../constants/theme'

interface Props {
  label: string
  onPress: () => void
  loading?: boolean
  disabled?: boolean
  variant?: 'primary' | 'outline'
  style?: ViewStyle
}

export function Button({ label, onPress, loading = false, disabled = false, variant = 'primary', style }: Props) {
  const isDisabled = disabled || loading

  if (variant === 'outline') {
    return (
      <TouchableOpacity
        onPress={onPress}
        disabled={isDisabled}
        style={[styles.base, styles.outline, isDisabled && styles.disabled, style]}
        activeOpacity={0.7}
      >
        <Text style={[styles.outlineText, isDisabled && styles.disabledText]}>
          {loading ? '…' : label}
        </Text>
      </TouchableOpacity>
    )
  }

  return (
    <TouchableOpacity onPress={onPress} disabled={isDisabled} activeOpacity={0.85} style={[styles.base, style]}>
      <LinearGradient
        colors={isDisabled ? ['rgba(0,85,255,0.4)', 'rgba(0,170,255,0.4)'] : [theme.colors.primary, theme.colors.primaryLight]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.gradient}
      >
        {loading
          ? <ActivityIndicator color="#fff" size="small" />
          : <Text style={styles.primaryText}>{label}</Text>
        }
      </LinearGradient>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  base: {
    borderRadius: theme.borderRadius.md,
    overflow: 'hidden',
  },
  gradient: {
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  outline: {
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  outlineText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 15,
    fontWeight: '500',
  },
  disabled: { opacity: 0.5 },
  disabledText: { opacity: 0.5 },
})
