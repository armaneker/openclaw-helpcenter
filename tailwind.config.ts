import type { Config } from 'tailwindcss';
import typography from '@tailwindcss/typography';

const config: Config = {
  content: [
    './src/**/*.{ts,tsx,md,mdx}',
    './mdx-components.tsx',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eef2ff',
          100: '#e0e7ff',
          200: '#c7d2fe',
          300: '#a5b4fc',
          400: '#818cf8',
          500: '#6366f1',
          600: '#4f46e5',
          700: '#4338ca',
          800: '#3730a3',
          900: '#312e81',
        },
      },
      typography: {
        invert: {
          css: {
            '--tw-prose-body': 'rgb(209 213 219)',
            '--tw-prose-headings': 'rgb(243 244 246)',
            '--tw-prose-links': 'rgb(129 140 248)',
            '--tw-prose-bold': 'rgb(243 244 246)',
            '--tw-prose-counters': 'rgb(156 163 175)',
            '--tw-prose-bullets': 'rgb(107 114 128)',
            '--tw-prose-hr': 'rgb(55 65 81)',
            '--tw-prose-quotes': 'rgb(209 213 219)',
            '--tw-prose-quote-borders': 'rgb(75 85 99)',
            '--tw-prose-captions': 'rgb(156 163 175)',
            '--tw-prose-code': 'rgb(243 244 246)',
            '--tw-prose-pre-code': 'rgb(209 213 219)',
            '--tw-prose-pre-bg': 'rgb(17 24 39)',
            '--tw-prose-th-borders': 'rgb(75 85 99)',
            '--tw-prose-td-borders': 'rgb(55 65 81)',
          },
        },
      },
    },
  },
  plugins: [typography],
};

export default config;
