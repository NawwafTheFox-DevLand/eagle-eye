import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        eagle: {
          50: '#E8F1FA', 100: '#C5DCF2', 200: '#8DB9E5', 300: '#5596D8',
          400: '#2E7BC4', 500: '#1A6FB5', 600: '#0F4C81', 700: '#0A3558',
          800: '#062440', 900: '#031528',
        },
        gold: {
          50: '#FDF8ED', 100: '#F9EDD1', 200: '#F0D89B', 300: '#F0C75E',
          400: '#D4A843', 500: '#B8912E', 600: '#8B6B1F', 700: '#5E4815',
          800: '#31250B', 900: '#1A1306',
        },
      },
      fontFamily: {
        sans: ['IBM Plex Sans Arabic', 'IBM Plex Sans', 'system-ui', 'sans-serif'],
        display: ['IBM Plex Sans Arabic', 'sans-serif'],
        mono: ['IBM Plex Mono', 'monospace'],
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-out',
        'slide-up': 'slideUp 0.4s ease-out',
        'slide-in-right': 'slideInRight 0.3s ease-out',
      },
      keyframes: {
        fadeIn: { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        slideUp: { '0%': { opacity: '0', transform: 'translateY(20px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
        slideInRight: { '0%': { opacity: '0', transform: 'translateX(20px)' }, '100%': { opacity: '1', transform: 'translateX(0)' } },
      },
    },
  },
  plugins: [],
};

export default config;
