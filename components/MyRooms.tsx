'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { forgetRoom, listMyRooms, type MyRoom } from '@/lib/myRooms'

// 이 기기에 저장된 "내가 만든 방" 목록. 방장 토큰이 붙은 링크로 바로 재진입한다.
export default function MyRooms() {
  const [rooms, setRooms] = useState<MyRoom[] | null>(null)

  useEffect(() => {
    setRooms(listMyRooms())
  }, [])

  if (!rooms || rooms.length === 0) return null

  return (
    <section className="mt-9">
      <h2 className="mb-3 text-[15px] font-bold text-ink">내가 만든 방</h2>
      <div className="card divide-y divide-line/70">
        {rooms.map((r) => (
          <div key={r.id} className="flex items-center gap-2 px-4 py-3">
            <Link href={`/poll/${r.id}/result?t=${r.token}`} className="min-w-0 flex-1">
              <p className="truncate text-[15px] font-bold text-ink">{r.title}</p>
              <p className="text-[12px] font-medium text-ink-500">탭하면 방장으로 열려요</p>
            </Link>
            <button
              type="button"
              onClick={() => {
                forgetRoom(r.id)
                setRooms(listMyRooms())
              }}
              aria-label="목록에서 제거"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-ink-400 active:scale-95"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
      <p className="mt-2 text-[12px] font-medium text-ink-400">이 기기에 저장된 목록이에요</p>
    </section>
  )
}
