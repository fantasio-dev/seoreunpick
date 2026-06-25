import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import ConfirmButton from '@/components/ConfirmButton'
import CopyLine from '@/components/CopyLine'
import ShareBar from '@/components/ShareBar'
import { getPollBundle } from '@/lib/db'
import { deadlineLabel, formatKo, isDeadlinePassed } from '@/lib/date'
import { analyze, type DateAnalysis } from '@/lib/recommend'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const bundle = await getPollBundle(params.id)
  if (!bundle) return { title: '서른픽' }
  return {
    title: `${bundle.poll.title} — 서른픽`,
    description: '모임 날짜 투표 결과 보기',
    openGraph: { title: bundle.poll.title, description: '모임 날짜 투표, 서른픽' },
  }
}

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
  const votingClosed = isDeadlinePassed(poll.deadline)
  // 마감됐는데 자동 확정이 안 됨(조건 충족 날짜 없음) → 방장이 직접 골라야 함
  const closedUnresolved = votingClosed && !confirmedDate

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
        {poll.deadline && !votingClosed && (
          <p className="mt-2 inline-flex rounded-full bg-brand-light px-3 py-1 text-[12px] font-bold text-brand">
            ⏰ {deadlineLabel(poll.deadline)}
          </p>
        )}
      </header>

      <div className="mb-4">
        <ShareBar pollId={poll.id} highlight={justCreated} />
      </div>

      {closedUnresolved && (
        <div className="mb-4 rounded-2xl bg-maybe-light p-4">
          <p className="text-[13px] font-bold text-maybe-ink">⏰ 투표가 마감됐어요</p>
          <p className="mt-1 text-[13px] font-medium text-ink-700">
            조건(필수 참석자, 정족수)을 충족한 날짜가 없어 자동 확정되지 않았어요. 아래에서 직접 골라 확정해 주세요.
          </p>
        </div>
      )}

      {/* 히어로 — 확정됨 / 추천 1개 크게 */}
      {confirmedDate ? (
        <div className="mb-5 rounded-2xl bg-ok-light p-5">
          <p className="text-[13px] font-bold text-ok-ink">
            ✅ 날짜가 확정됐어요{poll.deadline && votingClosed ? ' (마감 자동 확정)' : ''}
          </p>
          <p className="mt-1.5 text-[30px] font-extrabold leading-tight text-ink">
            {formatKo(confirmedDate.date)}
          </p>
          <p className="mt-1 text-sm font-medium text-ink-700">이제 카톡에 알리고 캘린더에 저장하세요</p>
          <div className="mt-3 flex items-center gap-2">
            <a
              href={`/api/poll/${poll.id}/ics?dateId=${confirmedDate.id}`}
              className="rounded-xl bg-ok px-4 py-2.5 text-sm font-bold text-white active:scale-95"
            >
              📅 캘린더에 저장
            </a>
            <ConfirmButton pollId={poll.id} pollDateId={confirmedDate.id} confirmed />
          </div>
          <div className="mt-3">
            <CopyLine
              pollId={poll.id}
              linkTo="result"
              tone="ok"
              message={`📅 "${poll.title}"\n${formatKo(confirmedDate.date)}로 정했어요! 다들 캘린더 비워두기 🙆`}
            />
          </div>
        </div>
      ) : (
        <Hero rec={rec} anchorNames={anchorNames} pollId={poll.id} title={poll.title} />
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
          <>
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
            {/* 미응답 독촉 — 마감 전, 미확정일 때만 */}
            {!confirmedDate && !votingClosed && (
              <div className="mt-3">
                <CopyLine
                  pollId={poll.id}
                  linkTo="vote"
                  message={`⏰ "${poll.title}" 날짜 투표 아직이에요${
                    poll.deadline ? ` (${deadlineLabel(poll.deadline)})` : ''
                  }\n${rec.noResponseMembers.join(', ')} 링크 열고 O/X만 찍어주면 끝이에요 🙏`}
                />
              </div>
            )}
          </>
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
  title,
}: {
  rec: ReturnType<typeof analyze>
  anchorNames: string[]
  pollId: string
  title: string
}) {
  const noResp = rec.noResponseMembers

  if (rec.best) {
    const a = rec.best
    const anchorLine =
      anchorNames.length > 0 ? `, 필수 참석 ${anchorNames.map((n) => `⭐${n}`).join(' ')} 가능` : ''
    const msg = `🗓️ "${title}" 날짜 투표!\n지금 ${formatKo(a.date)}이 베스트 (${a.count}명 가능).${
      noResp.length ? ` ${noResp.join(', ')}만 찍으면 끝!` : ' 거의 다 됐어요!'
    }`
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
        <div className="mt-3">
          <CopyLine pollId={pollId} linkTo="vote" tone="ok" message={msg} />
        </div>
      </div>
    )
  }

  if (rec.bestFallback) {
    const a = rec.bestFallback
    const msg = `🗓️ "${title}" 날짜 투표 중!\n아직 다 맞는 날이 없어요.${
      noResp.length ? ` ${noResp.join(', ')} 아직이에요 🙏` : ''
    } 한 번씩 봐주세요!`
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
        <div className="mt-3">
          <CopyLine pollId={pollId} linkTo="vote" message={msg} />
        </div>
      </div>
    )
  }

  return (
    <div className="mb-5 rounded-2xl bg-brand-light p-5 text-center">
      <p className="text-sm font-bold text-brand-dark">아직 아무도 투표하지 않았어요</p>
      <p className="mt-1 text-[13px] font-medium text-ink-600">멤버들에게 링크를 보내볼까요?</p>
      <div className="mt-3 text-left">
        <CopyLine
          pollId={pollId}
          linkTo="vote"
          message={`🗓️ "${title}" 날짜 정하자!\n링크 열어서 되는 날 O/X 찍어줘 🙏`}
        />
      </div>
    </div>
  )
}

// ── 다른 날짜 한 줄 ───────────────────────────────────────────────────────────

function OtherRow({ a, pollId }: { a: DateAnalysis; pollId: string }) {
  return (
    <div className="flex items-start gap-3 px-4 py-3">
      <span className="mt-0.5 text-[15px]">{TIER_DOT[a.tier]}</span>
      <div className="min-w-0 flex-1">
        <p className="text-[15px] font-bold text-ink">
          {formatKo(a.date)} <span className="font-medium text-ink-500">가능 {a.count}명</span>
        </p>
        <div className="mt-1 flex flex-wrap gap-1">
          {/* 막는 이유를 또렷한 칩으로 앞세운다 */}
          {a.anchorIssues.map((ai) => (
            <span
              key={ai.name}
              className="rounded-md bg-rose-50 px-1.5 py-0.5 text-[12px] font-bold text-rose-600"
            >
              ⭐{ai.name} {ai.status === 'X' ? '불가' : '미응답'}
            </span>
          ))}
          {!a.quorumOk && (
            <span className="rounded-md bg-maybe-light px-1.5 py-0.5 text-[12px] font-bold text-maybe-ink">
              정족수 −{a.quorumShort}
            </span>
          )}
          {a.tier === 'green' && (
            <span className="rounded-md bg-ok-light px-1.5 py-0.5 text-[12px] font-bold text-ok-ink">
              조건 충족
            </span>
          )}
        </div>
      </div>
      <ConfirmButton pollId={pollId} pollDateId={a.pollDateId} confirmed={false} />
    </div>
  )
}
