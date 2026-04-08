/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        pos: {
          'bg-primary': 'var(--color-bg-primary)',
          'bg-surface': 'var(--color-bg-surface)',
          'bg-elevated': 'var(--color-bg-elevated)',
          'accent-primary': 'var(--color-accent-primary)',
          'accent-success': 'var(--color-accent-success)',
          'accent-warning': 'var(--color-accent-warning)',
          'accent-danger': 'var(--color-accent-danger)',
          'accent-info': 'var(--color-accent-info)',
          'text-primary': 'var(--color-text-primary)',
          'text-secondary': 'var(--color-text-secondary)',
          'text-disabled': 'var(--color-text-tertiary)',
          'border-default': 'var(--color-border-default)',
          'border-focus': 'var(--color-border-focus)',
        },
      },
      fontFamily: {
        display: ['var(--font-display)'],
        body: ['var(--font-body)'],
        mono: ['var(--font-mono)'],
      },
      fontSize: {
        'pos-xs': 'var(--text-nano)',
        'pos-sm': 'var(--text-xs)',
        'pos-base': 'var(--text-sm)',
        'pos-md': 'var(--text-base)',
        'pos-lg': 'var(--text-lg)',
        'pos-xl': 'var(--text-xl)',
        'pos-2xl': 'var(--text-2xl)',
        'pos-3xl': 'var(--text-3xl)',
        'pos-hero': 'var(--text-hero)',
      },
      borderRadius: {
        'pos-sm': 'var(--radius-sm)',
        'pos-md': 'var(--radius-md)',
        'pos-lg': 'var(--radius-lg)',
        'pos-xl': 'var(--radius-xl)',
        'pos-pill': 'var(--radius-pill)',
      },
      boxShadow: {
        'pos-subtle': 'var(--shadow-subtle)',
        'pos-card': 'var(--shadow-subtle)',
        'pos-modal': 'var(--shadow-dialog)',
        'pos-dialog': 'var(--shadow-dialog)',
      },
      letterSpacing: {
        'cal-tight': '-0.64px',
        'cal-loose': '0.1px',
        'inter-light': '-0.16px',
      },
      lineHeight: {
        'cal-tight': '1.10',
        'cal-loose': '1.40',
      }
    },
  },
  plugins: [],
}
