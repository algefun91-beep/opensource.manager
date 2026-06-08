/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,ts,jsx,tsx}', './components/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-geist-sans)', 'ui-sans-serif'],
        mono: ['var(--font-geist-mono)', 'ui-monospace'],
      },
      colors: {
        night: {
          50: '#e8eaf6',
          100: '#c5caee',
          200: '#9fa8da',
          300: '#7986cb',
          400: '#5c6bc0',
          500: '#3949ab',
          600: '#303f9f',
          700: '#283593',
          800: '#1a237e',
          900: '#0a0f2e',
          950: '#030719',
        },
      },
    },
  },
  plugins: [],
};
