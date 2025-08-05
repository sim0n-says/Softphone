/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./public/**/*.{html,js}",
    "./*.html"
  ],
  theme: {
    extend: {
      colors: {
        'cyber-blue': '#3d5a73',
        'cyber-green': '#7a9bb3',
        'cyber-dark': '#0b0d13',
        'cyber-darker': '#0f1419',
        'cyber-gray': '#6b7c8c',
        'cyber-light': '#a8b8c8',
        'cyber-glow': '#7a9bb3',
        'cyber-danger': '#ff4757',
        'cyber-success': '#2ed573',
        'cyber-warning': '#ffa502'
      },
      fontFamily: {
        'cyber': ['Oxanium', 'Courier New', 'monospace'],
        'terminal': ['Courier New', 'monospace']
      },
      animation: {
        'glitch': 'glitch 0.3s infinite',
        'pulse-glow': 'pulse-glow 2s infinite',
        'scan-lines': 'scan-lines 10s linear infinite',
        'typing': 'typing 2s steps(40, end) infinite',
        'fade-in': 'fadeIn 0.5s ease-in',
        'slide-in-right': 'slideInRight 0.5s ease-out',
        'notification-slide': 'notification-slide 0.3s ease-out',
        'modal-zoom': 'modal-zoom 0.3s ease-out',
        'particle-float': 'particle-float 20s ease-in-out infinite',
        'loading-pulse': 'loading-pulse 1.5s ease-in-out infinite'
      },
      keyframes: {
        glitch: {
          '0%, 100%': { transform: 'translate(0)' },
          '20%': { transform: 'translate(-2px, 2px)' },
          '40%': { transform: 'translate(-2px, -2px)' },
          '60%': { transform: 'translate(2px, 2px)' },
          '80%': { transform: 'translate(2px, -2px)' }
        },
        'pulse-glow': {
          '0%, 100%': { 
            opacity: '1', 
            textShadow: '0 0 20px rgba(122, 155, 179, 0.5)' 
          },
          '50%': { 
            opacity: '0.7', 
            textShadow: '0 0 10px rgba(122, 155, 179, 0.3)' 
          }
        },
        'scan-lines': {
          '0%': { transform: 'translateY(0)' },
          '100%': { transform: 'translateY(100%)' }
        },
        typing: {
          '0%': { width: '0' },
          '50%': { width: '100%' },
          '100%': { width: '0' }
        },
        fadeIn: {
          'from': { opacity: '0', transform: 'translateY(20px)' },
          'to': { opacity: '1', transform: 'translateY(0)' }
        },
        slideInRight: {
          'from': { opacity: '0', transform: 'translateX(100%)' },
          'to': { opacity: '1', transform: 'translateX(0)' }
        },
        'notification-slide': {
          'from': { transform: 'translateX(-100%)', opacity: '0' },
          'to': { transform: 'translateX(0)', opacity: '1' }
        },
        'modal-zoom': {
          'from': { transform: 'scale(0.8)', opacity: '0' },
          'to': { transform: 'scale(1)', opacity: '1' }
        },
        'particle-float': {
          '0%, 100%': { transform: 'translateY(0px) rotate(0deg)' },
          '33%': { transform: 'translateY(-20px) rotate(120deg)' },
          '66%': { transform: 'translateY(10px) rotate(240deg)' }
        },
        'loading-pulse': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.5' }
        }
      },
      backdropBlur: {
        'xs': '2px',
      },
      boxShadow: {
        'cyber': '0 0 20px rgba(122, 155, 179, 0.3)',
        'cyber-inset': 'inset 0 0 10px rgba(122, 155, 179, 0.1)',
        'neon': '0 0 5px currentColor, 0 0 10px currentColor, 0 0 15px currentColor',
        'neon-border': '0 0 5px currentColor, 0 0 10px currentColor, inset 0 0 5px currentColor'
      },
      textShadow: {
        'neon': '0 0 5px currentColor, 0 0 10px currentColor, 0 0 15px currentColor, 0 0 20px currentColor'
      },
      backgroundImage: {
        'cyber-gradient': 'linear-gradient(135deg, #0b0d13 0%, #0f1419 100%)',
        'cyber-panel': 'linear-gradient(135deg, rgba(61, 90, 115, 0.3) 0%, rgba(122, 155, 179, 0.1) 100%)',
        'scan-lines': 'linear-gradient(transparent 50%, rgba(122, 155, 179, 0.1) 50%)'
      },
      backgroundSize: {
        'scan-lines': '100% 4px'
      }
    },
  },
  plugins: [
    function({ addUtilities }) {
      const newUtilities = {
        '.text-shadow-neon': {
          'text-shadow': '0 0 5px currentColor, 0 0 10px currentColor, 0 0 15px currentColor, 0 0 20px currentColor'
        },
        '.box-shadow-cyber': {
          'box-shadow': '0 0 10px rgba(122, 155, 179, 0.3), inset 0 0 10px rgba(122, 155, 179, 0.1)'
        },
        '.glass-effect': {
          'background': 'rgba(11, 13, 19, 0.7)',
          'backdrop-filter': 'blur(10px)',
          'border': '1px solid rgba(122, 155, 179, 0.2)'
        }
      }
      addUtilities(newUtilities)
    }
  ],
} 