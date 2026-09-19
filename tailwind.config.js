/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#2E5C38', // A slightly lighter forest green based on screenshots
          dark: '#1E3F24',
          light: '#3E6F4A',
        },
        secondary: {
          DEFAULT: '#D4AF37', // Gold
          dark: '#B5952F',
          light: '#E5C558',
        },
        background: '#F8F9FA',
        text: {
          DEFAULT: '#1F2937',
          muted: '#6B7280',
        }
      },
      fontFamily: {
        sans: ['Inter', 'Roboto', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
