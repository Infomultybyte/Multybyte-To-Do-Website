/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        slate: {
          DEFAULT: '#426979',
          50: '#EEF3F4',
          100: '#DCE6E9',
          200: '#B9CDD3',
          300: '#96B4BD',
          400: '#729BA7',
          500: '#426979',
          600: '#365662',
          700: '#2A424B',
          800: '#1D2E35',
          900: '#111A1E',
        },
        lime: {
          DEFAULT: '#C6D30A',
          50: '#FBFDE7',
          100: '#F3F7C0',
          200: '#E7EF86',
          300: '#DBE750',
          400: '#C6D30A',
          500: '#A5AF09',
          600: '#7E8607',
        },
        paper: '#F5F7F8',
      },
      fontFamily: {
        sans: ['"Inter"', 'system-ui', 'sans-serif'],
      },
      letterSpacing: {
        tightest: '-0.03em',
      },
    },
  },
  plugins: [],
}
