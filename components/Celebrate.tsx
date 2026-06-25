'use client'

import { useEffect, useState } from 'react'

const EMOJIS = ['🎉', '🎊', '✨', '💙', '🥳']

/** 날짜 확정 시 한 번만 터지는 가벼운 컨페티. 같은 방은 브라우저당 1회만(과하지 않게). */
export default function Celebrate({ pollId }: { pollId: string }) {
  const [show, setShow] = useState(false)

  useEffect(() => {
    const key = `seoreunpick:celebrated:${pollId}`
    if (sessionStorage.getItem(key)) return
    sessionStorage.setItem(key, '1')
    setShow(true)
    const t = setTimeout(() => setShow(false), 2200)
    return () => clearTimeout(t)
  }, [pollId])

  if (!show) return null

  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-50 mx-auto h-dvh max-w-md overflow-hidden">
      {Array.from({ length: 16 }).map((_, i) => (
        <span
          key={i}
          className="absolute animate-confetti-fall text-2xl"
          style={{ left: `${(i * 6.3) % 100}%`, animationDelay: `${(i % 5) * 0.12}s` }}
        >
          {EMOJIS[i % EMOJIS.length]}
        </span>
      ))}
    </div>
  )
}
