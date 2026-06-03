import { ButtonHTMLAttributes } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean
  variant?: 'primary' | 'ghost'
}

export function Button({ loading, variant = 'primary', className = '', children, disabled, ...props }: ButtonProps) {
  const base = 'w-full py-3 px-4 rounded-xl font-semibold text-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-electric-cyan/50'

  const variants = {
    primary: 'bg-electric-cyan text-midnight hover:bg-teal-current disabled:opacity-50 disabled:cursor-not-allowed',
    ghost:   'border border-ocean-depth text-steel hover:text-sea-foam hover:border-teal-current',
  }

  return (
    <button
      {...props}
      disabled={disabled || loading}
      className={`${base} ${variants[variant]} ${className}`}
    >
      {loading ? (
        <span className="flex items-center justify-center gap-2">
          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
          </svg>
          Aguarde...
        </span>
      ) : children}
    </button>
  )
}
