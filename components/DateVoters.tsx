'use client'

import { useState } from 'react'
import { formatKo } from '@/lib/date'
import type { Tier } from '@/lib/recommend'

const DOT: Record<Tier, string> = { green: '🟢', yellow: '🟡', gray: '⚪' }

// 한 날짜의 응답 현황(가능/불가/미응답한 사람)을 탭하면 펼쳐 보여준다. 표시 전용(데이터 변경 없음).
export default function DateVoters({
  date,
  tier,
  count,
  oNames,
  xNames,
  noneNames,
}: {
  date: string
  tier: Tier
  count: number
  oNames: string[]
  xNames: string[]
  noneNames: string[]
}) {
  const [open, setOpen] = useState(false)
  return (
    <div className="px-4 py-3">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-2 text-left"
      >
        <span className="text-[15px]">{DOT[tier]}</span>
        <span className="flex-1 text-[15px] font-bold text-ink">
          {formatKo(date)} <span className="font-medium text-ink-500">가능 {count}명</span>
        </span>
        <span className={`text-[12px] font-bold text-ink-400 transition ${open ? 'rotate-180' : ''}`}>
          ▾
        </span>
      </button>
      {open && (
        <div className="mt-2.5 space-y-2">
          <Group label="가능" names={oNames} chip="bg-ok-light text-ok-ink" />
          <Group label="불가" names={xNames} chip="bg-rose-50 text-rose-600" />
          <Group label="미응답" names={noneNames} chip="bg-surface-sunken text-ink-500" />
        </div>
      )}
    </div>
  )
}

function Group({ label, names, chip }: { label: string; names: string[]; chip: string }) {
  if (names.length === 0) return null
  return (
    <div className="flex gap-2">
      <span className="mt-0.5 w-12 shrink-0 text-[12px] font-bold text-ink-400">
        {label} {names.length}
      </span>
      <div className="flex flex-wrap gap-1">
        {names.map((n) => (
          <span key={n} className={`rounded-md px-1.5 py-0.5 text-[12px] font-medium ${chip}`}>
            {n}
          </span>
        ))}
      </div>
    </div>
  )
}
