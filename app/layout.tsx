import type { Metadata, Viewport } from 'next'
import './globals.css'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://seoreunpick.vercel.app'

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: '서른픽 — 모임 날짜 한 번에 정하기',
  description:
    '카톡 투표의 한계를 넘는 모임 일정 투표. 미응답자 추적, 필수 참석자 조건, 과반 자동 판단까지.',
  openGraph: {
    title: '서른픽 — 모임 날짜 한 번에 정하기',
    description: '누가 되는지, 꼭 와야 할 사람은 되는지, 과반은 넘었는지 자동으로.',
    siteName: '서른픽',
    locale: 'ko_KR',
    type: 'website',
  },
  twitter: { card: 'summary_large_image' },
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
