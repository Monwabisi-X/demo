/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Design system: minimal cream white, with a bit of black and maroon.
        cream: {
          DEFAULT: '#FAF7F2', // page background
          50: '#FDFCFA',
          100: '#FAF7F2',
          200: '#F3EDE3', // panel / card surface
          300: '#E8DFD1', // borders / dividers
          400: '#D8CBB6',
        },
        ink: {
          DEFAULT: '#1A1613', // near-black text
          soft: '#4A4340', // muted text
          faint: '#8A817C', // captions
        },
        maroon: {
          DEFAULT: '#6E1423', // primary accent
          light: '#8C1D30',
          dark: '#4E0E19',
          tint: '#F4E4E6', // subtle maroon wash
        },
      },
      fontFamily: {
        // System-safe serif for headings (presentation gravitas), sans for body.
        serif: ['Georgia', 'Cambria', '"Times New Roman"', 'serif'],
        sans: ['ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'Helvetica', 'Arial', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 2px rgba(26,22,19,0.04), 0 8px 24px rgba(26,22,19,0.06)',
        lift: '0 12px 40px rgba(26,22,19,0.12)',
      },
      borderRadius: {
        xl: '0.9rem',
        '2xl': '1.25rem',
      },
      keyframes: {
        'fade-in': { from: { opacity: '0', transform: 'translateY(6px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        'slide-up': { from: { opacity: '0', transform: 'translateY(16px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
      },
      animation: {
        'fade-in': 'fade-in 0.3s ease-out',
        'slide-up': 'slide-up 0.35s ease-out',
      },
    },
  },
  plugins: [],
};
