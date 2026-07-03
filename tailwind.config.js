/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#eef2ff',
          100: '#e0e7ff',
          300: '#a5b4fc',
          400: '#818cf8',
          500: '#6366f1',
          600: '#4f46e5',
          700: '#4338ca',
        },
        th: {
          bg:      'rgb(var(--th-bg)      / <alpha-value>)',
          surface: 'rgb(var(--th-surface) / <alpha-value>)',
          card:    'rgb(var(--th-card)    / <alpha-value>)',
          raised:  'rgb(var(--th-raised)  / <alpha-value>)',
          border:  'rgb(var(--th-border)  / <alpha-value>)',
          text1:   'rgb(var(--th-text1)   / <alpha-value>)',
          text2:   'rgb(var(--th-text2)   / <alpha-value>)',
          text3:   'rgb(var(--th-text3)   / <alpha-value>)',
          text4:   'rgb(var(--th-text4)   / <alpha-value>)',
          text5:   'rgb(var(--th-text5)   / <alpha-value>)',
        },
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'SF Pro Display', 'Segoe UI', 'sans-serif'],
        mono: ['SF Mono', 'JetBrains Mono', 'Fira Code', 'ui-monospace', 'monospace'],
      },
      fontSize: {
        '2xs': ['0.65rem', { lineHeight: '1rem' }],
      },
      letterSpacing: {
        tighter: '-0.03em',
        tight:   '-0.02em',
        snug:    '-0.011em',
      },
      boxShadow: {
        'card':  'var(--shadow-card)',
        'modal': 'var(--shadow-modal)',
        'glow':  '0 0 20px rgba(99,102,241,0.25)',
      },
      backdropBlur: {
        xs: '4px',
      },
    },
  },
  plugins: [],
}
