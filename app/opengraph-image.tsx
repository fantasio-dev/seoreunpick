import { ImageResponse } from 'next/og'
import { pretendardBold } from '@/lib/og-font'

export const runtime = 'nodejs'
export const alt = '서른픽 — 모임 날짜 한 번에 정하기'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function Image() {
  const font = await pretendardBold()

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          background: '#FFFFFF',
          padding: 80,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              background: '#3182F6',
              color: '#FFFFFF',
              fontSize: 40,
              padding: '14px 34px',
              borderRadius: 9999,
            }}
          >
            서른픽
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', fontSize: 92, color: '#191F28', lineHeight: 1.15 }}>
            모임 날짜, 한 번에 정해요
          </div>
          <div style={{ display: 'flex', fontSize: 40, color: '#6B7684', marginTop: 28 }}>
            누가 되는지, 꼭 와야 할 사람은 되는지 자동으로
          </div>
        </div>

        <div style={{ display: 'flex', gap: 16 }}>
          <Pill bg="#E7F8EF" color="#0F9D58" text="O 가능" />
          <Pill bg="#F2F4F6" color="#6B7684" text="X 불가" />
          <Pill bg="#FEF4E6" color="#C77700" text="필수 참석 조건" />
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [{ name: 'Pretendard', data: font, weight: 700, style: 'normal' }],
    },
  )
}

function Pill({ bg, color, text }: { bg: string; color: string; text: string }) {
  return (
    <div
      style={{
        display: 'flex',
        background: bg,
        color,
        fontSize: 32,
        padding: '12px 26px',
        borderRadius: 9999,
      }}
    >
      {text}
    </div>
  )
}
