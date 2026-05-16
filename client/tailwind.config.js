/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          50: '#F5F5F5',
          100: '#E8E8E8',
          200: '#D1D1D1',
          300: '#B9B9B9',
          400: '#808080',
          500: '#4D4D4D',
          600: '#1A3550',
          700: '#122338',
          800: '#0B1929',
          900: '#050C15',
        },
        gold: {
          50: '#FFFBF0',
          100: '#FFF7E6',
          200: '#FFECCD',
          300: '#FFE0B3',
          400: '#FFCE80',
          500: '#FBBF48',
          600: '#F5A623',
          700: '#D9851F',
          800: '#A86419',
          900: '#7D4A12',
        },
      },
      fontFamily: {
        barlow: ['Barlow', 'sans-serif'],
        'barlow-condensed': ['Barlow Condensed', 'sans-serif'],
      },
      backgroundColor: {
        primary: 'var(--navy)',
        surface: 'var(--surface)',
      },
      textColor: {
        primary: 'var(--text)',
        muted: 'var(--text-muted)',
      },
    },
  },
  plugins: [],
  darkMode: 'class',
}
