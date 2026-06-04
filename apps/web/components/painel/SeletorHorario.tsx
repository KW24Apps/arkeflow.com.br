'use client'

const DIAS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

interface Props {
  dias:       number[] | null
  horaInicio: string
  horaFim:    string
  onChange:   (dias: number[] | null, horaInicio: string, horaFim: string) => void
}

export function SeletorHorario({ dias, horaInicio, horaFim, onChange }: Props) {
  const ativo = dias !== null

  function toggleAtivo() {
    onChange(ativo ? null : [1, 2, 3, 4, 5], '08:00', '18:00')
  }

  function toggleDia(d: number) {
    if (!dias) return
    const novo = dias.includes(d) ? dias.filter(x => x !== d) : [...dias, d].sort()
    onChange(novo.length ? novo : [d], horaInicio, horaFim)
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sea-foam text-sm font-medium">Restrição de horário</p>
          <p className="text-steel text-xs">Bloqueia acesso fora do período definido</p>
        </div>
        <button type="button" onClick={toggleAtivo}
          className={`w-12 h-6 rounded-full transition-colors relative shrink-0 ${ativo ? 'bg-electric-cyan' : 'bg-ocean-depth'}`}>
          <span className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${ativo ? 'left-7' : 'left-1'}`} />
        </button>
      </div>

      {ativo && (
        <>
          <div className="flex gap-1.5 flex-wrap">
            {DIAS.map((nome, i) => (
              <button key={i} type="button" onClick={() => toggleDia(i)}
                className={`min-h-[40px] px-3 rounded-xl text-xs font-medium border transition-colors ${
                  dias?.includes(i) ? 'bg-electric-cyan text-midnight border-electric-cyan' : 'border-ocean-depth text-steel'
                }`}>
                {nome}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-steel uppercase tracking-wider">Entrada</label>
              <input type="time" value={horaInicio} onChange={e => onChange(dias, e.target.value, horaFim)}
                className="min-h-[48px] bg-midnight border border-ocean-depth rounded-xl px-4 text-sm text-sea-foam outline-none focus:border-electric-cyan" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-steel uppercase tracking-wider">Saída</label>
              <input type="time" value={horaFim} onChange={e => onChange(dias, horaInicio, e.target.value)}
                className="min-h-[48px] bg-midnight border border-ocean-depth rounded-xl px-4 text-sm text-sea-foam outline-none focus:border-electric-cyan" />
            </div>
          </div>
        </>
      )}
    </div>
  )
}
