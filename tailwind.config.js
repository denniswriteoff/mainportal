const { nextui } = require("@nextui-org/react");

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './node_modules/@nextui-org/theme/dist/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {},
  },
  darkMode: "class",
  plugins: [
    nextui({
      themes: {
        light: {
          colors: {
            primary: {
              50: '#fefef9',
              100: '#fdfcf0',
              200: '#faf8e0',
              300: '#f5f3cc',
              400: '#f0edb8',
              500: '#E8E7BB',
              600: '#d4d299',
              700: '#b8b676',
              800: '#9c9a54',
              900: '#7a783b',
              DEFAULT: '#E8E7BB',
              foreground: '#1D1D1D',
            },
            focus: '#E8E7BB',
            foreground: {
              DEFAULT: '#1D1D1D',
            },
          },
        },
      },
    }),
  ],
}

