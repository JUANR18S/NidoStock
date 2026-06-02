/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Paleta cosmetológica: tonos suaves, elegantes y profesionales (rosados, dorados y neutros de alta gama)
        brand: {
          50: '#faf6f6',
          100: '#f3ecec',
          200: '#e7d8d8',
          300: '#d5bebe',
          400: '#bd9d9d',
          500: '#a37c7c',
          600: '#886060',
          700: '#724f4f',
          800: '#5e4242',
          900: '#4f3939',
          950: '#2a1d1d',
        },
        gold: {
          50: '#fbf8ee',
          100: '#f5eecf',
          200: '#ecdd9e',
          300: '#dfc463',
          400: '#d3aa37',
          500: '#b88d28',
          600: '#9b7020',
          700: '#7d541c',
          800: '#64431a',
          900: '#523719',
          950: '#2f1e0c',
        }
      },
      fontFamily: {
        sans: ['Outfit', 'Inter', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
