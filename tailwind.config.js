/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
        colors: {
            frcRed: '#ed1c24',
            frcBlue: '#0066b3',
        }
    },
  },
  plugins: [],
}