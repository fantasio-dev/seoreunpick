'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { submitVoteAction } from '@/app/actions'
import { formatKo } from '@/lib/date'
import type { MemberRow, PollDateRow, VoteRow, VoteStatus } from '@/lib/types'

interface Props {
  pollId: string
  members: MemberRow[]
  dates: PollDateRow[]
  votes: VoteRow[]
}

const OPTIONS: { value: VoteStatus; label: string; desc: string }[] = [
  { value: 'O', label: 'O', desc: '가능' },
  { value: '△', label: '△', desc: '애매' },
  { value: 'X', label: 'X', desc: '불가' },
]

export default function VoteBoard({ pollId, members, dates, votes }: Props) {
  const [memberId, setMemberId] = useState<number | null>(null)
  const [picks, setPicks] = useState<Record<number, VoteStatus>>({})
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)

  // memberId → (pollDateId → status) 기존 응답
  const existing = useMemo(() => {
    const map = new Map<number, Record<number, VoteStatus>>()
    for (const v of votes) {
      const cur = map.get(v.memberId) ?? {}
      cur[v.pollDateId] = v.status
      map.set(v.memberId, cur)
    }
    return map
  }, [votes])

  function selectMember(id: number) {
    setMemberId(id)
    setPicks(existing.get(id) ?? {})
    setDone(false)
  }

  function setPick(dateId: number, status: VoteStatus) {
    setPicks((prev) => ({ ...prev, [dateId]: status }))
  }

  function setAll(status: VoteStatus) {
    const next: Record<number, VoteStatus> = {}
    for (const d of dates) next[d.id] = status
    setPicks(next)
  }

  const answered = dates.filter((d) => picks[d.id]).length
  const allAnswered = answered === dates.length

  async function submit() {
    if (memberId === null) return
    setSubmitting(true)
    try {
      const entries = dates
        .filter((d) => picks[d.id])
        .map((d) => ({ pollDateId: d.id, status: picks[d.id] }))
      await submitVoteAction(pollId, memberId, entries)
      setDone(true)
    } finally {
      setSubmitting(false)
    }
  }

  // ── 1단계: 이름 선택 ───────────────────────────────────────────────
  if (memberId === null) {
    return (
      <div>
        <h2 className="mb-3 text-base font-bold">당신은 누구인가요?</h2>
        <div className="grid grid-cols-3 gap-2">
          {members.map((m) => {
            const voted = existing.has(m.id)
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => selectMember(m.id)}
                className="relative flex h-14 items-center justify-center rounded-xl border border-slate-200 bg-white text-[15px] font-semibold text-slate-700 transition active:scale-95 hover:border-brand/40"
              >
                {m.isAnchor && <span className="absolute left-2 top-1.5 text-xs">⭐</span>}
                {m.name}
                {voted && (
                  <span className="absolute bottom-1 text-[10px] font-medium text-emerald-500">
                    응답함
                  </span>
                )}
              </button>
            )
          })}
        </div>
        <p className="mt-4 text-center text-xs text-slate-400">⭐ 표시는 필수 참석자예요</p>
      </div>
    )
  }

  const me = members.find((m) => m.id === memberId)!

  // ── 제출 완료 화면 ─────────────────────────────────────────────────
  if (done) {
    return (
      <div className="py-6 text-center">
        <div className="mb-3 text-5xl">🎉</div>
        <h2 className="text-lg font-bold">{me.name}님, 제출 완료!</h2>
        <p className="mt-1 text-sm text-slate-500">언제든 다시 들어와 수정할 수 있어요.</p>
        <div className="mt-6 space-y-2">
          <Link
            href={`/poll/${pollId}/result`}
            className="block w-full rounded-2xl bg-brand py-3.5 font-bold text-white"
          >
            결과 보기
          </Link>
          <button
            type="button"
            onClick={() => setDone(false)}
            className="block w-full rounded-2xl border border-slate-200 bg-white py-3.5 font-semibold text-slate-600"
          >
            내 응답 수정하기
          </button>
          <button
            type="button"
            onClick={() => {
              setMemberId(null)
              setPicks({})
            }}
            className="block w-full py-2 text-sm text-slate-400"
          >
            다른 사람으로 투표하기
          </button>
        </div>
      </div>
    )
  }

  // ── 2단계: 날짜별 O/△/X ────────────────────────────────────────────
  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-xs text-slate-400">투표하는 사람</p>
          <p className="text-base font-bold">
            {me.isAnchor && '⭐ '}
            {me.name}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setMemberId(null)}
          className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-500"
        >
          이름 바꾸기
        </button>
      </div>

      <div className="mb-3 flex gap-2">
        <button
          type="button"
          onClick={() => setAll('O')}
          className="flex-1 rounded-lg border border-emerald-200 bg-emerald-50 py-2 text-xs font-semibold text-emerald-600"
        >
          전부 가능(O)
        </button>
        <button
          type="button"
          onClick={() => setAll('X')}
          className="flex-1 rounded-lg border border-slate-200 bg-slate-50 py-2 text-xs font-semibold text-slate-500"
        >
          전부 불가(X)
        </button>
      </div>

      <div className="space-y-2.5">
        {dates.map((d) => (
          <div key={d.id} className="rounded-2xl border border-slate-200 bg-white p-3">
            <p className="mb-2 text-[15px] font-semibold">{formatKo(d.date)}</p>
            <div className="grid grid-cols-3 gap-2">
              {OPTIONS.map((opt) => {
                const active = picks[d.id] === opt.value
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setPick(d.id, opt.value)}
                    className={[
                      'flex flex-col items-center gap-0.5 rounded-xl border py-2.5 transition active:scale-95',
                      active
                        ? statusActiveClass(opt.value)
                        : 'border-slate-200 bg-white text-slate-400',
                    ].join(' ')}
                  >
                    <span className="text-xl font-bold leading-none">{opt.label}</span>
                    <span className="text-[11px] font-medium">{opt.desc}</span>
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={submit}
        disabled={submitting || answered === 0}
        className="sticky bottom-4 mt-4 w-full rounded-2xl bg-brand py-4 text-base font-bold text-white shadow-lg shadow-brand/25 transition active:scale-[0.99] disabled:opacity-50"
      >
        {submitting
          ? '제출 중…'
          : allAnswered
            ? '제출하기'
            : `제출하기 (${answered}/${dates.length})`}
      </button>
    </div>
  )
}

function statusActiveClass(s: VoteStatus): string {
  switch (s) {
    case 'O':
      return 'border-emerald-500 bg-emerald-500 text-white'
    case '△':
      return 'border-amber-400 bg-amber-400 text-white'
    case 'X':
      return 'border-slate-400 bg-slate-400 text-white'
  }
}
