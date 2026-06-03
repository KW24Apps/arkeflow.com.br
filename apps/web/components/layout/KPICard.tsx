interface KPICardProps {
  label: string
  value: string | number
  sub?: string
  accent?: 'cyan' | 'green' | 'yellow' | 'red'
}

const accents = {
  cyan:   'border-l-electric-cyan',
  green:  'border-l-mint-green',
  yellow: 'border-l-yellow-400',
  red:    'border-l-red-400',
}

export function KPICard({ label, value, sub, accent = 'cyan' }: KPICardProps) {
  return (
    <div className={`bg-deep-ocean border border-ocean-depth border-l-4 ${accents[accent]} rounded-2xl p-5`}>
      <p className="text-steel text-xs uppercase tracking-wider mb-2">{label}</p>
      <p className="text-sea-foam text-2xl font-bold">{value}</p>
      {sub && <p className="text-steel text-xs mt-1">{sub}</p>}
    </div>
  )
}
