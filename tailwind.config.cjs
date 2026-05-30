/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#f0f7fb',
          100: '#e6f0f5',
          200: '#c8dfe9',
          300: '#a0c8d8',
          400: '#7aafc5',
          500: '#6a9fb8',
          600: '#5b8fa8',
          700: '#4a7a93',
          800: '#3a6078',
          900: '#2a4a5e',
        },
      },
    },
  },
  plugins: [],
}
