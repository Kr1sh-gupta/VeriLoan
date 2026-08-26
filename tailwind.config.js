/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        background: '#070B14',
        surface: '#0D1527',
        'surface-card': '#131F37',
        'surface-border': '#1E2E4E',
        cyber: {
          cyan: '#06B6D4',
          emerald: '#10B981',
          amber: '#F59E0B',
          rose: '#EF4444',
          indigo: '#6366F1',
          violet: '#8B5CF6'
        }
      },
      fontFamily: {
        sans: ['Outfit', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace']
      },
      animation: {
        'pulse-glow': 'pulseGlow 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'float-slow': 'floatSlow 4s ease-in-out infinite',
        'scanline': 'scanline 6s linear infinite',
        'data-stream': 'dataStream 3s linear infinite'
      },
      keyframes: {
        pulseGlow: {
          '0%, 100%': { opacity: '1', filter: 'drop-shadow(0 0 15px rgba(6, 182, 212, 0.6))' },
          '50%': { opacity: '0.6', filter: 'drop-shadow(0 0 5px rgba(6, 182, 212, 0.2))' },
        },
        floatSlow: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-8px)' },
        },
        scanline: {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(1000%)' }
        },
        dataStream: {
          '0%': { strokeDashoffset: '100' },
          '100%': { strokeDashoffset: '0' }
        }
      }
    },
  },
  plugins: [],
}
