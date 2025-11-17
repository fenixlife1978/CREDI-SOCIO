/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        starbucks: {
          green: '#00754a',
          light: '#1e3932',
          brown: '#b3764c',
          cream: '#f3f1e7',
          black: '#212121',
          white: '#ffffff'
        }
      }
    }
  },
  plugins: [],
}