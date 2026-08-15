/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}'
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#FFF5ED',
          100: '#FFF0E5',
          200: '#FFD6B3',
          500: '#FF6600',
          600: '#E55C00',
          700: '#CC5200',
          900: '#0F172A',
          orange: '#FF6600',
          'orange-hover': '#E55C00',
          'orange-light': '#FFF5ED',
          navy: '#0F172A',
          'navy-light': '#1E293B',
        },
        navy: {
          800: '#0f172a',
          900: '#020617',
          950: '#010409'
        }
      },
      fontFamily: {
        sans: ['Inter', 'Outfit', 'sans-serif']
      }
    }
  },
  plugins: []
};
