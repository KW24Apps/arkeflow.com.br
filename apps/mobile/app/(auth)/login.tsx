import {
  View, Text, TextInput, StyleSheet, KeyboardAvoidingView,
  Platform, TouchableOpacity, ScrollView, Alert,
} from 'react-native'
import { useState, useEffect, useCallback } from 'react'
import { LinearGradient } from 'expo-linear-gradient'
import { useRouter } from 'expo-router'
import { Button } from '../../components/ui/Button'
import { useAuthStore } from '../../lib/store/auth.store'
import { theme } from '../../constants/theme'

export default function LoginScreen() {
  const router = useRouter()
  const { login, isLoading, sessaoAtiva, clearSessaoAtiva } = useAuthStore()

  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro,  setErro]  = useState('')

  async function handleLogin(forcar?: boolean) {
    if (!email.trim() || !senha.trim()) {
      setErro('Preencha e-mail e senha.')
      return
    }
    setErro('')
    try {
      await login(email.trim(), senha, forcar)
      router.replace('/(app)/')
    } catch (e: any) {
      const msg = e?.response?.data?.error ?? e?.response?.data?.message ?? 'Credenciais inválidas.'
      setErro(msg)
    }
  }

  const handleForcar = useCallback(async () => {
    clearSessaoAtiva()
    setErro('')
    try {
      await login(email.trim(), senha, true)
      router.replace('/(app)/')
    } catch (e: any) {
      const msg = e?.response?.data?.error ?? e?.response?.data?.message ?? 'Credenciais inválidas.'
      setErro(msg)
    }
  }, [email, senha, login, clearSessaoAtiva, router])

  useEffect(() => {
    if (!sessaoAtiva) return
    const em = sessaoAtiva.em
      ? new Date(sessaoAtiva.em).toLocaleString('pt-BR')
      : '—'
    const ip = sessaoAtiva.ip ?? '—'
    Alert.alert(
      'Sessão ativa',
      `Você já está conectado em outro dispositivo.\nIP: ${ip} · Desde: ${em}\n\nDeseja continuar?`,
      [
        { text: 'Cancelar', style: 'cancel', onPress: clearSessaoAtiva },
        { text: 'Entrar mesmo assim', style: 'destructive', onPress: handleForcar },
      ],
      { cancelable: true, onDismiss: clearSessaoAtiva }
    )
  }, [sessaoAtiva])

  return (
    <LinearGradient
      colors={[theme.colors.bgGradientTop, theme.colors.bgGradientBottom]}
      style={styles.gradient}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Logo */}
          <View style={styles.logoRow}>
            <Text style={styles.logoArke}>ARKE</Text>
            <Text style={styles.logoVest}>vest</Text>
          </View>
          <Text style={styles.subtitle}>Gestão de sacolas e vendas</Text>

          {/* Form */}
          <View style={styles.form}>
            <Text style={styles.label}>E-mail</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="seu@email.com"
              placeholderTextColor={theme.colors.textFaint}
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
              returnKeyType="next"
            />

            <Text style={[styles.label, { marginTop: theme.spacing.md }]}>Senha</Text>
            <TextInput
              style={styles.input}
              value={senha}
              onChangeText={setSenha}
              placeholder="••••••••"
              placeholderTextColor={theme.colors.textFaint}
              secureTextEntry
              autoComplete="password"
              returnKeyType="done"
              onSubmitEditing={() => handleLogin()}
            />

            {erro ? <Text style={styles.erro}>{erro}</Text> : null}

            <Button
              label="Entrar"
              onPress={() => handleLogin()}
              loading={isLoading}
              style={styles.btn}
            />

            <TouchableOpacity disabled style={styles.forgotRow}>
              <Text style={styles.forgotText}>Esqueci minha senha</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  )
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  flex: { flex: 1 },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 28,
    paddingBottom: 40,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    marginBottom: 6,
  },
  logoArke: {
    fontSize: 42,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 2,
  },
  logoVest: {
    fontSize: 42,
    fontWeight: '800',
    color: theme.colors.accent,
    letterSpacing: 2,
  },
  subtitle: {
    textAlign: 'center',
    color: theme.colors.textMuted,
    fontSize: 13,
    marginBottom: 40,
    letterSpacing: 0.3,
  },
  form: { width: '100%' },
  label: {
    color: theme.colors.textMuted,
    fontSize: 12,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  input: {
    backgroundColor: theme.colors.inputBg,
    borderWidth: 0.5,
    borderColor: theme.colors.inputBorder,
    borderRadius: theme.borderRadius.sm,
    paddingHorizontal: 14,
    paddingVertical: 13,
    color: theme.colors.text,
    fontSize: 15,
  },
  erro: {
    color: theme.colors.danger,
    fontSize: 13,
    marginTop: 10,
    textAlign: 'center',
  },
  btn: { marginTop: 20 },
  forgotRow: { alignItems: 'center', marginTop: 16 },
  forgotText: { color: theme.colors.textFaint, fontSize: 13 },
})
