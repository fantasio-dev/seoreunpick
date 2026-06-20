import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: '서른픽 — 모임 날짜 한 번에 정하기',
  description:
    '카톡 투표의 한계를 넘는 모임 일정 투표. 미응답자 추적, 필수 참석자 조건, 과반 자동 판단까지.',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#6257e6',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>
        <div className="mx-auto min-h-dvh max-w-md bg-slate-50 px-4 pb-16 pt-5">{children}</div>
      </body>
    </html>
  )
}
