/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          50:  '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
          800: '#166534',
          900: '#14532d',
        },
        mango: {
          50:  '#fffbeb',
          100: '#fef3c7',
          200: '#fde68a',
          300: '#fcd34d',
          400: '#fbbf24',
          500: '#f59e0b',
          600: '#d97706',
        },
        surface: '#f8fafc',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
        '4xl': '2rem',
      },
      boxShadow: {
        'card':    '0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.06)',
        'card-md': '0 2px 6px rgba(0,0,0,0.08), 0 8px 24px rgba(0,0,0,0.08)',
        'card-lg': '0 4px 12px rgba(0,0,0,0.10), 0 16px 40px rgba(0,0,0,0.10)',
        'btn':     '0 2px 4px rgba(22,163,74,0.25), 0 4px 12px rgba(22,163,74,0.20)',
        'btn-lg':  '0 4px 8px rgba(22,163,74,0.30), 0 8px 20px rgba(22,163,74,0.25)',
        'inner-top': 'inset 0 1px 0 rgba(255,255,255,0.15)',
      },
      backgroundImage: {
        'gradient-header': 'linear-gradient(135deg, #16a34a 0%, #15803d 50%, #14532d 100%)',
        'gradient-card':   'linear-gradient(145deg, #ffffff 0%, #f8fafc 100%)',
        'gradient-btn':    'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
      },
    },
  },
  plugins: [],
}
