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
  const canGoPrev =
    view.y > today.getFullYear() || (view.y === today.getFullYear() && view.m > today.getMonth())

  return (
    <div className="card p-4">
      <div className="mb-3 flex items-center justify-between">
        <button
          type="button"
          onClick={() => move(-1)}
          disabled={!canGoPrev}
          className="flex h-9 w-9 items-center justify-center rounded-xl text-ink-600 active:bg-surface-sunken disabled:opacity-25"
          aria-label="이전 달"
        >
          ‹
        </button>
        <span className="text-[15px] font-bold text-ink">
          {view.y}년 {view.m + 1}월
        </span>
        <button
          type="button"
          onClick={() => move(1)}
          className="flex h-9 w-9 items-center justify-center rounded-xl text-ink-600 active:bg-surface-sunken"
          aria-label="다음 달"
        >
          ›
        </button>
      </div>

      <div className="mb-1 grid grid-cols-7 text-center text-xs font-medium text-ink-400">
        {WEEKDAYS.map((w, i) => (
          <div key={w} className={i === 0 ? 'text-rose-400' : i === 6 ? 'text-brand' : ''}>
            {w}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-y-0.5">
        {cells.map((d, i) => {
          if (d === null) return <div key={`e${i}`} />
          const dateStr = ymd(view.y, view.m, d)
          const isPast = dateStr < todayStr
          const isSelected = selected.has(dateStr)
          const isToday = dateStr === todayStr
          return (
            <div key={dateStr} className="flex items-center justify-center py-0.5">
              <button
                type="button"
                disabled={isPast}
                onClick={() => toggle(dateStr)}
                className={[
                  'flex h-10 w-10 items-center justify-center rounded-full text-[15px] transition',
                  isPast ? 'cursor-not-allowed text-ink-400/50' : 'active:scale-90',
                  isSelected
                    ? 'bg-brand font-bold text-white'
                    : isToday
                      ? 'font-bold text-brand'
                      : !isPast
                        ? 'font-medium text-ink-800 active:bg-brand-light'
                        : '',
                ].join(' ')}
              >
                {d}
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
