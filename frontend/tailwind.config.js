/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink: { 900: '#141418', 800: '#1e1e24', 700: '#2b2b36' },
        violet: { DEFAULT: '#7c3aed', soft: '#c4b5fd', deep: '#3b2a63' },
        gain: '#ff5765',
        loss: '#26d98a',
        stale: '#c08a4a',
        ink_text: '#f8fafc',
        muted: '#8b93a7'
      },
      fontFamily: {
        num: ['"Space Grotesk"', '"Noto Sans TC"', 'sans-serif'],
        tc: ['"Noto Sans TC"', '"Space Grotesk"', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'monospace']
      },
      transitionTimingFunction: {
        ticket: 'cubic-bezier(.23,1,.32,1)'
      }
    }
  },
  plugins: []
}
