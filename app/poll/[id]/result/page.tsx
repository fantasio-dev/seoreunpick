import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import Celebrate from '@/components/Celebrate'
import ConfirmButton from '@/components/ConfirmButton'
import CopyLine from '@/components/CopyLine'
import DateVoters from '@/components/DateVoters'
import PokeButton from '@/components/PokeButton'
import RememberRoom from '@/components/RememberRoom'
import ShareBar from '@/components/ShareBar'
import { getPollBundle, verifyManage } from '@/lib/db'
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
  searchParams: { created?: string; t?: string }
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
  // 방장 관리 토큰(?t=). 일치하면 확정/관리 가능. 토큰은 클라이언트에 그대로 노출하지 않고 권한 판단에만 쓴다.
  const token = searchParams.t ?? ''
  const canManage = await verifyManage(poll.id, token)
  // 마감됐는데 자동 확정이 안 됨(조건 충족 날짜 없음) → 방장이 직접 골라야 함
  const closedUnresolved = votingClosed && !confirmedDate

  // 히어로로 올린 날짜는 아래 "다른 날짜" 목록에서 제외
  // (초록·노랑이 없어도 투표가 있으면 가장 근접한 날을 히어로로 올리므로 그 날짜도 제외)
  const heroId =
    confirmedDate?.id ??
    rec.best?.pollDateId ??
    rec.bestFallback?.pollDateId ??
    (rec.respondedMembers > 0 ? rec.ranked[0]?.pollDateId ?? null : null)
  const others = rec.ranked.filter((a) => a.pollDateId !== heroId)

  return (
    <main>
      {canManage && <RememberRoom id={poll.id} title={poll.title} token={token} />}
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
        <ShareBar pollId={poll.id} title={poll.title} highlight={justCreated} />
      </div>

      {canManage && (
        <div className="mb-4 flex items-center justify-between rounded-2xl bg-surface-sunken px-4 py-2.5">
          <span className="text-[13px] font-bold text-ink-700">👑 방장이에요 (이 링크로 관리)</span>
          <Link
            href={`/poll/${poll.id}/manage?t=${token}`}
            className="text-[13px] font-bold text-brand"
          >
            방 수정/삭제
          </Link>
        </div>
      )}

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
          <Celebrate pollId={poll.id} />
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
            {canManage && (
              <ConfirmButton pollId={poll.id} pollDateId={confirmedDate.id} confirmed token={token} />
            )}
          </div>
          {canManage && (
            <div className="mt-3">
              <CopyLine
                pollId={poll.id}
                linkTo="result"
                tone="ok"
                message={`📅 "${poll.title}"\n${formatKo(confirmedDate.date)}로 정했어요! 다들 캘린더 비워두기 🙆`}
              />
            </div>
          )}
        </div>
      ) : (
        <Hero
          rec={rec}
          anchorNames={anchorNames}
          pollId={poll.id}
          title={poll.title}
          canManage={canManage}
          token={token}
        />
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
          canManage ? (
            <>
              {/* 방장만: 이름 칩을 탭하면 그 사람만 콕 찌르는 개인 독촉 문구가 복사돼요 */}
              <div className="flex flex-wrap gap-1.5">
                {rec.noResponseMembers.map((n) => (
                  <PokeButton key={n} pollId={poll.id} name={n} title={poll.title} />
                ))}
              </div>
              <p className="mt-2 text-[12px] font-medium text-ink-400">이름을 탭하면 콕 찌르는 문구가 복사돼요</p>
              {/* 전체 독촉 — 마감 전, 미확정일 때만 */}
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
            // 일반 참여자: 이름만 보여주고 독촉 도구는 숨김
            <div className="flex flex-wrap gap-1.5">
              {rec.noResponseMembers.map((n) => (
                <span
                  key={n}
                  className="rounded-full bg-surface-sunken px-3 py-1 text-[13px] font-medium text-ink-600"
                >
                  {n}
                </span>
              ))}
            </div>
          )
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
              <OtherRow key={a.pollDateId} a={a} pollId={poll.id} canManage={canManage} token={token} />
            ))}
          </div>
        </section>
      )}

      {/* 날짜별 응답 현황 — 누가 가능/불가/미응답인지 (날짜 순, 탭하면 펼침) */}
      <section className="mb-7">
        <h2 className="mb-2 text-[13px] font-bold text-ink-500">날짜별 응답 현황</h2>
        <div className="card divide-y divide-line/70">
          {rec.analyses.map((a) => (
            <DateVoters
              key={a.pollDateId}
              date={a.date}
              tier={a.tier}
              count={a.count}
              oNames={a.oNames}
              xNames={a.xNames}
              noneNames={a.noneNames}
            />
          ))}
        </div>
      </section>

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
  canManage,
  token,
}: {
  rec: ReturnType<typeof analyze>
  anchorNames: string[]
  pollId: string
  title: string
  canManage: boolean
  token: string
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
        {canManage && (
          <div className="mt-4">
            <ConfirmButton
              pollId={pollId}
              pollDateId={a.pollDateId}
              confirmed={false}
              token={token}
              variant="primary"
            />
          </div>
        )}
        {canManage && (
          <div className="mt-3">
            <CopyLine pollId={pollId} linkTo="vote" tone="ok" message={msg} />
          </div>
        )}
      </div>
    )
  }

  // 노랑(한 조건 충족)이 없어도, 투표가 있으면 가장 근접한 날(⚪ 포함)을 안내한다.
  // 이렇게 하면 "투표는 했는데 아직 조건 미충족"인 상태를 "아무도 안 함"으로 오해시키지 않는다.
  const fallback = rec.bestFallback ?? (rec.respondedMembers > 0 ? rec.ranked[0] ?? null : null)
  if (fallback) {
    const a = fallback
    const isYellow = a.tier === 'yellow'
    const msg = `🗓️ "${title}" 날짜 투표 중!\n아직 다 맞는 날이 없어요.${
      noResp.length ? ` ${noResp.join(', ')} 아직이에요 🙏` : ''
    } 한 번씩 봐주세요!`
    return (
      <div className={`mb-5 rounded-2xl p-5 ${isYellow ? 'bg-maybe-light' : 'bg-surface-sunken'}`}>
        <p className={`text-[13px] font-bold ${isYellow ? 'text-maybe-ink' : 'text-ink-600'}`}>
          🗳️ 아직 투표 중이에요
        </p>
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
        {canManage && (
          <div className="mt-3">
            <CopyLine pollId={pollId} linkTo="vote" message={msg} />
          </div>
        )}
      </div>
    )
  }

  // 여기는 정말 아무도 투표하지 않았을 때(respondedMembers === 0)만 도달한다.
  return (
    <div className="mb-5 rounded-2xl bg-brand-light p-5 text-center">
      <p className="text-sm font-bold text-brand-dark">아직 아무도 투표하지 않았어요</p>
      {canManage && (
        <>
          <p className="mt-1 text-[13px] font-medium text-ink-600">멤버들에게 링크를 보내볼까요?</p>
          <div className="mt-3 text-left">
            <CopyLine
              pollId={pollId}
              linkTo="vote"
              message={`🗓️ "${title}" 날짜 정하자!\n링크 열어서 되는 날 O/X 찍어줘 🙏`}
            />
          </div>
        </>
      )}
    </div>
  )
}

// ── 다른 날짜 한 줄 ───────────────────────────────────────────────────────────

function OtherRow({
  a,
  pollId,
  canManage,
  token,
}: {
  a: DateAnalysis
  pollId: string
  canManage: boolean
  token: string
}) {
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
      {canManage && (
        <ConfirmButton pollId={pollId} pollDateId={a.pollDateId} confirmed={false} token={token} />
      )}
    </div>
  )
}
