import Link from 'next/link'
import { notFound } from 'next/navigation'
import ConfirmButton from '@/components/ConfirmButton'
import ShareBar from '@/components/ShareBar'
import { getPollBundle } from '@/lib/db'
import { formatKo, formatShort } from '@/lib/date'
import { analyze, type DateAnalysis, type Tier } from '@/lib/recommend'
import type { VoteStatus } from '@/lib/types'

export const dynamic = 'force-dynamic'

const TIER_META: Record<Tier, { dot: string; label: string; card: string; pill: string }> = {
  green: {
    dot: '🟢',
    label: '확정 추천',
    card: 'bg-ok-light',
    pill: 'bg-ok text-white',
  },
  yellow: {
    dot: '🟡',
    label: '조건부',
    card: 'bg-maybe-light',
    pill: 'bg-maybe text-white',
  },
  gray: {
    dot: '⚪',
    label: '탈락',
    card: 'card',
    pill: 'bg-surface-sunken text-ink-600',
  },
}

export default function ResultPage({
  params,
  searchParams,
}: {
  params: { id: string }
  searchParams: { created?: string }
}) {
  const bundle = getPollBundle(params.id)
  if (!bundle) notFound()

  const { poll, dates, members } = bundle
  const rec = analyze(bundle)
  const confirmedDate = poll.confirmedPollDateId
    ? dates.find((d) => d.id === poll.confirmedPollDateId)
    : null
  const justCreated = searchParams.created === '1'

  return (
    <main>
      <header className="mb-4">
        <Link href="/" className="text-[13px] font-bold text-ink-500">
          ← 서른픽
        </Link>
        <h1 className="mt-1.5 text-[22px] font-extrabold leading-snug text-ink">{poll.title}</h1>
        <p className="mt-1 text-[13px] font-medium text-ink-500">
          {poll.hostName}님의 모임, 정족수 {poll.quorum}명, 멤버 {members.length}명
        </p>
      </header>

      <div className="mb-4">
        <ShareBar pollId={poll.id} highlight={justCreated} />
      </div>

      {/* 확정됨 / 추천 배너 */}
      {confirmedDate ? (
        <div className="mb-4 rounded-2xl bg-ok-light p-5">
          <p className="text-[13px] font-bold text-ok-ink">✅ 날짜가 확정됐어요</p>
          <p className="mt-1.5 text-[28px] font-extrabold leading-tight text-ink">
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
        <RecommendBanner rec={rec} pollId={poll.id} />
      )}

      {/* 응답 현황 */}
      <section className="card mb-6 p-5">
        <div className="mb-2.5 flex items-baseline justify-between">
          <p className="text-[15px] font-bold text-ink">응답 현황</p>
          <p className="text-[15px] font-bold text-brand">
            {rec.respondedMembers}
            <span className="text-ink-400"> / {rec.totalMembers}명</span>
          </p>
        </div>
        <div className="h-2.5 overflow-hidden rounded-full bg-surface-sunken">
          <div
            className="h-full rounded-full bg-brand transition-all"
            style={{ width: `${(rec.respondedMembers / Math.max(1, rec.totalMembers)) * 100}%` }}
          />
        </div>
        {rec.noResponseMembers.length > 0 ? (
          <div className="mt-4">
            <p className="mb-2 text-xs font-bold text-ink-500">아직 응답 안 한 사람</p>
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
          </div>
        ) : (
          <p className="mt-4 text-[13px] font-bold text-ok-ink">🎉 전원 응답 완료!</p>
        )}
      </section>

      {/* 후보 날짜 (랭킹순) */}
      <section className="mb-6">
        <h2 className="mb-2.5 text-[15px] font-bold text-ink">후보 날짜 추천순</h2>
        <div className="space-y-2.5">
          {rec.ranked.map((a, i) => (
            <DateCard
              key={a.pollDateId}
              a={a}
              rank={i + 1}
              pollId={poll.id}
              confirmed={poll.confirmedPollDateId === a.pollDateId}
            />
          ))}
        </div>
      </section>

      {/* 한눈에 그리드 */}
      <section className="mb-7">
        <h2 className="mb-2.5 text-[15px] font-bold text-ink">한눈에 보기</h2>
        <Grid bundle={bundle} />
      </section>

      <div className="text-center">
        <Link href={`/poll/${poll.id}`} className="text-sm font-bold text-brand">
          ← 내 투표 수정하러 가기
        </Link>
      </div>
    </main>
  )
}

// ── 추천 배너 ─────────────────────────────────────────────────────────────────

function RecommendBanner({ rec, pollId }: { rec: ReturnType<typeof analyze>; pollId: string }) {
  if (rec.best) {
    const a = rec.best
    return (
      <div className="mb-4 rounded-2xl bg-ok-light p-5">
        <p className="text-[13px] font-bold text-ok-ink">🟢 이 날이 제일 좋아요</p>
        <p className="mt-1.5 text-[28px] font-extrabold leading-tight text-ink">{formatKo(a.date)}</p>
        <p className="mt-1.5 text-sm font-medium text-ink-700">
          가능 {a.count}명, 필수 참석자 전원 OK, 정족수 충족
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
      <div className="mb-4 rounded-2xl bg-maybe-light p-5">
        <p className="text-[13px] font-bold text-maybe-ink">🟡 아직 확정 추천이 없어요</p>
        <p className="mt-1.5 text-[22px] font-extrabold leading-tight text-ink">
          가장 근접 {formatKo(a.date)}
        </p>
        <ul className="mt-2 space-y-1 text-sm font-medium text-ink-700">
          {a.reasons.map((r) => (
            <li key={r}>• {r}</li>
          ))}
        </ul>
        {a.canBecomeGreen && (
          <p className="mt-3 rounded-xl bg-white/70 px-3 py-2 text-[13px] font-medium text-maybe-ink">
            💡 미응답 {a.noneNames.length}명이 모두 가능(O)하면 확정 추천이 돼요
          </p>
        )}
      </div>
    )
  }

  return (
    <div className="card mb-4 p-6 text-center">
      <p className="text-3xl">🙏</p>
      <p className="mt-2 text-sm font-medium text-ink-600">아직 응답을 기다리고 있어요</p>
    </div>
  )
}

// ── 날짜 카드 ─────────────────────────────────────────────────────────────────

function DateCard({
  a,
  rank,
  pollId,
  confirmed,
}: {
  a: DateAnalysis
  rank: number
  pollId: string
  confirmed: boolean
}) {
  const meta = TIER_META[a.tier]
  return (
    <div className={`rounded-2xl p-4 ${confirmed ? 'bg-ok-light ring-2 ring-ok' : meta.card}`}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="flex items-center gap-1.5 text-[17px] font-extrabold text-ink">
            <span className="text-xs font-bold text-ink-400">{rank}위</span>
            {formatKo(a.date)}
          </p>
          <div className="mt-1 flex items-center gap-1.5">
            <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${meta.pill}`}>
              {meta.dot} {meta.label}
            </span>
            <span className="text-[13px] font-bold text-ink-600">가능 {a.count}명</span>
          </div>
        </div>
        {a.tier === 'green' && !confirmed && (
          <ConfirmButton pollId={pollId} pollDateId={a.pollDateId} confirmed={false} />
        )}
        {confirmed && (
          <span className="rounded-xl bg-ok px-3 py-1.5 text-[13px] font-bold text-white">확정됨</span>
        )}
      </div>

      {/* 이름 칩 */}
      <div className="mt-3 space-y-1.5">
        <ChipRow status="O" names={a.oNames} />
        <ChipRow status="△" names={a.maybeNames} />
        <ChipRow status="X" names={a.xNames} />
        {a.noneNames.length > 0 && <ChipRow status="none" names={a.noneNames} />}
      </div>

      {/* 사유 */}
      {a.reasons.length > 0 && (
        <ul className="mt-3 space-y-1 border-t border-line/70 pt-3 text-[13px] font-medium text-ink-600">
          {a.reasons.map((r) => (
            <li key={r}>• {r}</li>
          ))}
        </ul>
      )}

      {/* 도달 가능 시나리오 */}
      {a.canBecomeGreen && (
        <p className="mt-2.5 rounded-xl bg-brand-light px-3 py-2 text-[13px] font-medium text-brand-dark">
          💡 미응답 {a.noneNames.length}명이 모두 가능하면 🟢 확정 추천 ({a.potentialCount}명)
        </p>
      )}

      <div className="mt-3">
        <a
          href={`/api/poll/${pollId}/ics?dateId=${a.pollDateId}`}
          className="text-[13px] font-bold text-ink-400 active:text-brand"
        >
          📅 .ics 저장
        </a>
      </div>
    </div>
  )
}

const CHIP_META: Record<VoteStatus | 'none', { label: string; cls: string }> = {
  O: { label: 'O', cls: 'bg-ok-light text-ok-ink' },
  '△': { label: '△', cls: 'bg-maybe-light text-maybe-ink' },
  X: { label: 'X', cls: 'bg-surface-sunken text-no-ink' },
  none: { label: '미응답', cls: 'border border-dashed border-line-strong text-ink-400' },
}

function ChipRow({ status, names }: { status: VoteStatus | 'none'; names: string[] }) {
  if (names.length === 0) return null
  const m = CHIP_META[status]
  return (
    <div className="flex flex-wrap items-center gap-1">
      <span className="mr-1 inline-block min-w-[1.4rem] shrink-0 text-[13px] font-extrabold text-ink-400">
        {m.label}
      </span>
      {names.map((n) => (
        <span key={n} className={`rounded-full px-2.5 py-0.5 text-[13px] font-bold ${m.cls}`}>
          {n}
        </span>
      ))}
    </div>
  )
}

// ── 한눈에 그리드 ─────────────────────────────────────────────────────────────

function Grid({ bundle }: { bundle: ReturnType<typeof getPollBundle> }) {
  if (!bundle) return null
  const { members, dates, votes } = bundle
  const lookup = new Map<string, VoteStatus>()
  for (const v of votes) lookup.set(`${v.memberId}:${v.pollDateId}`, v.status)

  const cellCls = (s: VoteStatus | undefined) => {
    switch (s) {
      case 'O':
        return 'bg-ok text-white'
      case '△':
        return 'bg-maybe text-white'
      case 'X':
        return 'bg-line text-ink-600'
      default:
        return 'bg-surface-sunken text-ink-400'
    }
  }

  return (
    <div className="thin-scroll card overflow-x-auto">
      <table className="w-full border-collapse text-center text-[13px]">
        <thead>
          <tr>
            <th className="sticky left-0 z-10 bg-white px-3 py-2.5 text-left text-xs font-bold text-ink-500">
              멤버
            </th>
            {dates.map((d) => (
              <th key={d.id} className="px-1 py-2.5 text-xs font-bold text-ink-500">
                {formatShort(d.date)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {members.map((m) => (
            <tr key={m.id} className="border-t border-line/60">
              <td className="sticky left-0 z-10 whitespace-nowrap bg-white px-3 py-1.5 text-left font-bold text-ink-800">
                {m.isAnchor && <span className="mr-0.5">⭐</span>}
                {m.name}
              </td>
              {dates.map((d) => {
                const s = lookup.get(`${m.id}:${d.id}`)
                return (
                  <td key={d.id} className="px-1 py-1.5">
                    <span
                      className={`mx-auto flex h-8 w-8 items-center justify-center rounded-lg font-extrabold ${cellCls(s)}`}
                    >
                      {s ?? '–'}
                    </span>
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
