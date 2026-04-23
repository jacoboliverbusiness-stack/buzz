/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,jsx,ts,tsx}',
    './features/**/*.{js,jsx,ts,tsx}',
    './components/**/*.{js,jsx,ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        'hive-black': '#0A0A0A',
        'buzz-yellow': '#FFD60A',
        'honey-white': '#FEFCF3',
        'surface': '#141414',
        'surface-2': '#1E1E1E',
        'muted': '#666666',
      },
    },
  },
  plugins: [],
};
