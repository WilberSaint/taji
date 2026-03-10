/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        wood: '#8B4513',
        tableGreen: '#2d5016',
        solar: '#FFB84D',
        eolica: '#A8D8EA',
        hidroelectrica: '#4FB3BF',
        geotermica: '#D4713B',
        player1: '#F4C430',
        player2: '#4A90E2',
        player3: '#E74C3C',
        player4: '#9B59B6',
      },
      backgroundImage: {
        'game-bg': "url('/assets/backgrounds/background.png')",
        'plant-eolica-on': "url('/assets/plants/eolica-on.png')",
        'plant-solar-on': "url('/assets/plants/solar-on.png')",
        'plant-hidro-on': "url('/assets/plants/hidroelectrica-on.png')",
        'plant-geo-on': "url('/assets/plants/geotermica-on.png')",
        'plant-eolica-off': "url('/assets/plants/eolica-off.png')",
        'plant-solar-off': "url('/assets/plants/solar-off.png')",
        'plant-hidro-off': "url('/assets/plants/hidroelectrica-off.png')",
        'plant-geo-off': "url('/assets/plants/geotermica-off.png')",
        'card-back': "url('/assets/cards/card-back.png')",
        'card-pattern': "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
      },
      animation: {
        'slide-up': 'slideUp 0.3s ease-out',
        'slide-down': 'slideDown 0.3s ease-out',
        'scale-in': 'scaleIn 0.2s ease-out',
        'shake': 'shake 0.5s ease-in-out',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        slideUp: {
          '0%': { transform: 'translateY(100px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideDown: {
          '0%': { transform: 'translateY(-100px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        scaleIn: {
          '0%': { transform: 'scale(0)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        shake: {
          '0%, 100%': { transform: 'translateX(0)' },
          '10%, 30%, 50%, 70%, 90%': { transform: 'translateX(-5px)' },
          '20%, 40%, 60%, 80%': { transform: 'translateX(5px)' },
        },
      },
    },
  },
  plugins: [],
}