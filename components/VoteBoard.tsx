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
        <h2 className="mb-1 text-[20px] font-extrabold text-ink">당신은 누구인가요?</h2>
        <p className="mb-4 text-sm text-ink-600">이름을 선택하면 투표를 시작해요</p>
        <div className="grid grid-cols-3 gap-2.5">
          {members.map((m) => {
            const voted = existing.has(m.id)
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => selectMember(m.id)}
                className="relative flex h-[68px] flex-col items-center justify-center gap-1 rounded-2xl bg-surface-sunken text-[15px] font-bold text-ink-800 transition active:scale-95"
              >
                {m.isAnchor && <span className="absolute left-2 top-2 text-[11px]">⭐</span>}
                <span>{m.name}</span>
                {voted && (
                  <span className="rounded-full bg-ok-light px-1.5 py-px text-[10px] font-bold text-ok-ink">
                    응답완료
                  </span>
                )}
              </button>
            )
          })}
        </div>
        <p className="mt-5 text-center text-xs font-medium text-ink-500">
          ⭐ 표시는 꼭 와야 하는 필수 참석자예요
        </p>
      </div>
    )
  }

  const me = members.find((m) => m.id === memberId)!

  // ── 제출 완료 화면 ─────────────────────────────────────────────────
  if (done) {
    return (
      <div className="py-8 text-center">
        <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-ok-light text-5xl">
          🎉
        </div>
        <h2 className="text-[22px] font-extrabold text-ink">제출 완료!</h2>
        <p className="mt-1.5 text-[15px] text-ink-600">
          {me.name}님 응답이 저장됐어요.
          <br />
          언제든 다시 들어와 수정할 수 있어요.
        </p>
        <div className="mt-7 space-y-2.5">
          <Link
            href={`/poll/${pollId}/result`}
            className="btn-primary flex items-center justify-center"
          >
            결과 보기
          </Link>
          <button type="button" onClick={() => setDone(false)} className="btn-secondary">
            내 응답 수정하기
          </button>
          <button
            type="button"
            onClick={() => {
              setMemberId(null)
              setPicks({})
            }}
            className="block w-full py-2 text-sm font-medium text-ink-500"
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
      <div className="mb-5 flex items-center justify-between">
        <div>
          <p className="text-xs font-medium text-ink-500">투표하는 사람</p>
          <p className="text-[19px] font-extrabold text-ink">
            {me.isAnchor && '⭐ '}
            {me.name}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setMemberId(null)}
          className="rounded-xl bg-surface-sunken px-3.5 py-2 text-[13px] font-bold text-ink-600 active:scale-95"
        >
          이름 바꾸기
        </button>
      </div>

      <div className="mb-3 flex gap-2">
        <button
          type="button"
          onClick={() => setAll('O')}
          className="flex-1 rounded-xl bg-ok-light py-2.5 text-[13px] font-bold text-ok-ink active:scale-[0.98]"
        >
          전부 가능 O
        </button>
        <button
          type="button"
          onClick={() => setAll('X')}
          className="flex-1 rounded-xl bg-surface-sunken py-2.5 text-[13px] font-bold text-ink-600 active:scale-[0.98]"
        >
          전부 불가 X
        </button>
      </div>

      <div className="space-y-2.5">
        {dates.map((d) => (
          <div key={d.id} className="card p-3.5">
            <p className="mb-2.5 text-[16px] font-bold text-ink">{formatKo(d.date)}</p>
            <div className="grid grid-cols-3 gap-2">
              {OPTIONS.map((opt) => {
                const active = picks[d.id] === opt.value
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setPick(d.id, opt.value)}
                    className={[
                      'flex flex-col items-center gap-0.5 rounded-xl py-2.5 transition active:scale-95',
                      active ? statusActiveClass(opt.value) : 'bg-surface-sunken text-ink-400',
                    ].join(' ')}
                  >
                    <span className="text-[22px] font-extrabold leading-none">{opt.label}</span>
                    <span className="text-[11px] font-bold">{opt.desc}</span>
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
        className="btn-primary sticky bottom-4 mt-4 shadow-float shadow-brand/25"
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
      return 'bg-ok text-white'
    case '△':
      return 'bg-maybe text-white'
    case 'X':
      return 'bg-no text-white'
  }
}
