const colors = require('tailwindcss/colors');
const defaultTheme = require('tailwindcss/defaultTheme');

module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}', './public/index.html'],
  theme: {
    extend: {
      colors: {
        // Bleu de marque « médical » — ancré sur #2563EB, décliné en gamme complète
        primary: {
          50: '#eff5ff',
          100: '#dbe8fe',
          200: '#bfd7fe',
          300: '#93bbfd',
          400: '#6096fa',
          500: '#3b76f6',
          600: '#2563eb',
          700: '#1d54d4',
          800: '#1e46ab',
          900: '#1e3e87',
          950: '#172952',
        },
        brand: {
          50: '#eff5ff',
          100: '#dbe8fe',
          200: '#bfd7fe',
          300: '#93bbfd',
          400: '#6096fa',
          500: '#3b76f6',
          600: '#2563eb',
          700: '#1d54d4',
          800: '#1e46ab',
          900: '#1e3e87',
          950: '#172952',
        },
        // Neutres — teinte froide « clinique », lisible et calme
        ink: colors.slate,
        success: colors.emerald,
        warning: colors.amber,
        danger: colors.red,
      },
      fontFamily: {
        sans: ['"Hanken Grotesk"', ...defaultTheme.fontFamily.sans],
      },
      boxShadow: {
        card: '0 1px 2px 0 rgb(16 24 40 / 0.04), 0 1px 3px 0 rgb(16 24 40 / 0.06)',
        elevated:
          '0 4px 6px -1px rgb(16 24 40 / 0.08), 0 2px 4px -2px rgb(16 24 40 / 0.06)',
        pop: '0 12px 28px -8px rgb(16 24 40 / 0.18), 0 6px 12px -6px rgb(16 24 40 / 0.10)',
        focus: '0 0 0 3px rgb(37 99 235 / 0.18)',
      },
      borderRadius: {
        xl: '0.875rem',
        '2xl': '1.125rem',
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'none' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'scale-in': {
          '0%': { opacity: '0', transform: 'scale(0.96)' },
          '100%': { opacity: '1', transform: 'none' },
        },
        'toast-in': {
          '0%': { opacity: '0', transform: 'translateY(-8px) scale(0.98)' },
          '100%': { opacity: '1', transform: 'none' },
        },
        'overlay-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.5s cubic-bezier(0.16, 1, 0.3, 1) both',
        'fade-in': 'fade-in 0.4s ease both',
        'scale-in': 'scale-in 0.18s cubic-bezier(0.16, 1, 0.3, 1) both',
        'toast-in': 'toast-in 0.28s cubic-bezier(0.16, 1, 0.3, 1) both',
        'overlay-in': 'overlay-in 0.2s ease both',
      },
    },
  },
  plugins: [],
};
