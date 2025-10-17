/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#00ffff', // Azul neon Volxo
        'primary-dark': '#00cccc',
        'bg-dark': '#0a0a0a',
        'bg-card': '#111111',
      },
      boxShadow: {
        'neon': '0 0 10px rgba(0, 255, 255, 0.5), 0 0 20px rgba(0, 255, 255, 0.3)',
        'neon-strong': '0 0 15px rgba(0, 255, 255, 0.7), 0 0 30px rgba(0, 255, 255, 0.5)',
      },
      animation: {
        'pulse-neon': 'pulse-neon 2s ease-in-out infinite',
      },
      keyframes: {
        'pulse-neon': {
          '0%, 100%': { 
            boxShadow: '0 0 10px rgba(0, 255, 255, 0.5), 0 0 20px rgba(0, 255, 255, 0.3)' 
          },
          '50%': { 
            boxShadow: '0 0 20px rgba(0, 255, 255, 0.8), 0 0 40px rgba(0, 255, 255, 0.6)' 
          },
        }
      }
    },
  },
  plugins: [
    function ({ addUtilities, theme }) {
      const newUtilities = {
        '.text-shadow-neon': {
          textShadow: '0 0 10px rgba(0, 255, 255, 0.8), 0 0 20px rgba(0, 255, 255, 0.5)',
        },
        '.text-shadow-neon-strong': {
          textShadow: '0 0 15px rgba(0, 255, 255, 1), 0 0 30px rgba(0, 255, 255, 0.7)',
        },
      }
      addUtilities(newUtilities, ['responsive', 'hover'])
    }
  ],
}

