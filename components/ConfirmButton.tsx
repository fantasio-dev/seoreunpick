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
        className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-500 disabled:opacity-50"
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
        className="w-full rounded-xl bg-emerald-600 py-3 text-sm font-bold text-white active:scale-[0.99] disabled:opacity-60"
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
      className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 disabled:opacity-60"
    >
      {loading ? '…' : '이 날로 확정'}
    </button>
  )
}
