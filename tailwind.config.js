/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        table: {
          dark: '#0a2318',
          green: '#14452f',
          light: '#1d5c41',
          accent: '#2a855e'
        },
        gold: {
          400: '#fbbf24',
          500: '#f59e0b',
          600: '#d97706',
        }
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
      animation: {
        'card-play': 'cardPlay 0.3s ease-out forwards',
        'pulse-fast': 'pulse 1s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'bounce-short': 'bounce 0.5s ease-in-out 2',
      },
      keyframes: {
        cardPlay: {
          '0%': { transform: 'scale(0.8) translateY(40px)', opacity: '0' },
          '100%': { transform: 'scale(1) translateY(0)', opacity: '1' },
        }
      }
    },
  },
  plugins: [],
}
