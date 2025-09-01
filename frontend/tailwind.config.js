/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{vue,js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Primary blue color palette based on UI/UX spec
        primary: {
          50: '#e3f2fd',
          100: '#bbdefb',
          200: '#90caf9',
          300: '#64b5f6',
          400: '#42a5f5',
          500: '#2196f3', // Primary Blue: #2196F3 from spec
          600: '#1976d2', // Primary Blue: #1976D2 from spec (main actions)
          700: '#1565c0',
          800: '#0d47a1',
          900: '#0d47a1',
        },
        // Success green palette
        success: {
          50: '#e8f5e8',
          100: '#c8e6c9',
          200: '#a5d6a7',
          300: '#81c784',
          400: '#66bb6a',
          500: '#4caf50', // Success Green: #4CAF50 from spec
          600: '#43a047',
          700: '#388e3c', // Success Green: #388E3C from spec (completed states)
          800: '#2e7d32',
          900: '#1b5e20',
        },
        // Warning orange palette
        warning: {
          50: '#fff8e1',
          100: '#ffecb3',
          200: '#ffe082',
          300: '#ffd54f',
          400: '#ffca28',
          500: '#ffc107',
          600: '#ffb300',
          700: '#ff9800', // Processing: #FF9800 from spec (orange)
          800: '#f57c00', // Warning Orange: #F57C00 from spec
          900: '#e65100',
        },
        // Error red palette
        error: {
          50: '#ffebee',
          100: '#ffcdd2',
          200: '#ef9a9a',
          300: '#e57373',
          400: '#ef5350',
          500: '#f44336',
          600: '#e53935',
          700: '#d32f2f', // Error Red: #D32F2F from spec
          800: '#c62828',
          900: '#b71c1c',
        },
        // Info blue palette
        info: {
          50: '#e1f5fe',
          100: '#b3e5fc',
          200: '#81d4fa',
          300: '#4fc3f7',
          400: '#29b6f6',
          500: '#03a9f4',
          600: '#039be5',
          700: '#0288d1', // Info Blue: #0288D1 from spec
          800: '#0277bd',
          900: '#01579b',
        },
        // Status-specific colors
        status: {
          processing: '#ff9800', // Processing: #FF9800 from spec
          complete: '#4caf50',   // Complete: #4CAF50 from spec
          issues: '#ff5722',     // Issues: #FF5722 from spec
          onhold: '#9e9e9e',     // On Hold: #9E9E9E from spec
        },
        // Neutral colors from UI/UX spec
        neutral: {
          50: '#fafafa',   // Background Gray: #FAFAFA
          100: '#f5f5f5',
          200: '#eeeeee',
          300: '#e0e0e0',  // Light Gray: #E0E0E0 (borders, dividers)
          400: '#bdbdbd',
          500: '#9e9e9e',
          600: '#757575',  // Medium Gray: #757575 (secondary text, labels)
          700: '#616161',
          800: '#424242',
          900: '#212121',  // Dark Gray: #212121 (primary text, headers)
        },
      },
      fontFamily: {
        sans: ['Inter', 'Roboto', 'Segoe UI', 'Helvetica Neue', 'system-ui', 'sans-serif'],
        mono: ['Roboto Mono', 'Consolas', 'Monaco', 'monospace'],
      },
      fontSize: {
        // Type scale from UI/UX spec
        'page-title': ['32px', { lineHeight: '1.2', fontWeight: '700' }],      // H1 - Page Title
        'section-header': ['24px', { lineHeight: '1.3', fontWeight: '500' }], // H2 - Section Header
        'subsection': ['20px', { lineHeight: '1.4', fontWeight: '500' }],     // H3 - Subsection
        'card-title': ['18px', { lineHeight: '1.4', fontWeight: '500' }],     // H4 - Card Title
        'body-primary': ['16px', { lineHeight: '1.5', fontWeight: '400' }],   // Body - Primary
        'body-secondary': ['14px', { lineHeight: '1.5', fontWeight: '400' }], // Body - Secondary
        'small-text': ['12px', { lineHeight: '1.4', fontWeight: '400' }],     // Small Text
        'button-text': ['14px', { lineHeight: '1.4', fontWeight: '500' }],    // Button Text
      },
      spacing: {
        // Base spacing unit: 8px from UI/UX spec
        'xs': '4px',   // XS: 4px (tight spacing)
        'sm': '8px',   // SM: 8px (small spacing)
        'md': '16px',  // MD: 16px (default spacing)
        'lg': '24px',  // LG: 24px (section spacing)
        'xl': '32px',  // XL: 32px (major section spacing)
        'xxl': '48px', // XXL: 48px (page-level spacing)
      },
      maxWidth: {
        'container': '1200px', // Container Max Width from spec
      },
      borderRadius: {
        'card': '8px',    // Card border radius from spec
        'button': '8px',  // Button border radius from spec
        'input': '8px',   // Input border radius from spec
      },
      boxShadow: {
        'card': '0 2px 4px rgba(0,0,0,0.1)',           // Card shadow from spec
        'card-hover': '0 4px 8px rgba(0,0,0,0.15)',    // Card hover shadow
        'focus': '0 0 0 3px rgba(33, 150, 243, 0.1)',  // Focus shadow
      },
      animation: {
        'spin-slow': 'spin 3s linear infinite',
        'pulse-subtle': 'pulse 3s ease-in-out infinite',
        'bounce-subtle': 'bounce 2s ease-in-out 3',
      },
      screens: {
        'tablet': '768px',   // Tablet breakpoint from spec
        'desktop': '1024px', // Desktop breakpoint from spec
      },
    },
  },
  plugins: [],
}
