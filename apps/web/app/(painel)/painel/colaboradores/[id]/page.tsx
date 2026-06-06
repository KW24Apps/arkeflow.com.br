'use client'

import { useEffect, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { TopBar } from '@/components/layout/TopBar'
import { colaboradoresApi, type Colaborador, type LogAcesso, type ColaboradorPerfil } from '@/lib/api/colaboradores'
import { SeletorHorario } from '@/components/painel/SeletorHorario'
import { api } from '@/lib/api/client'

type Aba = 'acesso' | 'pessoal' | 'endereco' | 'bancario' | 'documentos' | 'logs'

interface DocItem { id: string; nome: string; tipo_mime: string; tamanho: number; criado_em: string }

const TIPOS_CONTRATO = [
  { value: 'clt',      label: 'CLT' },
  { value: 'pj',       label: 'PJ' },
  { value: 'mei',      label: 'MEI' },
  { value: 'autonomo', label: 'Autônomo' },
  { value: 'estagio',  label: 'Estágio' },
  { value: 'outro',    label: 'Outro' },
]

// ── Glass constants ────────────────────────────────────────────────────────────

const CARD = {
  background: 'rgba(8,18,30,0.48)',
  backdropFilter: 'blur(8px)',
  border: '0.5px solid rgba(255,255,255,0.09)',
  borderRadius: '10px',
  padding: '16px',
}

const ROW = {
  background: 'rgba(8,18,30,0.35)',
  border: '0.5px solid rgba(255,255,255,0.07)',
  borderRadius: '8px',
  padding: '10px 12px',
}

const INPUT = {
  background: 'rgba(8,18,30,0.5)',
  border: '0.5px solid rgba(255,255,255,0.12)',
  borderRadius: '8px',
  padding: '9px 12px',
  fontSize: '13px',
  color: 'rgba(255,255,255,0.75)',
  width: '100%',
  outline: 'none',
}

function Lbl({ children }: { children: React.ReactNode }) {
  return (
    <label style={{ display: 'block', fontSize: '9px', textTransform: 'uppercase' as const, letterSpacing: '0.1em', color: 'rgba(255,255,255,0.35)', marginBottom: '4px' }}>
      {children}
    </label>
  )
}

function GField({ label, value, onChange, type = 'text', placeholder = '' }: { label: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string }) {
  return (
    <div className="flex flex-col">
      <Lbl>{label}</Lbl>
      <input
        type={type} value={value} placeholder={placeholder}
        onChange={e => onChange(e.target.value)}
        style={INPUT}
        className="outline-none"
        onFocus={e => (e.currentTarget.style.borderColor = 'rgba(0,239,255,0.4)')}
        onBlur={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)')}
      />
    </div>
  )
}

function GSelect({ label, value, onChange, children }: { label: string; value: string; onChange: (v: string) => void; children: React.ReactNode }) {
  return (
    <div className="flex flex-col">
      <Lbl>{label}</Lbl>
      <select
        value={value} onChange={e => onChange(e.target.value)}
        style={INPUT}
        className="outline-none"
        onFocus={e => (e.currentTarget.style.borderColor = 'rgba(0,239,255,0.4)')}
        onBlur={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)')}
      >
        {children}
      </select>
    </div>
  )
}

function fmtCEP(v: string) {
  const d = v.replace(/\D/g, '').slice(0, 8)
  return d.length > 5 ? `${d.slice(0,5)}-${d.slice(5)}` : d
}

function SaveBtn({ onClick, disabled, label }: { onClick: () => void; disabled: boolean; label: string }) {
  return (
    <button
      onClick={onClick} disabled={disabled}
      className="w-full min-h-[44px] disabled:opacity-40 transition-opacity"
      style={{ background: 'rgba(0,239,255,0.85)', borderRadius: '8px', color: '#0a0a1a', fontSize: '13px', fontWeight: 600, border: 'none' }}
    >
      {label}
    </button>
  )
}

function Msg({ text }: { text: string }) {
  if (!text) return null
  const ok = text.toLowerCase().includes('sucesso') || text.toLowerCase().includes('atualiz')
  return <p style={{ fontSize: '12px', textAlign: 'center', color: ok ? 'rgba(100,220,160,0.85)' : 'rgba(248,113,113,0.85)' }}>{text}</p>
}

// ─── component ────────────────────────────────────────────────────────────────

export default function ColaboradorDetalhe() {
  const { id }   = useParams<{ id: string }>()
  const router   = useRouter()
  const fileRef  = useRef<HTMLInputElement>(null)

  const [aba,      setAba]      = useState<Aba>('acesso')
  const [colab,    setColab]    = useState<Colaborador | null>(null)
  const [logs,     setLogs]     = useState<LogAcesso[]>([])
  const [docs,     setDocs]     = useState<DocItem[]>([])
  const [loading,  setLoading]  = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [msg,      setMsg]      = useState('')

  const [modelos,  setModelos]  = useState<any[]>([])
  const [modeloId, setModeloId] = useState<string>('')

  // Acesso
  const [nome,       setNome]       = useState('')
  const [email,      setEmail]      = useState('')
  const [username,   setUsername]   = useState('')
  const [permissoes, setPermissoes] = useState<string[]>([])
  const [diasSemana, setDiasSemana] = useState<number[] | null>(null)
  const [horaInicio, setHoraInicio] = useState('08:00')
  const [horaFim,    setHoraFim]    = useState('18:00')
  const [novaSenha,  setNovaSenha]  = useState('')
  const [msgSenha,   setMsgSenha]   = useState('')

  // Pessoal
  const [cpf,            setCpf]            = useState('')
  const [rg,             setRg]             = useState('')
  const [dataNascimento, setDataNascimento] = useState('')
  const [telefone,       setTelefone]       = useState('')
  const [cargo,          setCargo]          = useState('')
  const [dataAdmissao,   setDataAdmissao]   = useState('')
  const [salario,        setSalario]        = useState('')
  const [tipoContrato,   setTipoContrato]   = useState('')

  // Endereço
  const [cep,         setCep]         = useState('')
  const [logradouro,  setLogradouro]  = useState('')
  const [numero,      setNumero]      = useState('')
  const [complemento, setComplemento] = useState('')
  const [bairro,      setBairro]      = useState('')
  const [cidade,      setCidade]      = useState('')
  const [estado,      setEstado]      = useState('')
  const [buscandoCep, setBuscandoCep] = useState(false)

  // Bancário
  const [banco,       setBanco]       = useState('')
  const [agencia,     setAgencia]     = useState('')
  const [conta,       setConta]       = useState('')
  const [contaDigito, setContaDigito] = useState('')
  const [tipoConta,   setTipoConta]   = useState('')
  const [pix,         setPix]         = useState('')

  useEffect(() => {
    api.get<any[]>('/modelos-permissao').then(r => setModelos(r.data)).catch(() => {})

    Promise.all([
      colaboradoresApi.get(id),
      colaboradoresApi.logs(id),
      api.get<DocItem[]>(`/colaboradores/${id}/documentos`).then(r => r.data),
    ]).then(([c, l, d]) => {
      setColab(c); setLogs(l); setDocs(d)
      setNome(c.nome); setEmail(c.email ?? ''); setUsername((c as any).username ?? '')
      setPermissoes(Array.isArray(c.permissoes) ? c.permissoes : [])
      setModeloId((c as any).modelo_permissao_id ?? '')
      setDiasSemana(c.dias_semana); setHoraInicio(c.hora_inicio ?? '08:00'); setHoraFim(c.hora_fim ?? '18:00')
      setCpf(c.cpf ?? ''); setRg(c.rg ?? ''); setDataNascimento(c.data_nascimento ?? '')
      setTelefone(c.telefone ?? ''); setCargo(c.cargo ?? '')
      setDataAdmissao(c.data_admissao ?? ''); setSalario(c.salario ? String(c.salario) : ''); setTipoContrato(c.tipo_contrato ?? '')
      setCep(c.cep ?? ''); setLogradouro(c.logradouro ?? ''); setNumero(c.numero ?? '')
      setComplemento(c.complemento ?? ''); setBairro(c.bairro ?? ''); setCidade(c.cidade ?? ''); setEstado(c.estado ?? '')
      setBanco(c.banco ?? ''); setAgencia(c.agencia ?? ''); setConta(c.conta ?? '')
      setContaDigito(c.conta_digito ?? ''); setTipoConta(c.tipo_conta ?? ''); setPix(c.pix ?? '')
    }).finally(() => setLoading(false))
  }, [id])

  async function handleToggleAtivo() {
    if (!colab) return
    const novo = !colab.ativo
    await colaboradoresApi.updateAcesso(id, { ativo: novo })
    setColab(c => c ? { ...c, ativo: novo } : c)
  }

  async function salvarAcesso() {
    setSalvando(true); setMsg('')
    try {
      await colaboradoresApi.updateAcesso(id, {
        nome,
        ...(email ? { email } : {}),
        username:            username || null,
        modelo_permissao_id: modeloId || null,
        permissoes:          Array.isArray(permissoes) ? permissoes : [],
        dias_semana:         diasSemana,
        hora_inicio:         diasSemana ? horaInicio : null,
        hora_fim:            diasSemana ? horaFim    : null,
      } as any)
      setMsg('Salvo com sucesso.')
    } catch (err: any) { setMsg(err?.response?.data?.error ?? 'Erro.') }
    finally { setSalvando(false) }
  }

  async function salvarPerfil() {
    setSalvando(true); setMsg('')
    const perfil: ColaboradorPerfil = {
      cpf: cpf || null, rg: rg || null, data_nascimento: dataNascimento || null,
      telefone: telefone || null, cargo: cargo || null,
      data_admissao: dataAdmissao || null, salario: salario ? parseFloat(salario.replace(',', '.')) : null,
      tipo_contrato: (tipoContrato || null) as any,
      cep: cep || null, logradouro: logradouro || null, numero: numero || null,
      complemento: complemento || null, bairro: bairro || null,
      cidade: cidade || null, estado: estado || null,
      banco: banco || null, agencia: agencia || null, conta: conta || null,
      conta_digito: contaDigito || null, tipo_conta: (tipoConta || null) as any,
      pix: pix || null,
    }
    try {
      await colaboradoresApi.updatePerfil(id, perfil)
      setMsg('Salvo com sucesso.')
    } catch (err: any) { setMsg(err?.response?.data?.error ?? 'Erro.') }
    finally { setSalvando(false) }
  }

  async function buscarCep() {
    const raw = cep.replace(/\D/g, '')
    if (raw.length !== 8) return
    setBuscandoCep(true)
    try {
      const res  = await fetch(`https://viacep.com.br/ws/${raw}/json/`)
      const data = await res.json()
      if (!data.erro) {
        setLogradouro(data.logradouro || '')
        setBairro(data.bairro || '')
        setCidade(data.localidade || '')
        setEstado(data.uf || '')
      }
    } catch {}
    finally { setBuscandoCep(false) }
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const form = new FormData()
    form.append('file', file)
    try {
      const { data } = await api.post<DocItem>(`/colaboradores/${id}/documentos`, form, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      setDocs(prev => [data, ...prev])
    } catch { alert('Erro ao enviar arquivo.') }
    if (fileRef.current) fileRef.current.value = ''
  }

  async function handleRemoverDoc(docId: string) {
    if (!confirm('Remover este documento?')) return
    await api.delete(`/colaboradores/documentos/${docId}`)
    setDocs(prev => prev.filter(d => d.id !== docId))
  }

  async function handleRedefinirSenha() {
    setMsgSenha('')
    if (novaSenha.length < 6) { setMsgSenha('Mínimo 6 caracteres.'); return }
    try { await colaboradoresApi.redefinirSenha(id, novaSenha); setNovaSenha(''); setMsgSenha('Senha atualizada.') }
    catch (err: any) { setMsgSenha(err?.response?.data?.error ?? 'Erro.') }
  }

  // ── loading / null states ──────────────────────────────────────────────────
  if (loading) return (
    <><TopBar /><div className="flex justify-center py-16"><div className="w-8 h-8 border-2 border-electric-cyan border-t-transparent rounded-full animate-spin" /></div></>
  )
  if (!colab) return (
    <><TopBar /><p className="text-center py-16" style={{ color: 'rgba(255,255,255,0.4)' }}>Não encontrado.</p></>
  )

  const isDono = colab.nivel === 'dono_loja'
  const ABAS: { key: Aba; label: string }[] = [
    { key: 'acesso',     label: 'Acesso' },
    { key: 'pessoal',    label: 'Pessoal' },
    { key: 'endereco',   label: 'Endereço' },
    { key: 'bancario',   label: 'Bancário' },
    { key: 'documentos', label: `Docs (${docs.length})` },
    { key: 'logs',       label: `Logs (${logs.length})` },
  ]

  return (
    <>
      <TopBar />
      <main className="flex-1 overflow-y-auto p-4 md:p-5 pb-10 flex flex-col gap-3">

        {/* ── Header card ─────────────────────────────────────────────────── */}
        <div style={CARD}>
          <div className="flex items-center gap-3">
            {/* Avatar */}
            <div
              className="flex items-center justify-center shrink-0"
              style={{ width: '52px', height: '52px', background: 'rgba(0,239,255,0.15)', border: '1px solid rgba(0,239,255,0.25)', borderRadius: '50%' }}
            >
              <span style={{ color: '#0ef', fontWeight: 700, fontSize: '20px' }}>
                {colab.nome.charAt(0).toUpperCase()}
              </span>
            </div>

            {/* Name + email + badges */}
            <div className="flex-1 min-w-0">
              <p style={{ fontSize: '15px', fontWeight: 500, color: 'rgba(255,255,255,0.85)' }}>{colab.nome}</p>
              <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)', marginTop: '2px' }}>{colab.email}</p>
              <div className="flex gap-1.5 mt-2 flex-wrap">
                <span style={{ fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.05em', background: 'rgba(0,239,255,0.12)', color: '#0ef', borderRadius: '9999px', padding: '2px 8px' }}>
                  {isDono ? 'Dono' : 'Vendedor'}
                </span>
                <span style={colab.ativo
                  ? { fontSize: '9px', textTransform: 'uppercase', background: 'rgba(100,220,160,0.1)', color: 'rgba(100,220,160,0.8)', borderRadius: '9999px', padding: '2px 8px' }
                  : { fontSize: '9px', textTransform: 'uppercase', background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.3)', borderRadius: '9999px', padding: '2px 8px' }
                }>
                  {colab.ativo ? 'Ativo' : 'Inativo'}
                </span>
              </div>
            </div>

            {/* Active toggle */}
            {!isDono && (
              <button
                onClick={handleToggleAtivo}
                className="shrink-0 relative transition-colors"
                style={{ width: '40px', height: '22px', borderRadius: '9999px', border: 'none', background: colab.ativo ? 'rgba(0,212,212,0.7)' : 'rgba(255,255,255,0.1)' }}
              >
                <span className="absolute top-[3px] w-[16px] h-[16px] bg-white rounded-full transition-all"
                  style={{ left: colab.ativo ? '21px' : '3px' }} />
              </button>
            )}
          </div>
        </div>

        {/* ── Pill tab bar ─────────────────────────────────────────────────── */}
        <div
          style={{ background: 'rgba(8,18,30,0.4)', borderRadius: '8px', padding: '3px' }}
          className="flex overflow-x-auto scrollbar-none"
        >
          {ABAS.map(a => (
            <button
              key={a.key}
              onClick={() => { setAba(a.key); setMsg('') }}
              style={{
                flex: 1, minWidth: 'max-content', padding: '7px 10px', borderRadius: '6px',
                fontSize: '12px', fontWeight: 500, border: 'none', whiteSpace: 'nowrap',
                background: aba === a.key ? 'rgba(0,239,255,0.15)' : 'transparent',
                color:      aba === a.key ? '#0ef' : 'rgba(255,255,255,0.4)',
                transition: 'background 0.15s, color 0.15s',
              }}
            >
              {a.label}
            </button>
          ))}
        </div>

        {/* ══════════════════════════════════════════════════════════════════ */}
        {/* ACESSO                                                            */}
        {/* ══════════════════════════════════════════════════════════════════ */}
        {aba === 'acesso' && (
          <>
            {/* Access toggle row */}
            {!isDono && (
              <div style={ROW} className="flex items-center justify-between">
                <div>
                  <p style={{ fontSize: '12px', fontWeight: 500, color: 'rgba(255,255,255,0.7)' }}>
                    {colab.ativo ? 'Acesso ativo' : 'Acesso bloqueado'}
                  </p>
                  <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', marginTop: '1px' }}>
                    {colab.ativo ? 'Colaborador pode entrar no sistema' : 'Login bloqueado'}
                  </p>
                </div>
                <button onClick={handleToggleAtivo} className="shrink-0 relative transition-colors"
                  style={{ width: '40px', height: '22px', borderRadius: '9999px', border: 'none', background: colab.ativo ? 'rgba(0,212,212,0.7)' : 'rgba(255,255,255,0.1)' }}>
                  <span className="absolute top-[3px] w-[16px] h-[16px] bg-white rounded-full transition-all"
                    style={{ left: colab.ativo ? '21px' : '3px' }} />
                </button>
              </div>
            )}

            {/* Main access form */}
            <div style={CARD} className="flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <p style={{ fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.3)' }}>Dados de acesso</p>
                {isDono && <span style={{ fontSize: '9px', textTransform: 'uppercase', background: 'rgba(0,239,255,0.12)', color: '#0ef', borderRadius: '9999px', padding: '2px 8px' }}>Dono</span>}
              </div>
              <GField label="Nome"            value={nome}     onChange={setNome} />
              <GField label="Email"           value={email}    onChange={setEmail}    type="email" placeholder="email@exemplo.com" />
              <GField label="Usuário (opcional)" value={username} onChange={v => setUsername(v.toLowerCase())} placeholder="ex: joao.silva" />
            </div>

            {!isDono && (
              <>
                {/* Modelo de permissão */}
                <div style={CARD} className="flex flex-col gap-3">
                  <div>
                    <p style={{ fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.3)' }}>Modelo de permissão</p>
                    <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.25)', marginTop: '3px' }}>Define quais menus este colaborador pode acessar</p>
                  </div>
                  {modelos.filter((m: any) => !m.sistema).length === 0 ? (
                    <p style={{ fontSize: '12px', color: 'rgba(250,204,21,0.8)' }}>
                      Nenhum modelo criado.{' '}
                      <a href="/painel/colaboradores/permissoes" style={{ textDecoration: 'underline' }}>Criar modelo</a>
                    </p>
                  ) : (
                    <GSelect label="Modelo" value={modeloId} onChange={setModeloId}>
                      <option value="">Sem modelo — sem acesso ao painel</option>
                      {modelos.filter((m: any) => !m.sistema).map((m: any) => (
                        <option key={m.id} value={m.id}>{m.nome}</option>
                      ))}
                    </GSelect>
                  )}
                </div>

                {/* Restrição de horário */}
                <div style={CARD}>
                  <SeletorHorario dias={diasSemana} horaInicio={horaInicio} horaFim={horaFim}
                    onChange={(d, i, f) => { setDiasSemana(d); setHoraInicio(i); setHoraFim(f) }} />
                </div>
              </>
            )}

            <Msg text={msg} />
            <SaveBtn onClick={salvarAcesso} disabled={salvando} label={salvando ? 'Salvando...' : 'Salvar Acesso'} />

            {/* Password reset */}
            <div style={CARD} className="flex flex-col gap-3">
              <p style={{ fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.3)' }}>Redefinir Senha</p>
              <GField label="Nova senha" value={novaSenha} onChange={setNovaSenha} type="password" placeholder="Mínimo 6 caracteres" />
              <Msg text={msgSenha} />
              <button
                onClick={handleRedefinirSenha} disabled={!novaSenha}
                className="w-full min-h-[40px] disabled:opacity-40"
                style={{ background: 'rgba(240,100,100,0.15)', border: '0.5px solid rgba(240,100,100,0.3)', borderRadius: '8px', color: 'rgba(240,100,100,0.8)', fontSize: '13px', fontWeight: 500 }}
              >
                Redefinir Senha
              </button>
            </div>

            {/* Danger zone */}
            {!isDono && (
              <button
                onClick={async () => {
                  if (!confirm('Excluir permanentemente este colaborador?')) return
                  try { await colaboradoresApi.excluir(id); router.push('/painel/colaboradores') }
                  catch (err: any) { alert(err?.response?.data?.error ?? 'Erro ao excluir.') }
                }}
                className="w-full min-h-[40px]"
                style={{ background: 'rgba(240,100,100,0.08)', border: '0.5px solid rgba(240,100,100,0.2)', borderRadius: '8px', color: 'rgba(240,100,100,0.6)', fontSize: '13px' }}
              >
                🗑️ Excluir colaborador
              </button>
            )}
          </>
        )}

        {/* ══════════════════════════════════════════════════════════════════ */}
        {/* PESSOAL                                                           */}
        {/* ══════════════════════════════════════════════════════════════════ */}
        {aba === 'pessoal' && (
          <div style={CARD} className="flex flex-col gap-3">
            <p style={{ fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.3)' }}>Dados Pessoais &amp; Emprego</p>

            <div className="grid grid-cols-2 gap-3">
              <GField label="CPF" value={cpf} onChange={setCpf} placeholder="000.000.000-00" />
              <GField label="RG"  value={rg}  onChange={setRg} />
            </div>
            <GField label="Data de nascimento" value={dataNascimento} onChange={setDataNascimento} type="date" />
            <div className="grid grid-cols-2 gap-3">
              <GField label="Telefone" value={telefone} onChange={setTelefone} placeholder="(00) 00000-0000" />
              <GField label="Cargo"    value={cargo}    onChange={setCargo}    placeholder="Ex: Vendedor" />
            </div>

            <div style={{ borderTop: '0.5px solid rgba(255,255,255,0.07)', paddingTop: '12px' }} className="flex flex-col gap-3">
              <p style={{ fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.3)' }}>Dados de Emprego</p>
              <div className="grid grid-cols-2 gap-3">
                <GField label="Data de admissão" value={dataAdmissao} onChange={setDataAdmissao} type="date" />
                <GField label="Salário (R$)"     value={salario}     onChange={setSalario}     placeholder="0,00" />
              </div>
              <GSelect label="Tipo de contrato" value={tipoContrato} onChange={setTipoContrato}>
                <option value="">Selecione...</option>
                {TIPOS_CONTRATO.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </GSelect>
            </div>

            <Msg text={msg} />
            <SaveBtn onClick={salvarPerfil} disabled={salvando} label={salvando ? 'Salvando...' : 'Salvar'} />
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════ */}
        {/* ENDEREÇO                                                          */}
        {/* ══════════════════════════════════════════════════════════════════ */}
        {aba === 'endereco' && (
          <div style={CARD} className="flex flex-col gap-3">
            <p style={{ fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.3)' }}>Endereço</p>

            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2 flex flex-col">
                <Lbl>CEP</Lbl>
                <div className="flex gap-2">
                  <input
                    value={cep}
                    onChange={e => setCep(fmtCEP(e.target.value))}
                    onBlur={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'; buscarCep() }}
                    onFocus={e => (e.currentTarget.style.borderColor = 'rgba(0,239,255,0.4)')}
                    placeholder="00000-000"
                    style={{ ...INPUT, flex: 1 }}
                    className="outline-none"
                  />
                  <button onClick={buscarCep} disabled={buscandoCep}
                    style={{ background: 'rgba(0,239,255,0.15)', border: '0.5px solid rgba(0,239,255,0.3)', borderRadius: '8px', padding: '9px 14px', fontSize: '12px', color: '#0ef', flexShrink: 0 }}>
                    {buscandoCep ? '...' : 'Buscar'}
                  </button>
                </div>
              </div>
              <GField label="Estado" value={estado} onChange={setEstado} placeholder="SP" />
            </div>
            <GField label="Logradouro" value={logradouro} onChange={setLogradouro} placeholder="Rua, Av., etc." />
            <div className="grid grid-cols-3 gap-3">
              <GField label="Número" value={numero} onChange={setNumero} />
              <div className="col-span-2"><GField label="Complemento" value={complemento} onChange={setComplemento} placeholder="Apto, Bloco..." /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <GField label="Bairro" value={bairro} onChange={setBairro} />
              <GField label="Cidade" value={cidade} onChange={setCidade} />
            </div>

            <Msg text={msg} />
            <SaveBtn onClick={salvarPerfil} disabled={salvando} label={salvando ? 'Salvando...' : 'Salvar'} />
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════ */}
        {/* BANCÁRIO                                                          */}
        {/* ══════════════════════════════════════════════════════════════════ */}
        {aba === 'bancario' && (
          <div style={CARD} className="flex flex-col gap-3">
            <p style={{ fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.3)' }}>Dados Bancários</p>

            <GField label="Banco" value={banco} onChange={setBanco} placeholder="Ex: Banco do Brasil, Nubank..." />
            <div className="grid grid-cols-3 gap-3">
              <GField label="Agência" value={agencia} onChange={setAgencia} />
              <div className="col-span-2 grid grid-cols-3 gap-2">
                <div className="col-span-2"><GField label="Conta"  value={conta}       onChange={setConta} /></div>
                <GField label="Dígito" value={contaDigito} onChange={setContaDigito} />
              </div>
            </div>
            <GSelect label="Tipo de conta" value={tipoConta} onChange={setTipoConta}>
              <option value="">Selecione...</option>
              <option value="corrente">Corrente</option>
              <option value="poupanca">Poupança</option>
            </GSelect>
            <GField label="Chave Pix" value={pix} onChange={setPix} placeholder="CPF, email, telefone ou aleatória" />

            <Msg text={msg} />
            <SaveBtn onClick={salvarPerfil} disabled={salvando} label={salvando ? 'Salvando...' : 'Salvar'} />
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════ */}
        {/* DOCUMENTOS                                                        */}
        {/* ══════════════════════════════════════════════════════════════════ */}
        {aba === 'documentos' && (
          <div style={CARD} className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <p style={{ fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.3)' }}>Documentos</p>
              <button
                onClick={() => fileRef.current?.click()}
                className="min-h-[34px] px-4"
                style={{ background: 'rgba(0,239,255,0.2)', border: '0.5px solid rgba(0,239,255,0.4)', borderRadius: '8px', color: '#0ef', fontSize: '12px', fontWeight: 500 }}
              >
                + Anexar
              </button>
              <input ref={fileRef} type="file" className="hidden" onChange={handleUpload}
                accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" />
            </div>

            {docs.length === 0 ? (
              <div className="flex flex-col items-center py-10" style={{ border: '1px dashed rgba(255,255,255,0.1)', borderRadius: '8px' }}>
                <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.3)' }}>Nenhum documento anexado</p>
                <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.2)', marginTop: '4px' }}>PDF, imagens e documentos Word aceitos</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {docs.map(d => {
                  const isPdf = d.tipo_mime?.includes('pdf')
                  const isImg = d.tipo_mime?.includes('image')
                  const icon  = isPdf ? '📄' : isImg ? '🖼️' : '📎'
                  return (
                    <div key={d.id} style={{ background: 'rgba(255,255,255,0.03)', border: '0.5px solid rgba(255,255,255,0.07)', borderRadius: '8px', padding: '12px' }} className="flex flex-col gap-2">
                      <div className="text-3xl text-center py-1">{icon}</div>
                      <p style={{ fontSize: '11px', fontWeight: 500, color: 'rgba(255,255,255,0.7)', textAlign: 'center' }} className="truncate">{d.nome}</p>
                      <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', textAlign: 'center' }}>
                        {new Date(d.criado_em).toLocaleDateString('pt-BR')}
                      </p>
                      <div className="flex gap-2 mt-1">
                        <a href={`${process.env.NEXT_PUBLIC_API_URL}/colaboradores/documentos/${d.id}/download`}
                          target="_blank" rel="noopener noreferrer"
                          className="flex-1 min-h-[32px] flex items-center justify-center"
                          style={{ background: 'rgba(0,239,255,0.1)', border: '0.5px solid rgba(0,239,255,0.2)', borderRadius: '6px', fontSize: '11px', color: '#0ef' }}>
                          Baixar
                        </a>
                        <button onClick={() => handleRemoverDoc(d.id)}
                          className="min-h-[32px] px-3"
                          style={{ background: 'rgba(240,100,100,0.08)', border: '0.5px solid rgba(240,100,100,0.15)', borderRadius: '6px', fontSize: '11px', color: 'rgba(240,100,100,0.6)' }}>
                          🗑️
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════════ */}
        {/* LOGS                                                              */}
        {/* ══════════════════════════════════════════════════════════════════ */}
        {aba === 'logs' && (
          <div style={CARD} className="flex flex-col gap-3">
            <p style={{ fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.3)' }}>Histórico de acessos</p>

            {logs.length === 0 ? (
              <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.25)', textAlign: 'center', padding: '24px 0' }}>Nenhum acesso registrado</p>
            ) : (
              <div className="flex flex-col gap-1.5">
                {logs.map((l, i) => (
                  <div key={i} style={{ ...ROW, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <p style={{ fontSize: '12px', fontWeight: 500, color: l.tipo === 'login' ? 'rgba(100,220,160,0.85)' : 'rgba(255,255,255,0.4)' }}>
                        {l.tipo === 'login' ? '▶ Login' : '◀ Logout'}
                      </p>
                      {l.ip && <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.25)', marginTop: '1px' }}>IP: {l.ip}</p>}
                    </div>
                    <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)' }}>{new Date(l.criado_em).toLocaleString('pt-BR')}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </main>
    </>
  )
}
