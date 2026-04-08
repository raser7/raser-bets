/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'brand': '#00ff66',
        'dark': '#000000'
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
