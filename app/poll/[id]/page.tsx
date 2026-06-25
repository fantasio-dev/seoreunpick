import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import VoteBoard from '@/components/VoteBoard'
import { getPollBundle } from '@/lib/db'
import { deadlineLabel, formatKo, isDeadlinePassed } from '@/lib/date'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const bundle = await getPollBundle(params.id)
  if (!bundle) return { title: '서른픽' }
  return {
    title: `${bundle.poll.title} — 투표하기`,
    description: '날짜별로 O/X 찍고 제출하기 · 서른픽',
    openGraph: { title: bundle.poll.title, description: '날짜 투표하기, 서른픽' },
  }
}

export default async function VotePage({ params }: { params: { id: string } }) {
  const bundle = await getPollBundle(params.id)
  if (!bundle) notFound()

  const { poll, dates, members, votes } = bundle
  const votingClosed = isDeadlinePassed(poll.deadline)

  return (
    <main>
      <header className="mb-5">
        <Link href="/" className="text-[13px] font-bold text-ink-500">
          ← 서른픽
        </Link>
        <h1 className="mt-1.5 text-[22px] font-extrabold leading-snug text-ink">{poll.title}</h1>
        <p className="mt-1 text-[13px] font-medium text-ink-500">
          {poll.hostName}님의 모임, 멤버 {members.length}명, 후보 {dates.length}일
        </p>
        {poll.deadline && !votingClosed && (
          <p className="mt-2 inline-flex rounded-full bg-brand-light px-3 py-1 text-[12px] font-bold text-brand">
            ⏰ {deadlineLabel(poll.deadline)}
          </p>
        )}
      </header>

      {votingClosed ? (
        <div className="rounded-2xl bg-surface-sunken p-6 text-center">
          <p className="text-2xl">🔒</p>
          <p className="mt-2 text-[17px] font-extrabold text-ink">투표가 마감됐어요</p>
          <p className="mt-1 text-[13px] font-medium text-ink-500">
            {poll.deadline && `${formatKo(poll.deadline)}까지였어요. `}결과를 확인해 주세요.
          </p>
          <Link
            href={`/poll/${poll.id}/result`}
            className="btn-primary mt-5 flex items-center justify-center"
          >
            결과 보기
          </Link>
        </div>
      ) : (
        <>
          <div className="mb-6 flex items-center justify-center gap-5 rounded-2xl bg-surface-sunken px-3 py-2.5 text-[13px] font-bold text-ink-700">
            <Legend swatch="bg-ok" label="O 가능" />
            <Legend swatch="bg-no" label="X 불가" />
          </div>

          <VoteBoard pollId={poll.id} members={members} dates={dates} votes={votes} />

          <div className="mt-8 text-center">
            <Link href={`/poll/${poll.id}/result`} className="text-sm font-bold text-brand">
              결과 보러 가기 →
            </Link>
          </div>
        </>
      )}
    </main>
  )
}

function Legend({ swatch, label }: { swatch: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`h-2.5 w-2.5 rounded-full ${swatch}`} />
      {label}
    </span>
  )
}
