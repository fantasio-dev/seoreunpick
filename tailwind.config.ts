import type { Config } from 'tailwindcss'

// 토스/당근 스타일 토큰: 화이트 베이스 + 토스블루 단색 포인트 + 또렷한 그레이 스케일.
const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: { DEFAULT: '#3182F6', dark: '#2272EB', light: '#E8F3FF' },
        ink: {
          DEFAULT: '#191F28', // 본문 강조
          800: '#333D4B',
          700: '#4E5968', // 보조 텍스트
          600: '#6B7684',
          500: '#8B95A1', // 힌트
          400: '#B0B8C1',
        },
        line: { DEFAULT: '#E5E8EB', strong: '#D1D6DB' },
        surface: { DEFAULT: '#FFFFFF', sunken: '#F2F4F6', page: '#F9FAFB' },
        ok: { DEFAULT: '#15B364', light: '#E7F8EF', ink: '#0F9D58' }, // O 가능
        maybe: { DEFAULT: '#F5A623', light: '#FEF4E6', ink: '#C77700' }, // △ 애매
        no: { DEFAULT: '#8B95A1', light: '#F2F4F6', ink: '#6B7684' }, // X 불가
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
      borderRadius: {
        '2xl': '16px',
        '3xl': '20px',
      },
      boxShadow: {
        card: '0 1px 2px rgba(16,24,40,.04)',
        float: '0 4px 16px rgba(16,24,40,.10)',
      },
      keyframes: {
        'confetti-fall': {
          '0%': { transform: 'translateY(-12%) rotate(0deg)', opacity: '1' },
          '100%': { transform: 'translateY(110vh) rotate(540deg)', opacity: '0' },
        },
      },
      animation: {
        'confetti-fall': 'confetti-fall 1.6s ease-in forwards',
      },
    },
  },
  plugins: [],
}

export default config
