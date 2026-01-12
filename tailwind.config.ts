import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        background: 'var(--background)',
        foreground: 'var(--foreground)',
        // Modern black & yellow palette
        flick: {
          black: {
            DEFAULT: '#0a0a0a', // Deep black with slight warmth
            light: '#1a1a1a', // Slightly lighter for depth
            lighter: '#2a2a2a', // Even lighter for subtle contrast
            dark: '#000000', // Pure black for accents
            muted: '#0f0f0f', // Between black and light
          },
          yellow: {
            DEFAULT: '#FFD700', // Classic gold
            light: '#FFE44D', // Bright yellow
            lighter: '#FFF176', // Soft yellow
            dark: '#FFC107', // Amber
            darker: '#FFB300', // Deep amber
            accent: '#FFEB3B', // Vibrant accent
            muted: '#FFD70080', // Semi-transparent
            glow: '#FFD70040', // Subtle glow
          },
        },
      },
      fontFamily: {
        playfair: ['var(--font-playfair)', 'serif'],
        inter: ['var(--font-inter)', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
export default config;
