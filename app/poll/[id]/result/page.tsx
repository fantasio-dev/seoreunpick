import Link from 'next/link'
import { notFound } from 'next/navigation'
import ConfirmButton from '@/components/ConfirmButton'
import ShareBar from '@/components/ShareBar'
import { getPollBundle } from '@/lib/db'
import { formatKo } from '@/lib/date'
import { analyze, type DateAnalysis } from '@/lib/recommend'

export const dynamic = 'force-dynamic'

const TIER_DOT = { green: '🟢', yellow: '🟡', gray: '⚪' } as const

export default async function ResultPage({
  params,
  searchParams,
}: {
  params: { id: string }
  searchParams: { created?: string }
}) {
  const bundle = await getPollBundle(params.id)
  if (!bundle) notFound()

  const { poll, dates, members } = bundle
  const rec = analyze(bundle)
  const anchorNames = members.filter((m) => m.isAnchor).map((m) => m.name)
  const confirmedDate = poll.confirmedPollDateId
    ? dates.find((d) => d.id === poll.confirmedPollDateId)
    : null
  const justCreated = searchParams.created === '1'

  // 히어로로 올린 날짜는 아래 "다른 날짜" 목록에서 제외
  const heroId = confirmedDate?.id ?? rec.best?.pollDateId ?? rec.bestFallback?.pollDateId ?? null
  const others = rec.ranked.filter((a) => a.pollDateId !== heroId)

  return (
    <main>
      <header className="mb-4">
        <Link href="/" className="text-[13px] font-bold text-ink-500">
          ← 서른픽
        </Link>
        <h1 className="mt-1.5 text-[22px] font-extrabold leading-snug text-ink">{poll.title}</h1>
        <p className="mt-1 text-[13px] font-medium text-ink-500">
          {poll.hostName}님의 모임, 멤버 {members.length}명, 정족수 {poll.quorum}명
        </p>
      </header>

      <div className="mb-4">
        <ShareBar pollId={poll.id} highlight={justCreated} />
      </div>

      {/* 히어로 — 확정됨 / 추천 1개 크게 */}
      {confirmedDate ? (
        <div className="mb-5 rounded-2xl bg-ok-light p-5">
          <p className="text-[13px] font-bold text-ok-ink">✅ 날짜가 확정됐어요</p>
          <p className="mt-1.5 text-[30px] font-extrabold leading-tight text-ink">
            {formatKo(confirmedDate.date)}
          </p>
          <div className="mt-4 flex items-center gap-2">
            <a
              href={`/api/poll/${poll.id}/ics?dateId=${confirmedDate.id}`}
              className="rounded-xl bg-ok px-4 py-2.5 text-sm font-bold text-white active:scale-95"
            >
              📅 캘린더에 저장
            </a>
            <ConfirmButton pollId={poll.id} pollDateId={confirmedDate.id} confirmed />
          </div>
        </div>
      ) : (
        <Hero rec={rec} anchorNames={anchorNames} pollId={poll.id} />
      )}

      {/* 안 한 사람 */}
      <section className="card mb-5 p-5">
        <div className="mb-2 flex items-baseline justify-between">
          <p className="text-[15px] font-bold text-ink">안 한 사람</p>
          <p className="text-[15px] font-bold text-brand">
            {rec.totalMembers - rec.respondedMembers}
            <span className="text-ink-400"> / {rec.totalMembers}명</span>
          </p>
        </div>
        {rec.noResponseMembers.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {rec.noResponseMembers.map((n) => (
              <span
                key={n}
                className="rounded-full border border-dashed border-line-strong px-3 py-1 text-[13px] font-medium text-ink-600"
              >
                {n}
              </span>
            ))}
          </div>
        ) : (
          <p className="text-[13px] font-bold text-ok-ink">🎉 전원 응답 완료!</p>
        )}
      </section>

      {/* 다른 날짜 — 압축 목록 */}
      {others.length > 0 && (
        <section className="mb-7">
          <h2 className="mb-2 text-[13px] font-bold text-ink-500">다른 날짜</h2>
          <div className="card divide-y divide-line/70">
            {others.map((a) => (
              <OtherRow key={a.pollDateId} a={a} pollId={poll.id} />
            ))}
          </div>
        </section>
      )}

      <div className="text-center">
        <Link href={`/poll/${poll.id}`} className="text-sm font-bold text-brand">
          ← 내 투표 수정하러 가기
        </Link>
      </div>
    </main>
  )
}

// ── 히어로(대표 추천) ─────────────────────────────────────────────────────────

function Hero({
  rec,
  anchorNames,
  pollId,
}: {
  rec: ReturnType<typeof analyze>
  anchorNames: string[]
  pollId: string
}) {
  if (rec.best) {
    const a = rec.best
    const anchorLine =
      anchorNames.length > 0 ? `, 필수 참석 ${anchorNames.map((n) => `⭐${n}`).join(' ')} 가능` : ''
    return (
      <div className="mb-5 rounded-2xl bg-ok-light p-5">
        <p className="text-[13px] font-bold text-ok-ink">🟢 이 날이 제일 좋아요</p>
        <p className="mt-1.5 text-[30px] font-extrabold leading-tight text-ink">{formatKo(a.date)}</p>
        <p className="mt-1.5 text-sm font-medium text-ink-700">
          가능 {a.count}명{anchorLine}
        </p>
        <div className="mt-4">
          <ConfirmButton pollId={pollId} pollDateId={a.pollDateId} confirmed={false} variant="primary" />
        </div>
      </div>
    )
  }

  if (rec.bestFallback) {
    const a = rec.bestFallback
    return (
      <div className="mb-5 rounded-2xl bg-maybe-light p-5">
        <p className="text-[13px] font-bold text-maybe-ink">🟡 아직 딱 맞는 날이 없어요</p>
        <p className="mt-1.5 text-[24px] font-extrabold leading-tight text-ink">
          가장 근접 {formatKo(a.date)}
        </p>
        <ul className="mt-2 space-y-1 text-sm font-medium text-ink-700">
          {a.reasons.map((r) => (
            <li key={r}>• {r}</li>
          ))}
        </ul>
        {a.canBecomeGreen && (
          <p className="mt-3 rounded-xl bg-white/70 px-3 py-2 text-[13px] font-medium text-maybe-ink">
            💡 안 한 {a.noneNames.length}명이 모두 가능하면 확정 추천이 돼요
          </p>
        )}
      </div>
    )
  }

  return (
    <div className="card mb-5 p-6 text-center">
      <p className="text-3xl">🙏</p>
      <p className="mt-2 text-sm font-medium text-ink-600">아직 응답을 기다리고 있어요</p>
    </div>
  )
}

// ── 다른 날짜 한 줄 ───────────────────────────────────────────────────────────

function OtherRow({ a, pollId }: { a: DateAnalysis; pollId: string }) {
  const sub =
    a.reasons.length > 0 ? a.reasons.join(', ') : a.anchorsOk ? '필수 참석 가능' : ''
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <span className="text-[15px]">{TIER_DOT[a.tier]}</span>
      <div className="min-w-0 flex-1">
        <p className="text-[15px] font-bold text-ink">
          {formatKo(a.date)} <span className="font-medium text-ink-500">가능 {a.count}명</span>
        </p>
        {sub && <p className="truncate text-[12px] font-medium text-ink-500">{sub}</p>}
      </div>
      <ConfirmButton pollId={pollId} pollDateId={a.pollDateId} confirmed={false} />
    </div>
  )
}
