import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        serif: ['Lora', 'Georgia', 'serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        border: '#e5e7eb',
        text: {
          primary: '#1a1a1a',
          secondary: '#6b7280',
        },
      },
      maxWidth: {
        content: '720px',
      },
    },
  },
  plugins: [],
}

export default config
