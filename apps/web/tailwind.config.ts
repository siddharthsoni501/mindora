import type { Config } from 'tailwindcss'

export default {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      colors: {
        'mindora-violet': '#8b5cf6',
        'mindora-indigo': '#6366f1',
        'mindora-cyan': '#06b6d4',
        'mindora-emerald': '#10b981',
      },
    },
  },
  plugins: [],
} satisfies Config
