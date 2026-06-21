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
  themeColor: '#3182F6',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <head>
        {/* 토스풍 한글 타이포를 위한 Pretendard */}
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css"
        />
      </head>
      <body>
        <div className="mx-auto min-h-dvh max-w-md bg-surface-page px-5 pb-20 pt-6">{children}</div>
      </body>
    </html>
  )
}
