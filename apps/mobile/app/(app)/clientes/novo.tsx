import {
  View, Text, TextInput, StyleSheet, TouchableOpacity,
  ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, Modal,
} from 'react-native'
import { useState, useEffect } from 'react'
import { LinearGradient } from 'expo-linear-gradient'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { clientesApi, getCadastroCfg } from '../../../lib/api/clientes'
import { theme } from '../../../constants/theme'

type Aba = 'dados' | 'endereco' | 'medidas'

const MEDIDAS_OPCOES = [
  'Cintura (Cós)',
  'Comprimento da Manga',
  'Comprimento Total',
  'Coxa',
  'Gancho (Cavalo)',
  'Largura da Barra / Punho',
  'Ombro a Ombro',
  'Quadril',
  'Tórax / Busto',
]

function fmtPhone(v: string) {
  const d = v.replace(/\D/g, '').slice(0, 11)
  if (!d) return ''
  if (d.length <= 2)  return `(${d}`
  if (d.length <= 7)  return `(${d.slice(0,2)}) ${d.slice(2)}`
  if (d.length <= 10) return `(${d.slice(0,2)}) ${d.slice(2,6)}-${d.slice(6)}`
  return `(${d.slice(0,2)}) ${d.slice(2,7)}-${d.slice(7)}`
}

function fmtCPF(v: string) {
  const d = v.replace(/\D/g, '').slice(0, 11)
  if (d.length <= 3) return d
  if (d.length <= 6) return `${d.slice(0,3)}.${d.slice(3)}`
  if (d.length <= 9) return `${d.slice(0,3)}.${d.slice(3,6)}.${d.slice(6)}`
  return `${d.slice(0,3)}.${d.slice(3,6)}.${d.slice(6,9)}-${d.slice(9)}`
}

function fmtCEP(v: string) {
  const d = v.replace(/\D/g, '').slice(0, 8)
  return d.length > 5 ? `${d.slice(0,5)}-${d.slice(5)}` : d
}

type CadastroCfg = { exige_cpf: boolean; exige_email: boolean; exige_endereco: boolean }

export default function ClienteNovoScreen() {
  const router = useRouter()

  const [aba,      setAba]      = useState<Aba>('dados')
  const [salvando, setSalvando] = useState(false)
  const [erro,     setErro]     = useState('')

  const [cadastroCfg, setCadastroCfg] = useState<CadastroCfg | null>(null)

  // Dados
  const [nome,     setNome]     = useState('')
  const [telefone, setTelefone] = useState('')
  const [cpf,      setCpf]      = useState('')
  const [email,    setEmail]    = useState('')

  // Endereço
  const [cep,         setCep]         = useState('')
  const [logradouro,  setLogradouro]  = useState('')
  const [numero,      setNumero]      = useState('')
  const [bairro,      setBairro]      = useState('')
  const [cidade,      setCidade]      = useState('')
  const [estado,      setEstado]      = useState('')
  const [buscandoCep, setBuscandoCep] = useState(false)

  // Medidas
  const [medidasJson,  setMedidasJson]  = useState<Record<string, string>>({})
  const [modalVisible, setModalVisible] = useState(false)
  const [medidaTipo,   setMedidaTipo]   = useState<string | null>(null)
  const [medidaValor,  setMedidaValor]  = useState('')

  useEffect(() => {
    getCadastroCfg().then(setCadastroCfg).catch(console.error)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function buscarCep(raw: string) {
    setBuscandoCep(true)
    try {
      const res = await fetch(`https://viacep.com.br/ws/${raw}/json/`)
      const json = await res.json()
      if (!json.erro) {
        setLogradouro(json.logradouro || '')
        setBairro(json.bairro || '')
        setCidade(json.localidade || '')
        setEstado(json.uf || '')
      }
    } catch { /* silent */ }
    finally { setBuscandoCep(false) }
  }

  function onCepChange(v: string) {
    const formatted = fmtCEP(v)
    setCep(formatted)
    if (v.replace(/\D/g, '').length === 8) buscarCep(v.replace(/\D/g, ''))
  }

  function addMedida() {
    if (!medidaTipo || !medidaValor.trim()) return
    setMedidasJson(prev => ({ ...prev, [medidaTipo]: medidaValor.trim() }))
    setMedidaTipo(null)
    setMedidaValor('')
    setModalVisible(false)
  }

  function removeMedida(key: string) {
    setMedidasJson(prev => {
      const next = { ...prev }
      delete next[key]
      return next
    })
  }

  async function handleSalvar() {
    if (!nome.trim()) { setErro('Nome é obrigatório.'); return }
    if (cadastroCfg?.exige_cpf && !cpf.trim())     { setErro('CPF é obrigatório conforme configuração da loja.'); return }
    if (cadastroCfg?.exige_email && !email.trim())  { setErro('E-mail é obrigatório conforme configuração da loja.'); return }
    if (cadastroCfg?.exige_endereco && !cep.trim()) { setErro('Endereço (CEP) é obrigatório conforme configuração da loja.'); return }
    if (salvando) return
    setSalvando(true); setErro('')
    try {
      await clientesApi.criar({
        nome:        nome.trim(),
        telefone:    telefone    || null,
        cpf:         cpf         || null,
        email:       email       || null,
        cep:         cep         || null,
        logradouro:  logradouro  || null,
        numero:      numero      || null,
        bairro:      bairro      || null,
        cidade:      cidade      || null,
        estado:      estado      || null,
        medidas_json: Object.keys(medidasJson).length > 0 ? medidasJson : null,
      })
      router.back()
    } catch {
      setErro('Erro ao criar cliente. Tente novamente.')
      setSalvando(false)
    }
  }

  return (
    <LinearGradient colors={[theme.colors.bgGradientTop, theme.colors.bgGradientBottom]} style={styles.gradient}>

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color="rgba(255,255,255,0.6)" />
        </TouchableOpacity>
        <Text style={styles.title}>Novo cliente</Text>
        <View style={{ width: 30 }} />
      </View>

      {/* Tab pills */}
      <View style={styles.tabRow}>
        {(['dados', 'endereco', 'medidas'] as Aba[]).map(tab => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, aba === tab && styles.tabActive]}
            onPress={() => { setErro(''); setAba(tab) }}
          >
            <Text style={[styles.tabText, aba === tab && styles.tabTextActive]}>
              {tab === 'dados' ? 'Dados' : tab === 'endereco' ? 'Endereço' : 'Medidas'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.form}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >

          {/* ── Dados ── */}
          {aba === 'dados' && (<>
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Nome *</Text>
              <TextInput style={styles.input} value={nome} onChangeText={setNome}
                placeholder="Nome completo" placeholderTextColor={theme.colors.textFaint}
                autoFocus />
            </View>
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Telefone</Text>
              <TextInput style={styles.input} value={telefone}
                onChangeText={v => setTelefone(fmtPhone(v))}
                placeholder="(XX) XXXXX-XXXX" placeholderTextColor={theme.colors.textFaint}
                keyboardType="phone-pad" />
            </View>
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>
                CPF{cadastroCfg?.exige_cpf ? ' *' : ''}
              </Text>
              <TextInput style={styles.input} value={cpf}
                onChangeText={v => setCpf(fmtCPF(v))}
                placeholder="000.000.000-00" placeholderTextColor={theme.colors.textFaint}
                keyboardType="numeric" />
            </View>
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>
                E-mail{cadastroCfg?.exige_email ? ' *' : ''}
              </Text>
              <TextInput style={styles.input} value={email} onChangeText={setEmail}
                placeholder="email@exemplo.com" placeholderTextColor={theme.colors.textFaint}
                keyboardType="email-address" autoCapitalize="none" />
            </View>
          </>)}

          {/* ── Endereço ── */}
          {aba === 'endereco' && (<>
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>
                CEP{cadastroCfg?.exige_endereco ? ' *' : ''}
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <TextInput style={[styles.input, { flex: 1 }]} value={cep}
                  onChangeText={onCepChange}
                  placeholder="00000-000" placeholderTextColor={theme.colors.textFaint}
                  keyboardType="numeric" />
                {buscandoCep && <ActivityIndicator size="small" color={theme.colors.accent} />}
              </View>
            </View>
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Logradouro</Text>
              <TextInput style={styles.input} value={logradouro} onChangeText={setLogradouro}
                placeholder="Rua, Av., etc." placeholderTextColor={theme.colors.textFaint} />
            </View>
            <View style={{ flexDirection: 'row', gap: 10, marginBottom: 14 }}>
              <View style={{ flex: 2 }}>
                <Text style={styles.fieldLabel}>Número</Text>
                <TextInput style={styles.input} value={numero} onChangeText={setNumero}
                  placeholder="123" placeholderTextColor={theme.colors.textFaint}
                  keyboardType="numeric" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.fieldLabel}>Estado</Text>
                <TextInput style={styles.input} value={estado}
                  onChangeText={v => setEstado(v.toUpperCase().slice(0, 2))}
                  placeholder="SP" placeholderTextColor={theme.colors.textFaint}
                  autoCapitalize="characters" maxLength={2} />
              </View>
            </View>
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Bairro</Text>
              <TextInput style={styles.input} value={bairro} onChangeText={setBairro}
                placeholder="Bairro" placeholderTextColor={theme.colors.textFaint} />
            </View>
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Cidade</Text>
              <TextInput style={styles.input} value={cidade} onChangeText={setCidade}
                placeholder="Cidade" placeholderTextColor={theme.colors.textFaint} />
            </View>
          </>)}

          {/* ── Medidas ── */}
          {aba === 'medidas' && (<>
            {Object.keys(medidasJson).length === 0 && (
              <Text style={styles.emptyMedidas}>Nenhuma medida cadastrada.</Text>
            )}
            {Object.entries(medidasJson).map(([key, val]) => (
              <View key={key} style={styles.medidaCard}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.medidaLabel}>{key.toUpperCase()}</Text>
                  <Text style={styles.medidaVal}>{val}</Text>
                </View>
                <TouchableOpacity onPress={() => removeMedida(key)} style={{ padding: 4 }}>
                  <Ionicons name="close-circle-outline" size={20} color="rgba(255,100,100,0.55)" />
                </TouchableOpacity>
              </View>
            ))}
            <TouchableOpacity
              style={styles.addMedidaBtn}
              onPress={() => { setMedidaTipo(null); setMedidaValor(''); setModalVisible(true) }}
            >
              <Text style={styles.addMedidaText}>＋ Adicionar medida</Text>
            </TouchableOpacity>
          </>)}

        </ScrollView>

        {/* Error */}
        {erro ? <Text style={styles.erroText}>{erro}</Text> : null}

        {/* Bottom save bar */}
        <View style={styles.bottomBar}>
          <TouchableOpacity
            style={[styles.salvarBtn, salvando && styles.salvarBtnDisabled]}
            onPress={handleSalvar}
            disabled={salvando}
            activeOpacity={0.8}
          >
            {salvando
              ? <ActivityIndicator size="small" color="#0a0a1a" />
              : <Text style={styles.salvarText}>Criar cliente</Text>
            }
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* Medidas modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setModalVisible(false)}>
          <TouchableOpacity style={styles.modalBox} activeOpacity={1} onPress={() => {}}>

            {medidaTipo === null ? (
              <>
                <Text style={styles.modalTitle}>Escolha a medida</Text>
                <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 360 }}>
                  {MEDIDAS_OPCOES.map((op, idx) => (
                    <TouchableOpacity
                      key={op}
                      style={[styles.opcaoRow, idx > 0 && styles.opcaoSep]}
                      onPress={() => setMedidaTipo(op)}
                    >
                      <Text style={styles.opcaoText}>{op}</Text>
                      <Ionicons name="chevron-forward" size={14} color={theme.colors.textFaint} />
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </>
            ) : (
              <>
                <TouchableOpacity style={styles.modalBack} onPress={() => setMedidaTipo(null)}>
                  <Ionicons name="chevron-back" size={18} color={theme.colors.textMuted} />
                  <Text style={styles.modalBackText}>Voltar</Text>
                </TouchableOpacity>
                <Text style={styles.modalTitle}>{medidaTipo}</Text>
                <TextInput
                  style={[styles.input, { marginTop: 12 }]}
                  value={medidaValor}
                  onChangeText={setMedidaValor}
                  placeholder="Ex: 96cm"
                  placeholderTextColor={theme.colors.textFaint}
                  autoFocus
                  onSubmitEditing={addMedida}
                  returnKeyType="done"
                />
                <TouchableOpacity
                  style={[styles.modalOkBtn, !medidaValor.trim() && styles.salvarBtnDisabled]}
                  onPress={addMedida}
                  disabled={!medidaValor.trim()}
                >
                  <Text style={styles.salvarText}>OK</Text>
                </TouchableOpacity>
              </>
            )}

          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

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
  backBtn: { padding: 4, marginRight: 8 },
  title:   { flex: 1, fontSize: 20, fontWeight: '700', color: '#fff' },

  tabRow: {
    flexDirection: 'row',
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.sm,
    gap: 8,
  },
  tab:           { flex: 1, paddingVertical: 8, borderRadius: theme.borderRadius.full, alignItems: 'center', borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.15)' },
  tabActive:     { backgroundColor: theme.colors.accent, borderColor: theme.colors.accent },
  tabText:       { fontSize: 13, fontWeight: '600', color: theme.colors.textMuted },
  tabTextActive: { color: '#0a0a1a' },

  form:       { padding: theme.spacing.lg, paddingBottom: 24 },
  fieldGroup: { marginBottom: 14 },
  fieldLabel: {
    fontSize: 11, fontWeight: '500', color: theme.colors.textMuted,
    textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 6,
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

  emptyMedidas: { color: theme.colors.textMuted, fontSize: 13, marginBottom: 16 },
  medidaCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: theme.colors.cardBg,
    borderWidth: 0.5, borderColor: theme.colors.cardBorder,
    borderRadius: theme.borderRadius.md,
    padding: 12, marginBottom: 8, gap: 8,
  },
  medidaLabel: { fontSize: 10, color: theme.colors.textMuted, letterSpacing: 0.8 },
  medidaVal:   { fontSize: 15, fontWeight: '600', color: '#fff', marginTop: 2 },
  addMedidaBtn: {
    paddingVertical: 12, alignItems: 'center',
    borderWidth: 1, borderStyle: 'dashed', borderColor: 'rgba(0,200,255,0.35)',
    borderRadius: theme.borderRadius.sm, marginTop: 8,
  },
  addMedidaText: { color: theme.colors.accent, fontSize: 14, fontWeight: '500' },

  erroText: {
    color: theme.colors.danger, fontSize: 12, textAlign: 'center',
    paddingHorizontal: theme.spacing.lg, paddingBottom: 6,
  },

  bottomBar: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.sm,
    paddingBottom: Platform.OS === 'ios' ? 30 : theme.spacing.md,
    borderTopWidth: 0.5,
    borderTopColor: 'rgba(255,255,255,0.09)',
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  salvarBtn:         { backgroundColor: theme.colors.accent, paddingVertical: 14, borderRadius: theme.borderRadius.md, alignItems: 'center' },
  salvarBtnDisabled: { opacity: 0.35 },
  salvarText:        { fontSize: 14, fontWeight: '700', color: '#0a0a1a' },

  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'flex-end', padding: 16,
    paddingBottom: Platform.OS === 'ios' ? 32 : 16,
  },
  modalBox: {
    backgroundColor: '#0d1f3c', borderRadius: theme.borderRadius.xl,
    borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.12)', padding: 20,
  },
  modalTitle:    { fontSize: 16, fontWeight: '700', color: '#fff', marginBottom: 16 },
  modalBack:     { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 12 },
  modalBackText: { color: theme.colors.textMuted, fontSize: 13 },
  opcaoRow:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, gap: 8 },
  opcaoSep:      { borderTopWidth: 0.5, borderTopColor: 'rgba(255,255,255,0.07)' },
  opcaoText:     { fontSize: 14, color: 'rgba(255,255,255,0.85)', flex: 1 },
  modalOkBtn:    { backgroundColor: theme.colors.accent, paddingVertical: 13, borderRadius: theme.borderRadius.md, alignItems: 'center', marginTop: 14 },
})
