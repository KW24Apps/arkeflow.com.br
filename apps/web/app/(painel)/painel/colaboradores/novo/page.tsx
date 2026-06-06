'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { TopBar } from '@/components/layout/TopBar'
import { colaboradoresApi } from '@/lib/api/colaboradores'
import { SeletorHorario } from '@/components/painel/SeletorHorario'
import { api } from '@/lib/api/client'

interface Modelo { id: string; nome: string; sistema: boolean }

const TIPOS_CONTRATO = [
  { value: 'clt',      label: 'CLT' },
  { value: 'pj',       label: 'PJ' },
  { value: 'mei',      label: 'MEI' },
  { value: 'autonomo', label: 'Autônomo' },
  { value: 'estagio',  label: 'Estágio' },
  { value: 'outro',    label: 'Outro' },
]

const CARD = {
  background: 'rgba(8,18,30,0.48)',
  backdropFilter: 'blur(8px)',
  border: '0.5px solid rgba(255,255,255,0.09)',
  borderRadius: '10px',
  padding: '16px',
}

const INPUT: React.CSSProperties = {
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
  return <label style={{ display: 'block', fontSize: '9px', textTransform: 'uppercase' as const, letterSpacing: '0.1em', color: 'rgba(255,255,255,0.35)', marginBottom: '4px' }}>{children}</label>
}

function GField({ label, value, onChange, onBlur, type = 'text', placeholder = '' }: { label: string; value: string; onChange: (v: string) => void; onBlur?: () => void; type?: string; placeholder?: string }) {
  return (
    <div className="flex flex-col">
      <Lbl>{label}</Lbl>
      <input type={type} value={value} placeholder={placeholder} onChange={e => onChange(e.target.value)}
        style={INPUT} className="outline-none"
        onFocus={e => (e.currentTarget.style.borderColor = 'rgba(0,239,255,0.4)')}
        onBlur={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'; onBlur?.() }}
      />
    </div>
  )
}

function GSelect({ label, value, onChange, children }: { label: string; value: string; onChange: (v: string) => void; children: React.ReactNode }) {
  return (
    <div className="flex flex-col">
      <Lbl>{label}</Lbl>
      <select value={value} onChange={e => onChange(e.target.value)} style={INPUT} className="outline-none"
        onFocus={e => (e.currentTarget.style.borderColor = 'rgba(0,239,255,0.4)')}
        onBlur={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)')}
      >
        {children}
      </select>
    </div>
  )
}

export default function NovoColaboradorPage() {
  const router = useRouter()

  // Acesso
  const [nome,       setNome]       = useState('')
  const [email,      setEmail]      = useState('')
  const [username,   setUsername]   = useState('')
  const [senha,      setSenha]      = useState('')
  const [modeloId,   setModeloId]   = useState('')
  const [modelos,    setModelos]    = useState<Modelo[]>([])
  const [diasSemana, setDiasSemana] = useState<number[] | null>(null)
  const [horaInicio, setHoraInicio] = useState('08:00')
  const [horaFim,    setHoraFim]    = useState('18:00')

  // Pessoal
  const [cpf,            setCpf]            = useState('')
  const [dataNascimento, setDataNascimento] = useState('')
  const [telefone,       setTelefone]       = useState('')
  const [cargo,          setCargo]          = useState('')
  const [dataAdmissao,   setDataAdmissao]   = useState('')
  const [salario,        setSalario]        = useState('')
  const [tipoContrato,   setTipoContrato]   = useState('')

  const [loading, setLoading] = useState(false)
  const [erro,    setErro]    = useState('')

  useEffect(() => {
    api.get<Modelo[]>('/modelos-permissao').then(r => setModelos(r.data)).catch(() => {})
  }, [])

  function handleHorario(dias: number[] | null, inicio: string, fim: string) {
    setDiasSemana(dias); setHoraInicio(inicio); setHoraFim(fim)
  }

  async function handleSalvar(e: React.FormEvent) {
    e.preventDefault()
    setErro('')
    if (!nome || !email || !senha) { setErro('Preencha nome, email e senha.'); return }
    if (senha.length < 6) { setErro('Senha mínimo 6 caracteres.'); return }
    setLoading(true)
    try {
      const c = await colaboradoresApi.create({
        nome, email, username: username || undefined, senha,
        permissoes: [],
        modelo_permissao_id: modeloId || undefined,
        dias_semana: diasSemana,
        hora_inicio: diasSemana ? horaInicio : null,
        hora_fim:    diasSemana ? horaFim    : null,
      } as any)
      if (cpf || dataNascimento || telefone || cargo || dataAdmissao || salario || tipoContrato) {
        try {
          await colaboradoresApi.updatePerfil(c.id, {
            cpf: cpf || null, rg: null, data_nascimento: dataNascimento || null,
            telefone: telefone || null, cargo: cargo || null,
            data_admissao: dataAdmissao || null,
            salario: salario ? parseFloat(salario.replace(',', '.')) : null,
            tipo_contrato: (tipoContrato || null) as any,
            cep: null, logradouro: null, numero: null, complemento: null,
            bairro: null, cidade: null, estado: null,
            banco: null, agencia: null, conta: null,
            conta_digito: null, tipo_conta: null, pix: null,
          })
        } catch {}
      }
      router.push(`/painel/colaboradores/${c.id}`)
    } catch (err: any) {
      setErro(err?.response?.data?.error ?? 'Erro ao salvar.')
    } finally { setLoading(false) }
  }

  return (
    <>
      <TopBar />
      <main className="flex-1 overflow-hidden flex flex-col">
        <form onSubmit={handleSalvar} className="flex-1 overflow-hidden flex flex-col">

          <div className="flex-1 overflow-y-auto p-3">
            {erro && <p style={{ fontSize: '12px', color: 'rgba(248,113,113,0.85)', textAlign: 'center', marginBottom: '8px' }}>{erro}</p>}
            <div className="grid grid-cols-2 gap-3 items-start">

              {/* LEFT: Acesso */}
              <div style={CARD} className="flex flex-col gap-3">
                <p style={{ fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.3)' }}>Dados de acesso</p>

                <GField label="Nome *" value={nome} onChange={setNome} onBlur={() => setNome(n => n.replace(/\b\w/g, c => c.toUpperCase()))} placeholder="Nome do colaborador" />
                <GField label="Email *"              value={email}    onChange={setEmail}    type="email" placeholder="email@exemplo.com" />
                <GField label="Usuário (opcional)"   value={username} onChange={v => setUsername(v.toLowerCase())} placeholder="ex: joao.silva" />
                <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.25)', marginTop: '-4px' }}>Minúsculas, números, ponto e _. Permite login sem email.</p>
                <GField label="Senha *"              value={senha}    onChange={setSenha}    type="password" placeholder="Mínimo 6 caracteres" />

                <div style={{ borderTop: '0.5px solid rgba(255,255,255,0.07)', paddingTop: '12px' }} className="flex flex-col gap-2">
                  <p style={{ fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.3)' }}>Modelo de permissão</p>
                  <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.25)' }}>Define quais menus este colaborador pode acessar</p>
                  {modelos.filter(m => !m.sistema).length === 0 ? (
                    <p style={{ fontSize: '12px', color: 'rgba(250,204,21,0.8)' }}>
                      Nenhum modelo criado.{' '}
                      <a href="/painel/colaboradores/permissoes" style={{ textDecoration: 'underline' }}>Criar modelo</a>
                    </p>
                  ) : (
                    <GSelect label="" value={modeloId} onChange={setModeloId}>
                      <option value="">Sem modelo — sem acesso ao painel</option>
                      {modelos.filter(m => !m.sistema).map(m => (
                        <option key={m.id} value={m.id}>{m.nome}</option>
                      ))}
                    </GSelect>
                  )}
                </div>

                <div style={{ borderTop: '0.5px solid rgba(255,255,255,0.07)', paddingTop: '12px' }}>
                  <SeletorHorario dias={diasSemana} horaInicio={horaInicio} horaFim={horaFim} onChange={handleHorario} />
                </div>
              </div>

              {/* RIGHT: Dados pessoais */}
              <div style={CARD} className="flex flex-col gap-3">
                <p style={{ fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.3)' }}>Dados pessoais (opcional)</p>

                <div className="grid grid-cols-2 gap-3">
                  <GField label="CPF" value={cpf} onChange={setCpf} placeholder="000.000.000-00" />
                  <GField label="Data de nascimento" value={dataNascimento} onChange={setDataNascimento} type="date" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <GField label="Telefone" value={telefone} onChange={setTelefone} placeholder="(00) 00000-0000" />
                  <GField label="Cargo"    value={cargo}    onChange={setCargo}    placeholder="Ex: Vendedor" />
                </div>

                <div style={{ borderTop: '0.5px solid rgba(255,255,255,0.07)', paddingTop: '12px' }} className="flex flex-col gap-3">
                  <p style={{ fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.3)' }}>Emprego</p>
                  <div className="grid grid-cols-2 gap-3">
                    <GField label="Data de admissão" value={dataAdmissao} onChange={setDataAdmissao} type="date" />
                    <GField label="Salário (R$)"     value={salario}     onChange={setSalario}     placeholder="0,00" />
                  </div>
                  <GSelect label="Tipo de contrato" value={tipoContrato} onChange={setTipoContrato}>
                    <option value="">Selecione...</option>
                    {TIPOS_CONTRATO.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </GSelect>
                </div>
              </div>

            </div>
          </div>

          {/* Fixed footer */}
          <div className="shrink-0 flex gap-3 px-4 py-3"
            style={{ background: 'rgba(8,18,30,0.65)', backdropFilter: 'blur(8px)', borderTop: '0.5px solid rgba(255,255,255,0.07)' }}>
            <button type="button" onClick={() => router.back()}
              className="flex-1 min-h-[44px]"
              style={{ background: 'rgba(255,255,255,0.06)', border: '0.5px solid rgba(255,255,255,0.12)', borderRadius: '8px', color: 'rgba(255,255,255,0.5)', fontSize: '13px' }}>
              Cancelar
            </button>
            <button type="submit" disabled={loading}
              className="flex-[2] min-h-[44px] disabled:opacity-40 transition-opacity"
              style={{ background: 'rgba(0,239,255,0.85)', borderRadius: '8px', color: '#0a0a1a', fontSize: '13px', fontWeight: 600, border: 'none' }}>
              {loading ? 'Salvando...' : 'Criar Colaborador'}
            </button>
          </div>

        </form>
      </main>
    </>
  )
}
