import { InputHTMLAttributes, forwardRef } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string
  error?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className = '', ...props }, ref) => (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-medium text-steel uppercase tracking-wider">
        {label}
      </label>
      <input
        ref={ref}
        {...props}
        className={`
          bg-midnight border rounded-xl px-4 py-3 text-sm text-sea-foam
          placeholder-ocean-depth outline-none transition-all
          border-ocean-depth focus:border-electric-cyan focus:ring-1 focus:ring-electric-cyan/30
          ${error ? 'border-red-500' : ''}
          ${className}
        `}
      />
      {error && <span className="text-xs text-red-400">{error}</span>}
    </div>
  )
)

Input.displayName = 'Input'
