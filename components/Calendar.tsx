'use client'

import { useState } from 'react'

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']

function ymd(y: number, m: number, d: number): string {
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

interface Props {
  value: string[]
  onChange: (next: string[]) => void
}

/** 후보 날짜 다중 선택 달력 (모바일 탭). 과거 날짜는 비활성. */
export default function Calendar({ value, onChange }: Props) {
  const today = new Date()
  const todayStr = ymd(today.getFullYear(), today.getMonth(), today.getDate())
  const [view, setView] = useState({ y: today.getFullYear(), m: today.getMonth() })

  const selected = new Set(value)

  const firstWeekday = new Date(view.y, view.m, 1).getDay()
  const daysInMonth = new Date(view.y, view.m + 1, 0).getDate()

  const cells: (number | null)[] = []
  for (let i = 0; i < firstWeekday; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)

  function toggle(dateStr: string) {
    const next = new Set(selected)
    if (next.has(dateStr)) next.delete(dateStr)
    else next.add(dateStr)
    onChange(Array.from(next).sort())
  }

  function move(delta: number) {
    let m = view.m + delta
    let y = view.y
    if (m < 0) {
      m = 11
      y -= 1
    } else if (m > 11) {
      m = 0
      y += 1
    }
    setView({ y, m })
  }

  // 지난 달로는 못 가게 (이번 달 이전 막기)
  const canGoPrev = view.y > today.getFullYear() || (view.y === today.getFullYear() && view.m > today.getMonth())

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-3">
      <div className="mb-2 flex items-center justify-between px-1">
        <button
          type="button"
          onClick={() => move(-1)}
          disabled={!canGoPrev}
          className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 disabled:opacity-30"
          aria-label="이전 달"
        >
          ‹
        </button>
        <span className="text-sm font-semibold">
          {view.y}년 {view.m + 1}월
        </span>
        <button
          type="button"
          onClick={() => move(1)}
          className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500"
          aria-label="다음 달"
        >
          ›
        </button>
      </div>

      <div className="mb-1 grid grid-cols-7 text-center text-xs text-slate-400">
        {WEEKDAYS.map((w, i) => (
          <div key={w} className={i === 0 ? 'text-rose-400' : i === 6 ? 'text-blue-400' : ''}>
            {w}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {cells.map((d, i) => {
          if (d === null) return <div key={`e${i}`} />
          const dateStr = ymd(view.y, view.m, d)
          const isPast = dateStr < todayStr
          const isSelected = selected.has(dateStr)
          const isToday = dateStr === todayStr
          return (
            <button
              key={dateStr}
              type="button"
              disabled={isPast}
              onClick={() => toggle(dateStr)}
              className={[
                'flex aspect-square items-center justify-center rounded-lg text-sm transition',
                isPast ? 'cursor-not-allowed text-slate-300' : 'active:scale-95',
                isSelected
                  ? 'bg-brand font-bold text-white'
                  : isToday
                    ? 'border border-brand/40 text-brand'
                    : !isPast
                      ? 'text-slate-700 hover:bg-brand/5'
                      : '',
              ].join(' ')}
            >
              {d}
            </button>
          )
        })}
      </div>
    </div>
  )
}
