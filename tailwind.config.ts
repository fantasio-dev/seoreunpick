import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // 포인트 컬러 1개 (보라 계열) — O/△/X 의 초록/노랑/회색과 충돌하지 않게 선택
        brand: {
          DEFAULT: '#6257e6',
          50: '#f1f0fe',
          100: '#e5e3fd',
          600: '#6257e6',
          700: '#4f44cf',
        },
      },
      fontFamily: {
        sans: [
          'Pretendard',
          '-apple-system',
          'BlinkMacSystemFont',
          'system-ui',
          'Segoe UI',
          'Apple SD Gothic Neo',
          'sans-serif',
        ],
      },
      boxShadow: {
        card: '0 1px 2px rgba(16,24,40,.05), 0 1px 3px rgba(16,24,40,.06)',
      },
    },
  },
  plugins: [],
}

export default config
