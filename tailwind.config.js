/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'brand': 'var(--color-brand)',
        'dark': '#1a1a1a'
      },
      keyframes: {
        shine: {
          '0%': { transform: 'translateX(-100%) skew(-12deg)' },
          '100%': { transform: 'translateX(200%) skew(-12deg)' },
        }
      }
    },
  },
  plugins: [],
}
