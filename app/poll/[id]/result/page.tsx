import Link from 'next/link'
import { notFound } from 'next/navigation'
import ConfirmButton from '@/components/ConfirmButton'
import ShareBar from '@/components/ShareBar'
import { getPollBundle } from '@/lib/db'
import { formatKo, formatShort } from '@/lib/date'
import { analyze, type DateAnalysis, type Tier } from '@/lib/recommend'
import type { VoteStatus } from '@/lib/types'

export const dynamic = 'force-dynamic'

const TIER_META: Record<Tier, { dot: string; label: string; ring: string }> = {
  green: { dot: '🟢', label: '확정 추천', ring: 'border-emerald-200 bg-emerald-50/60' },
  yellow: { dot: '🟡', label: '조건부', ring: 'border-amber-200 bg-amber-50/50' },
  gray: { dot: '⚪', label: '탈락', ring: 'border-slate-200 bg-white' },
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
        <Link href="/" className="text-xs text-slate-400">
          ← 서른픽
        </Link>
        <h1 className="mt-1 text-lg font-extrabold leading-snug">{poll.title}</h1>
        <p className="mt-0.5 text-xs text-slate-400">
          {poll.hostName}님의 모임, 정족수 {poll.quorum}명, 멤버 {members.length}명
        </p>
      </header>

      <div className="mb-4">
        <ShareBar pollId={poll.id} highlight={justCreated} />
      </div>

      {/* 확정됨 / 추천 배너 */}
      {confirmedDate ? (
        <div className="mb-4 rounded-2xl border border-emerald-300 bg-emerald-50 p-4">
          <p className="text-xs font-semibold text-emerald-600">✅ 날짜가 확정됐어요</p>
          <p className="mt-1 text-2xl font-extrabold text-emerald-900">
            {formatKo(confirmedDate.date)}
          </p>
          <div className="mt-3 flex items-center gap-2">
            <a
              href={`/api/poll/${poll.id}/ics?dateId=${confirmedDate.id}`}
              className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white"
            >
              📅 캘린더에 저장(.ics)
            </a>
            <ConfirmButton
              pollId={poll.id}
              pollDateId={confirmedDate.id}
              confirmed
            />
          </div>
        </div>
      ) : (
        <RecommendBanner rec={rec} pollId={poll.id} />
      )}

      {/* 응답 현황 */}
      <section className="mb-5 rounded-2xl border border-slate-200 bg-white p-4">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-sm font-semibold">응답 현황</p>
          <p className="text-sm font-bold text-brand">
            {rec.respondedMembers}/{rec.totalMembers}명
          </p>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-brand transition-all"
            style={{ width: `${(rec.respondedMembers / Math.max(1, rec.totalMembers)) * 100}%` }}
          />
        </div>
        {rec.noResponseMembers.length > 0 ? (
          <div className="mt-3">
            <p className="mb-1.5 text-xs text-slate-400">아직 응답 안 한 사람</p>
            <div className="flex flex-wrap gap-1.5">
              {rec.noResponseMembers.map((n) => (
                <span
                  key={n}
                  className="rounded-full border border-dashed border-slate-300 px-2.5 py-1 text-xs text-slate-500"
                >
                  {n}
                </span>
              ))}
            </div>
          </div>
        ) : (
          <p className="mt-3 text-xs font-medium text-emerald-600">🎉 전원 응답 완료!</p>
        )}
      </section>

      {/* 후보 날짜 (랭킹순) */}
      <section className="mb-5">
        <h2 className="mb-2 text-sm font-semibold text-slate-600">후보 날짜 (추천순)</h2>
        <div className="space-y-3">
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
      <section className="mb-6">
        <h2 className="mb-2 text-sm font-semibold text-slate-600">한눈에 보기 (사람 × 날짜)</h2>
        <Grid bundle={bundle} />
      </section>

      <div className="text-center">
        <Link href={`/poll/${poll.id}`} className="text-sm font-medium text-brand">
          ← 내 투표 수정하러 가기
        </Link>
      </div>
    </main>
  )
}

// ── 추천 배너 ─────────────────────────────────────────────────────────────────

function RecommendBanner({
  rec,
  pollId,
}: {
  rec: ReturnType<typeof analyze>
  pollId: string
}) {
  if (rec.best) {
    const a = rec.best
    return (
      <div className="mb-4 rounded-2xl border border-emerald-300 bg-emerald-50 p-4">
        <p className="text-xs font-semibold text-emerald-600">🟢 이 날이 제일 좋아요</p>
        <p className="mt-1 text-2xl font-extrabold text-emerald-900">{formatKo(a.date)}</p>
        <p className="mt-1 text-sm text-emerald-700">
          가능 {a.count}명, 필수 참석자 전원 OK, 정족수 충족
        </p>
        <div className="mt-3">
          <ConfirmButton pollId={pollId} pollDateId={a.pollDateId} confirmed={false} variant="primary" />
        </div>
      </div>
    )
  }

  if (rec.bestFallback) {
    const a = rec.bestFallback
    return (
      <div className="mb-4 rounded-2xl border border-amber-300 bg-amber-50 p-4">
        <p className="text-xs font-semibold text-amber-600">🟡 아직 확정 추천이 없어요</p>
        <p className="mt-1 text-xl font-extrabold text-amber-900">
          가장 근접: {formatKo(a.date)}
        </p>
        <ul className="mt-1.5 space-y-0.5 text-sm text-amber-800">
          {a.reasons.map((r) => (
            <li key={r}>• {r}</li>
          ))}
        </ul>
        {a.canBecomeGreen && (
          <p className="mt-2 rounded-lg bg-white/70 px-2.5 py-1.5 text-xs text-amber-700">
            💡 미응답 {a.noneNames.length}명이 모두 가능(O)하면 확정 추천이 돼요
          </p>
        )}
      </div>
    )
  }

  return (
    <div className="mb-4 rounded-2xl border border-slate-200 bg-white p-4 text-center">
      <p className="text-sm text-slate-500">아직 응답을 기다리고 있어요 🙏</p>
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
    <div className={`rounded-2xl border p-4 ${confirmed ? 'border-emerald-400 bg-emerald-50' : meta.ring}`}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-[15px] font-bold">
            <span className="mr-1 text-xs font-medium text-slate-400">{rank}위</span>
            {formatKo(a.date)}
          </p>
          <p className="mt-0.5 text-xs font-medium text-slate-500">
            {meta.dot} {meta.label}, 가능 {a.count}명
          </p>
        </div>
        {a.tier === 'green' && !confirmed && (
          <ConfirmButton pollId={pollId} pollDateId={a.pollDateId} confirmed={false} />
        )}
        {confirmed && (
          <span className="rounded-lg bg-emerald-600 px-2.5 py-1 text-xs font-bold text-white">
            확정됨
          </span>
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
        <ul className="mt-3 space-y-0.5 border-t border-slate-200/70 pt-2.5 text-xs text-slate-500">
          {a.reasons.map((r) => (
            <li key={r}>• {r}</li>
          ))}
        </ul>
      )}

      {/* 도달 가능 시나리오 */}
      {a.canBecomeGreen && (
        <p className="mt-2 rounded-lg bg-brand/5 px-2.5 py-1.5 text-xs text-brand-700">
          💡 미응답 {a.noneNames.length}명이 모두 가능하면 🟢 확정 추천 ({a.potentialCount}명)
        </p>
      )}

      <div className="mt-3 flex items-center gap-3">
        <a
          href={`/api/poll/${pollId}/ics?dateId=${a.pollDateId}`}
          className="text-xs font-medium text-slate-400 hover:text-brand"
        >
          📅 .ics 저장
        </a>
      </div>
    </div>
  )
}

const CHIP_META: Record<VoteStatus | 'none', { label: string; cls: string }> = {
  O: { label: 'O', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  '△': { label: '△', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
  X: { label: 'X', cls: 'bg-slate-100 text-slate-500 border-slate-200' },
  none: { label: '미응답', cls: 'bg-white text-slate-400 border-dashed border-slate-300' },
}

function ChipRow({ status, names }: { status: VoteStatus | 'none'; names: string[] }) {
  if (names.length === 0) return null
  const m = CHIP_META[status]
  return (
    <div className="flex flex-wrap items-center gap-1">
      <span className="mr-1 inline-block min-w-[1.5rem] shrink-0 text-xs font-bold text-slate-400">
        {m.label}
      </span>
      {names.map((n) => (
        <span key={n} className={`rounded-full border px-2 py-0.5 text-xs ${m.cls}`}>
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
        return 'bg-emerald-500 text-white'
      case '△':
        return 'bg-amber-400 text-white'
      case 'X':
        return 'bg-slate-300 text-slate-600'
      default:
        return 'bg-slate-50 text-slate-300'
    }
  }

  return (
    <div className="thin-scroll overflow-x-auto rounded-2xl border border-slate-200 bg-white">
      <table className="w-full border-collapse text-center text-xs">
        <thead>
          <tr>
            <th className="sticky left-0 z-10 bg-white px-2 py-2 text-left font-semibold text-slate-500">
              멤버
            </th>
            {dates.map((d) => (
              <th key={d.id} className="px-1 py-2 font-semibold text-slate-500">
                {formatShort(d.date)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {members.map((m) => (
            <tr key={m.id} className="border-t border-slate-100">
              <td className="sticky left-0 z-10 whitespace-nowrap bg-white px-2 py-1.5 text-left font-medium text-slate-700">
                {m.isAnchor && <span className="mr-0.5">⭐</span>}
                {m.name}
              </td>
              {dates.map((d) => {
                const s = lookup.get(`${m.id}:${d.id}`)
                return (
                  <td key={d.id} className="px-1 py-1.5">
                    <span
                      className={`mx-auto flex h-7 w-7 items-center justify-center rounded-md font-bold ${cellCls(s)}`}
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
