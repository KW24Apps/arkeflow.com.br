import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        midnight:        '#071828',
        'deep-ocean':    '#0D2B45',
        'ocean-depth':   '#1A4F72',
        'teal-current':  '#1B8B9A',
        'electric-cyan': '#00C8DC',
        'sea-foam':      '#E8F4F8',
        steel:           '#5B8AA8',
        'mint-green':    '#26FF93',
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
      },
      backgroundImage: {
        'ocean-gradient': 'linear-gradient(135deg, #071828, #0D2B45, #1B8B9A)',
      },
    },
  },
  plugins: [],
}

export default config
