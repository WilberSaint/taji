/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Sistema de diseño — todos apuntan a variables CSS (ver globals.css)
        paper: 'var(--paper)',
        surface: {
          DEFAULT: 'var(--surface)',
          2: 'var(--surface-2)',
        },
        ink: {
          DEFAULT: 'var(--ink)',
          soft: 'var(--ink-soft)',
          faint: 'var(--ink-faint)',
        },
        line: {
          DEFAULT: 'var(--line)',
          strong: 'var(--line-strong)',
        },
        primary: {
          DEFAULT: 'var(--primary)',
          hover: 'var(--primary-hover)',
          soft: 'var(--primary-soft)',
        },
        accent: 'var(--accent-bright)',
        energy: {
          solar: 'var(--solar)',
          eolica: 'var(--wind)',
          hidroelectrica: 'var(--hydro)',
          geotermica: 'var(--geo)',
        },
        state: {
          success: 'var(--success)',
          warning: 'var(--warning)',
          danger: 'var(--danger)',
          info: 'var(--info)',
        },
        player: {
          1: 'var(--player-1)',
          2: 'var(--player-2)',
          3: 'var(--player-3)',
          4: 'var(--player-4)',
        },
      },
      fontFamily: {
        display: ['"Bricolage Grotesk"', 'Trebuchet MS', 'sans-serif'],
        body: ['"Hanken Grotesk"', 'Segoe UI', 'system-ui', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      boxShadow: {
        e1: 'var(--sh-1)',
        e2: 'var(--sh-2)',
        e3: 'var(--sh-3)',
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
