import { getPollBundle } from '@/lib/db'
import { buildIcs } from '@/lib/ics'

export const dynamic = 'force-dynamic'

export function GET(req: Request, { params }: { params: { id: string } }) {
  const bundle = getPollBundle(params.id)
  if (!bundle) return new Response('Not found', { status: 404 })

  const url = new URL(req.url)
  const dateIdParam = url.searchParams.get('dateId')
  const targetId = dateIdParam ? Number(dateIdParam) : bundle.poll.confirmedPollDateId

  const pd = bundle.dates.find((d) => d.id === targetId)
  if (!pd) return new Response('확정/지정된 날짜가 없습니다.', { status: 400 })

  const ics = buildIcs({
    title: bundle.poll.title,
    date: pd.date,
    uid: `${bundle.poll.id}-${pd.id}@seoreunpick`,
  })

  return new Response(ics, {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': `attachment; filename="seoreunpick-${pd.date}.ics"`,
    },
  })
}
