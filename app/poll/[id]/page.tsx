import Link from 'next/link'
import { notFound } from 'next/navigation'
import VoteBoard from '@/components/VoteBoard'
import { getPollBundle } from '@/lib/db'

export const dynamic = 'force-dynamic'

export default function VotePage({ params }: { params: { id: string } }) {
  const bundle = getPollBundle(params.id)
  if (!bundle) notFound()

  const { poll, dates, members, votes } = bundle

  return (
    <main>
      <header className="mb-5">
        <Link href="/" className="text-xs text-slate-400">
          ← 서른픽
        </Link>
        <h1 className="mt-1 text-lg font-extrabold leading-snug">{poll.title}</h1>
        <p className="mt-0.5 text-xs text-slate-400">
          {poll.hostName}님의 모임, 멤버 {members.length}명, 후보 {dates.length}일
        </p>
      </header>

      <div className="mb-5 flex items-center justify-center gap-3 rounded-xl bg-white px-3 py-2.5 text-xs text-slate-500 shadow-card">
        <Legend swatch="bg-emerald-500" label="O 가능" />
        <Legend swatch="bg-amber-400" label="△ 애매" />
        <Legend swatch="bg-slate-400" label="X 불가" />
      </div>

      <VoteBoard pollId={poll.id} members={members} dates={dates} votes={votes} />

      <div className="mt-8 text-center">
        <Link href={`/poll/${poll.id}/result`} className="text-sm font-medium text-brand">
          결과 보러 가기 →
        </Link>
      </div>
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
