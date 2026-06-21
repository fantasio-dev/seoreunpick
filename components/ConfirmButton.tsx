'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { confirmDateAction } from '@/app/actions'

interface Props {
  pollId: string
  pollDateId: number
  confirmed: boolean
  variant?: 'primary' | 'ghost'
}

export default function ConfirmButton({ pollId, pollDateId, confirmed, variant = 'ghost' }: Props) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [busy, setBusy] = useState(false)

  function act(next: number | null) {
    setBusy(true)
    start(async () => {
      await confirmDateAction(pollId, next)
      router.refresh()
      setBusy(false)
    })
  }

  const loading = pending || busy

  if (confirmed) {
    return (
      <button
        type="button"
        onClick={() => act(null)}
        disabled={loading}
        className="rounded-xl bg-white/70 px-3.5 py-2 text-[13px] font-bold text-ok-ink active:scale-95 disabled:opacity-50"
      >
        {loading ? '…' : '확정 해제'}
      </button>
    )
  }

  if (variant === 'primary') {
    return (
      <button
        type="button"
        onClick={() => act(pollDateId)}
        disabled={loading}
        className="h-[50px] w-full rounded-2xl bg-ok text-[15px] font-bold text-white active:scale-[0.99] disabled:opacity-60"
      >
        {loading ? '확정 중…' : '✅ 이 날짜로 확정하기'}
      </button>
    )
  }

  return (
    <button
      type="button"
      onClick={() => act(pollDateId)}
      disabled={loading}
      className="rounded-xl bg-ok-light px-3.5 py-2 text-[13px] font-bold text-ok-ink active:scale-95 disabled:opacity-60"
    >
      {loading ? '…' : '이 날로 확정'}
    </button>
  )
}
