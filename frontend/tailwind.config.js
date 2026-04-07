/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        pos: {
          'bg-primary': '#0F0F1A',
          'bg-surface': '#1A1A2E',
          'bg-elevated': '#252540',
          'accent-primary': '#FF6B35',
          'accent-success': '#10D98A',
          'accent-warning': '#F5A623',
          'accent-danger': '#FF4757',
          'accent-info': '#4FC3F7',
          'text-primary': '#F5F5F0',
          'text-secondary': '#A0A0B8',
          'text-disabled': '#4A4A6A',
          'border-default': '#2E2E4A',
          'border-focus': '#FF6B35',
        },
      },
      fontFamily: {
        display: ['Sora', 'sans-serif'],
        body: ['IBM Plex Sans Thai', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      fontSize: {
        'pos-xs': '11px',
        'pos-sm': '13px',
        'pos-base': '15px',
        'pos-md': '17px',
        'pos-lg': '20px',
        'pos-xl': '24px',
        'pos-2xl': '32px',
        'pos-3xl': '48px',
        'pos-hero': '64px',
      },
      borderRadius: {
        'pos-sm': '6px',
        'pos-md': '10px',
        'pos-lg': '16px',
        'pos-xl': '24px',
      },
      boxShadow: {
        'pos-card': '0 2px 8px rgba(0,0,0,0.4)',
        'pos-modal': '0 16px 48px rgba(0,0,0,0.6)',
        'pos-float': '0 4px 16px rgba(255,107,53,0.3)',
      },
    },
  },
  plugins: [],
}
