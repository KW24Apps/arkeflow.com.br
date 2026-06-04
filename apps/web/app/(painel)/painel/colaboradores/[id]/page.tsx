'use client'

import { useEffect, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { TopBar } from '@/components/layout/TopBar'
import { Input } from '@/components/ui/Input'
import { colaboradoresApi, type Colaborador, type LogAcesso, type ColaboradorPerfil } from '@/lib/api/colaboradores'
import { SeletorPermissoes } from '@/components/painel/SeletorPermissoes'
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

export default function ColaboradorDetalhe() {
  const { id }   = useParams<{ id: string }>()
  const router   = useRouter()
  const fileRef  = useRef<HTMLInputElement>(null)

  const [aba, setAba]       = useState<Aba>('acesso')
  const [colab, setColab]   = useState<Colaborador | null>(null)
  const [logs,  setLogs]    = useState<LogAcesso[]>([])
  const [docs,  setDocs]    = useState<DocItem[]>([])
  const [loading, setLoading] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [msg, setMsg]       = useState('')

  // Acesso
  const [nome,       setNome]       = useState('')
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

  // Bancário
  const [banco,      setBanco]      = useState('')
  const [agencia,    setAgencia]    = useState('')
  const [conta,      setConta]      = useState('')
  const [contaDigito,setContaDigito]= useState('')
  const [tipoConta,  setTipoConta]  = useState('')
  const [pix,        setPix]        = useState('')

  useEffect(() => {
    Promise.all([
      colaboradoresApi.get(id),
      colaboradoresApi.logs(id),
      api.get<DocItem[]>(`/colaboradores/${id}/documentos`).then(r => r.data),
    ]).then(([c, l, d]) => {
      setColab(c); setLogs(l); setDocs(d)
      setNome(c.nome); setPermissoes(c.permissoes)
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

  async function salvarAcesso() {
    setSalvando(true); setMsg('')
    try {
      await colaboradoresApi.updateAcesso(id, {
        nome, permissoes,
        dias_semana: diasSemana,
        hora_inicio: diasSemana ? horaInicio : null,
        hora_fim:    diasSemana ? horaFim    : null,
      })
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

  async function handleDesativar() {
    if (!confirm('Desativar este colaborador?')) return
    await colaboradoresApi.remove(id)
    router.push('/painel/colaboradores')
  }

  if (loading) return <><TopBar title="Colaborador" /><div className="flex justify-center py-16"><div className="w-8 h-8 border-2 border-electric-cyan border-t-transparent rounded-full animate-spin" /></div></>
  if (!colab) return <><TopBar title="Colaborador" /><p className="text-center text-steel py-16">Não encontrado.</p></>

  const isDono = colab.nivel === 'dono_loja'
  const ABAS: { key: Aba; label: string }[] = [
    { key: 'acesso',     label: 'Acesso' },
    { key: 'pessoal',    label: 'Pessoal' },
    { key: 'endereco',   label: 'Endereço' },
    { key: 'bancario',   label: 'Bancário' },
    { key: 'documentos', label: `Docs (${docs.length})` },
    { key: 'logs',       label: `Logs (${logs.length})` },
  ]

  const Field = ({ label, value, onChange, type = 'text', placeholder = '' }: any) => (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs text-steel uppercase tracking-wider">{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        className="min-h-[48px] bg-midnight border border-ocean-depth rounded-xl px-4 text-sm text-sea-foam placeholder-steel outline-none focus:border-electric-cyan" />
    </div>
  )

  return (
    <>
      <TopBar title={colab.nome} />
      <main className="flex-1 overflow-y-auto pb-10">

        {/* Abas */}
        <div className="bg-deep-ocean border-b border-ocean-depth flex overflow-x-auto scrollbar-none px-2">
          {ABAS.map(a => (
            <button key={a.key} onClick={() => { setAba(a.key); setMsg('') }}
              className={`min-h-[44px] px-4 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
                aba === a.key ? 'text-electric-cyan border-electric-cyan' : 'text-steel border-transparent hover:text-sea-foam'
              }`}>
              {a.label}
            </button>
          ))}
        </div>

        <div className="p-4 md:p-6">
          <div className="max-w-lg flex flex-col gap-4">

            {/* ── Acesso ── */}
            {aba === 'acesso' && (
              <>
                <section className="bg-deep-ocean border border-ocean-depth rounded-2xl p-5 flex flex-col gap-4">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sea-foam font-semibold text-xs uppercase tracking-wider">Dados de acesso</h3>
                    {isDono && <span className="bg-electric-cyan/20 text-electric-cyan text-[10px] px-2 py-0.5 rounded-full font-medium uppercase">Dono</span>}
                  </div>
                  <Input label="Nome" value={nome} onChange={e => setNome(e.target.value)} />
                  <div><label className="text-xs text-steel uppercase tracking-wider">Email</label>
                    <p className="text-sea-foam text-sm mt-1 px-1">{colab.email}</p></div>
                </section>

                {!isDono && (
                  <>
                    <section className="bg-deep-ocean border border-ocean-depth rounded-2xl p-5">
                      <SeletorHorario dias={diasSemana} horaInicio={horaInicio} horaFim={horaFim}
                        onChange={(d, i, f) => { setDiasSemana(d); setHoraInicio(i); setHoraFim(f) }} />
                    </section>
                    <section className="bg-deep-ocean border border-ocean-depth rounded-2xl p-5">
                      <SeletorPermissoes value={permissoes} onChange={setPermissoes} />
                    </section>
                  </>
                )}

                {msg && <p className={`text-sm text-center ${msg.includes('sucesso') ? 'text-mint-green' : 'text-red-400'}`}>{msg}</p>}
                <button onClick={salvarAcesso} disabled={salvando}
                  className="min-h-[52px] bg-electric-cyan text-midnight rounded-2xl text-sm font-semibold disabled:opacity-40">
                  {salvando ? 'Salvando...' : 'Salvar Acesso'}
                </button>

                <section className="bg-deep-ocean border border-ocean-depth rounded-2xl p-5 flex flex-col gap-3">
                  <h3 className="text-sea-foam font-semibold text-xs uppercase tracking-wider">Redefinir Senha</h3>
                  <Input label="Nova senha" type="password" value={novaSenha} onChange={e => setNovaSenha(e.target.value)} placeholder="Mínimo 6 caracteres" />
                  {msgSenha && <p className={`text-xs ${msgSenha.includes('atualizada') ? 'text-mint-green' : 'text-red-400'}`}>{msgSenha}</p>}
                  <button onClick={handleRedefinirSenha} disabled={!novaSenha}
                    className="min-h-[48px] border border-ocean-depth text-sea-foam rounded-xl text-sm hover:border-teal-current transition-colors disabled:opacity-40">
                    Redefinir Senha
                  </button>
                </section>

                {!isDono && (
                  <button
                    onClick={colab.ativo ? handleDesativar : async () => {
                      await colaboradoresApi.updateAcesso(id, { ativo: true })
                      setColab(c => c ? { ...c, ativo: true } : c)
                      setMsg('Colaborador reativado.')
                    }}
                    className={`min-h-[48px] rounded-2xl text-sm border transition-colors ${
                      colab.ativo
                        ? 'border-red-500/30 text-red-400 hover:bg-red-500/10'
                        : 'border-mint-green/30 text-mint-green hover:bg-mint-green/10'
                    }`}
                  >
                    {colab.ativo ? '🔒 Bloquear acesso' : '🔓 Reativar acesso'}
                  </button>
                )}
              </>
            )}

            {/* ── Pessoal ── */}
            {aba === 'pessoal' && (
              <section className="bg-deep-ocean border border-ocean-depth rounded-2xl p-5 flex flex-col gap-4">
                <h3 className="text-sea-foam font-semibold text-xs uppercase tracking-wider">Dados Pessoais &amp; Emprego</h3>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="CPF" value={cpf} onChange={setCpf} placeholder="000.000.000-00" />
                  <Field label="RG"  value={rg}  onChange={setRg} />
                </div>
                <Field label="Data de nascimento" value={dataNascimento} onChange={setDataNascimento} type="date" />
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Telefone" value={telefone} onChange={setTelefone} placeholder="(00) 00000-0000" />
                  <Field label="Cargo"    value={cargo}    onChange={setCargo}    placeholder="Ex: Vendedor" />
                </div>
                <div className="border-t border-ocean-depth pt-4">
                  <p className="text-steel text-xs uppercase tracking-wider mb-3">Dados de Emprego</p>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Data de admissão" value={dataAdmissao} onChange={setDataAdmissao} type="date" />
                    <Field label="Salário (R$)" value={salario} onChange={setSalario} placeholder="0,00" />
                  </div>
                  <div className="flex flex-col gap-1.5 mt-3">
                    <label className="text-xs text-steel uppercase tracking-wider">Tipo de contrato</label>
                    <select value={tipoContrato} onChange={e => setTipoContrato(e.target.value)}
                      className="min-h-[48px] bg-midnight border border-ocean-depth rounded-xl px-4 text-sm text-sea-foam outline-none">
                      <option value="">Selecione...</option>
                      {TIPOS_CONTRATO.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                  </div>
                </div>
                {msg && <p className={`text-sm text-center ${msg.includes('sucesso') ? 'text-mint-green' : 'text-red-400'}`}>{msg}</p>}
                <button onClick={salvarPerfil} disabled={salvando}
                  className="min-h-[52px] bg-electric-cyan text-midnight rounded-2xl text-sm font-semibold disabled:opacity-40">
                  {salvando ? 'Salvando...' : 'Salvar'}
                </button>
              </section>
            )}

            {/* ── Endereço ── */}
            {aba === 'endereco' && (
              <section className="bg-deep-ocean border border-ocean-depth rounded-2xl p-5 flex flex-col gap-4">
                <h3 className="text-sea-foam font-semibold text-xs uppercase tracking-wider">Endereço</h3>
                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-2"><Field label="CEP" value={cep} onChange={setCep} placeholder="00000-000" /></div>
                  <Field label="Estado" value={estado} onChange={setEstado} placeholder="SP" />
                </div>
                <Field label="Logradouro" value={logradouro} onChange={setLogradouro} placeholder="Rua, Av., etc." />
                <div className="grid grid-cols-3 gap-3">
                  <Field label="Número" value={numero} onChange={setNumero} />
                  <div className="col-span-2"><Field label="Complemento" value={complemento} onChange={setComplemento} placeholder="Apto, Bloco..." /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Bairro" value={bairro} onChange={setBairro} />
                  <Field label="Cidade" value={cidade} onChange={setCidade} />
                </div>
                {msg && <p className={`text-sm text-center ${msg.includes('sucesso') ? 'text-mint-green' : 'text-red-400'}`}>{msg}</p>}
                <button onClick={salvarPerfil} disabled={salvando}
                  className="min-h-[52px] bg-electric-cyan text-midnight rounded-2xl text-sm font-semibold disabled:opacity-40">
                  {salvando ? 'Salvando...' : 'Salvar'}
                </button>
              </section>
            )}

            {/* ── Bancário ── */}
            {aba === 'bancario' && (
              <section className="bg-deep-ocean border border-ocean-depth rounded-2xl p-5 flex flex-col gap-4">
                <h3 className="text-sea-foam font-semibold text-xs uppercase tracking-wider">Dados Bancários</h3>
                <Field label="Banco" value={banco} onChange={setBanco} placeholder="Ex: Banco do Brasil, Nubank..." />
                <div className="grid grid-cols-3 gap-3">
                  <Field label="Agência" value={agencia} onChange={setAgencia} />
                  <div className="col-span-2">
                    <div className="grid grid-cols-3 gap-2">
                      <div className="col-span-2"><Field label="Conta" value={conta} onChange={setConta} /></div>
                      <Field label="Dígito" value={contaDigito} onChange={setContaDigito} />
                    </div>
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-steel uppercase tracking-wider">Tipo de conta</label>
                  <select value={tipoConta} onChange={e => setTipoConta(e.target.value)}
                    className="min-h-[48px] bg-midnight border border-ocean-depth rounded-xl px-4 text-sm text-sea-foam outline-none">
                    <option value="">Selecione...</option>
                    <option value="corrente">Corrente</option>
                    <option value="poupanca">Poupança</option>
                  </select>
                </div>
                <Field label="Chave Pix" value={pix} onChange={setPix} placeholder="CPF, email, telefone ou aleatória" />
                {msg && <p className={`text-sm text-center ${msg.includes('sucesso') ? 'text-mint-green' : 'text-red-400'}`}>{msg}</p>}
                <button onClick={salvarPerfil} disabled={salvando}
                  className="min-h-[52px] bg-electric-cyan text-midnight rounded-2xl text-sm font-semibold disabled:opacity-40">
                  {salvando ? 'Salvando...' : 'Salvar'}
                </button>
              </section>
            )}

            {/* ── Documentos ── */}
            {aba === 'documentos' && (
              <section className="bg-deep-ocean border border-ocean-depth rounded-2xl p-5 flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sea-foam font-semibold text-xs uppercase tracking-wider">Documentos</h3>
                  <button onClick={() => fileRef.current?.click()}
                    className="min-h-[40px] px-4 bg-electric-cyan text-midnight rounded-xl text-xs font-semibold">
                    + Anexar
                  </button>
                  <input ref={fileRef} type="file" className="hidden" onChange={handleUpload}
                    accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" />
                </div>

                {docs.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-steel text-sm">Nenhum documento anexado</p>
                    <p className="text-steel text-xs mt-1">PDF, imagens e documentos Word aceitos</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    {docs.map(d => {
                      const isPdf = d.tipo_mime?.includes('pdf')
                      const isImg = d.tipo_mime?.includes('image')
                      const icon  = isPdf ? '📄' : isImg ? '🖼️' : '📎'
                      return (
                        <div key={d.id} className="bg-midnight rounded-2xl p-4 flex flex-col gap-2">
                          <div className="text-3xl text-center py-2">{icon}</div>
                          <p className="text-sea-foam text-xs font-medium text-center truncate">{d.nome}</p>
                          <p className="text-steel text-[10px] text-center">
                            {new Date(d.criado_em).toLocaleDateString('pt-BR')}
                          </p>
                          <div className="flex gap-2 mt-1">
                            <a href={`${process.env.NEXT_PUBLIC_API_URL}/colaboradores/documentos/${d.id}/download`}
                              target="_blank" rel="noopener noreferrer"
                              className="flex-1 min-h-[36px] bg-ocean-depth text-sea-foam rounded-lg text-xs flex items-center justify-center hover:bg-teal-current transition-colors">
                              Baixar
                            </a>
                            <button onClick={() => handleRemoverDoc(d.id)}
                              className="min-h-[36px] px-3 text-steel hover:text-red-400 rounded-lg hover:bg-ocean-depth transition-colors text-xs">
                              🗑️
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </section>
            )}

            {/* ── Logs ── */}
            {aba === 'logs' && (
              <section className="bg-deep-ocean border border-ocean-depth rounded-2xl p-5">
                <h3 className="text-sea-foam font-semibold text-xs uppercase tracking-wider mb-3">Histórico de acessos</h3>
                {logs.length === 0 ? (
                  <p className="text-steel text-sm text-center py-6">Nenhum acesso registrado</p>
                ) : (
                  <div className="flex flex-col gap-2">
                    {logs.map((l, i) => (
                      <div key={i} className="flex items-center justify-between bg-midnight rounded-xl px-4 py-3">
                        <div>
                          <p className={`text-sm font-medium ${l.tipo === 'login' ? 'text-mint-green' : 'text-steel'}`}>
                            {l.tipo === 'login' ? '▶ Login' : '◀ Logout'}
                          </p>
                          {l.ip && <p className="text-steel text-xs">IP: {l.ip}</p>}
                        </div>
                        <p className="text-steel text-xs">{new Date(l.criado_em).toLocaleString('pt-BR')}</p>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            )}

          </div>
        </div>
      </main>
    </>
  )
}
