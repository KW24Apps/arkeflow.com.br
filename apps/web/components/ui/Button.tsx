import { ButtonHTMLAttributes } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean
  variant?: 'primary' | 'ghost'
}

export function Button({ loading, variant = 'primary', className = '', children, disabled, ...props }: ButtonProps) {
  const base = 'w-full py-3 px-4 rounded-xl font-semibold text-sm transition-all duration-200 outline-none'

  const variants = {
    primary: 'bg-electric-cyan text-midnight hover:bg-[rgba(0,239,255,0.85)] focus-visible:shadow-[0_0_0_2px_rgba(0,239,255,0.35)] disabled:opacity-50 disabled:cursor-not-allowed',
    ghost:   'border border-ocean-depth text-steel hover:bg-[rgba(255,255,255,0.06)] hover:text-sea-foam hover:border-[rgba(255,255,255,0.30)] focus-visible:shadow-[0_0_0_2px_rgba(255,255,255,0.25)]',
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
