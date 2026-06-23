import { ImageResponse } from 'next/og'
import { getPollBundle } from '@/lib/db'
import { formatKo } from '@/lib/date'
import { pretendardBold } from '@/lib/og-font'
import { analyze } from '@/lib/recommend'

export const runtime = 'nodejs'
export const alt = '서른픽 모임 날짜 투표'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function Image({ params }: { params: { id: string } }) {
  const font = await pretendardBold()
  const bundle = await getPollBundle(params.id)

  let title = '서른픽'
  let status = '모임 날짜 투표'
  let accent = '#3182F6'
  let statusBg = '#E8F3FF'
  let statusColor = '#2272EB'

  if (bundle) {
    const rec = analyze(bundle)
    title = bundle.poll.title
    const confirmed = bundle.poll.confirmedPollDateId
      ? bundle.dates.find((d) => d.id === bundle.poll.confirmedPollDateId)
      : null
    if (confirmed) {
      status = `${formatKo(confirmed.date)} 확정!`
      statusBg = '#E7F8EF'
      statusColor = '#0F9D58'
    } else if (rec.best) {
      status = `추천 ${formatKo(rec.best.date)}, ${rec.respondedMembers}/${rec.totalMembers}명 응답`
    } else {
      status = `날짜 투표 중, ${rec.respondedMembers}/${rec.totalMembers}명 응답`
    }
  }

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
        <div style={{ display: 'flex' }}>
          <div
            style={{
              display: 'flex',
              background: accent,
              color: '#FFFFFF',
              fontSize: 36,
              padding: '12px 30px',
              borderRadius: 9999,
            }}
          >
            서른픽
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            fontSize: title.length > 18 ? 64 : 80,
            color: '#191F28',
            lineHeight: 1.2,
          }}
        >
          {title}
        </div>

        <div style={{ display: 'flex' }}>
          <div
            style={{
              display: 'flex',
              background: statusBg,
              color: statusColor,
              fontSize: 40,
              padding: '18px 36px',
              borderRadius: 24,
            }}
          >
            {status}
          </div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [{ name: 'Pretendard', data: font, weight: 700, style: 'normal' }],
    },
  )
}
