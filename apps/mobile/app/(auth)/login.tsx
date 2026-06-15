import {
  View, Text, TextInput, StyleSheet, KeyboardAvoidingView,
  Platform, TouchableOpacity, ScrollView, Modal,
} from 'react-native'
import { useState } from 'react'
import { LinearGradient } from 'expo-linear-gradient'
import { useRouter } from 'expo-router'
import Constants from 'expo-constants'
import { Button } from '../../components/ui/Button'
import { useAuthStore } from '../../lib/store/auth.store'
import { theme } from '../../constants/theme'

const version = Constants.expoConfig?.version ?? '—'

export default function LoginScreen() {
  const router = useRouter()
  const { login, isLoading, sessaoAtiva, clearSessaoAtiva } = useAuthStore()

  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro,  setErro]  = useState('')
  const [showSessaoModal, setShowSessaoModal] = useState(false)

  async function handleLogin(forcar?: boolean) {
    if (!email.trim() || !senha.trim()) {
      setErro('Preencha e-mail e senha.')
      return
    }
    setErro('')
    try {
      await login(email.trim(), senha, forcar)
      // Store catches 409 internally, sets sessaoAtiva, and returns without throwing.
      // Check synchronous state before navigating.
      if (useAuthStore.getState().sessaoAtiva) {
        setShowSessaoModal(true)
        return
      }
      router.replace('/(app)/')
    } catch (e: any) {
      const msg = e?.response?.data?.error ?? e?.response?.data?.message ?? 'Credenciais inválidas.'
      setErro(msg)
    }
  }

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

      <View style={styles.versionContainer}>
        <Text style={styles.versionText}>v{version}</Text>
      </View>

      <Modal
        visible={showSessaoModal}
        transparent
        animationType="fade"
        onRequestClose={() => { setShowSessaoModal(false); clearSessaoAtiva() }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Sessão ativa</Text>
            <Text style={styles.modalBody}>
              Você já está conectado em outro dispositivo.{'\n'}
              {sessaoAtiva?.ip ? `IP: ${sessaoAtiva.ip}` : ''}{sessaoAtiva?.em ? `\nDesde: ${new Date(sessaoAtiva.em).toLocaleString('pt-BR')}` : ''}
            </Text>
            <Text style={styles.modalBody}>Deseja continuar e encerrar a outra sessão?</Text>
            <View style={styles.modalBtns}>
              <TouchableOpacity
                style={styles.modalBtnCancel}
                onPress={() => { setShowSessaoModal(false); clearSessaoAtiva() }}
              >
                <Text style={styles.modalBtnCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalBtnConfirm}
                onPress={async () => {
                  setShowSessaoModal(false)
                  clearSessaoAtiva()
                  setErro('')
                  try {
                    await login(email.trim(), senha, true)
                    router.replace('/(app)/')
                  } catch (e: any) {
                    const msg = e?.response?.data?.error ?? e?.response?.data?.message ?? 'Credenciais inválidas.'
                    setErro(msg)
                  }
                }}
              >
                <Text style={styles.modalBtnConfirmText}>Entrar mesmo assim</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  versionContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingBottom: 24,
  },
  versionText: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.3)',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  modalCard: {
    backgroundColor: '#0d1f3c',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    borderWidth: 0.5,
    borderColor: 'rgba(0,239,255,0.2)',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.9)',
    marginBottom: 12,
    textAlign: 'center',
  },
  modalBody: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.5)',
    textAlign: 'center',
    marginBottom: 8,
    lineHeight: 20,
  },
  modalBtns: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 20,
  },
  modalBtnCancel: {
    flex: 1,
    padding: 12,
    borderRadius: 10,
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
  },
  modalBtnCancelText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.4)',
  },
  modalBtnConfirm: {
    flex: 1,
    padding: 12,
    borderRadius: 10,
    backgroundColor: 'rgba(0,239,255,0.12)',
    borderWidth: 0.5,
    borderColor: 'rgba(0,239,255,0.35)',
    alignItems: 'center',
  },
  modalBtnConfirmText: {
    fontSize: 13,
    color: '#0ef',
    fontWeight: '600',
  },
})
