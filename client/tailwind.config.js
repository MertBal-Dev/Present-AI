/** @type {import('tailwindcss').Config} */
module.exports = {
 
  darkMode: 'class',
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        
        'dark-bg': '#111827',         
        'dark-card': '#1F2937',      
        'dark-border': '#374151',    
        'dark-text': '#E5E7EB',      
        'dark-text-secondary': '#9CA3AF', 
        'dark-primary': '#8B5CF6',   
        'dark-secondary': '#A78BFA', 
      },
      animation: {
        'float-subtle': 'float-subtle 4s ease-in-out infinite',
      },
      keyframes: {
        'float-subtle': {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-8px)' },
        }
      }
    },
  },
  plugins: [
    require('tailwindcss-scrollbar'),
  ],
}