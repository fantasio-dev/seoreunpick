'use client'

import { useEffect, useState } from 'react'

interface Props {
  pollId: string
  highlight?: boolean // 방 생성 직후 강조
}

export default function ShareBar({ pollId, highlight }: Props) {
  const [origin, setOrigin] = useState('')
  const [copied, setCopied] = useState<'vote' | 'result' | null>(null)

  useEffect(() => {
    setOrigin(window.location.origin)
  }, [])

  const voteUrl = `${origin}/poll/${pollId}`
  const resultUrl = `${origin}/poll/${pollId}/result`

  async function copy(kind: 'vote' | 'result') {
    const url = kind === 'vote' ? voteUrl : resultUrl
    try {
      await navigator.clipboard.writeText(url)
    } catch {
      // clipboard 권한 없을 때 fallback
      window.prompt('아래 링크를 복사하세요', url)
    }
    setCopied(kind)
    setTimeout(() => setCopied(null), 1500)
  }

  async function share() {
    if (navigator.share) {
      try {
        await navigator.share({ title: '모임 날짜 투표', text: '날짜 투표해줘! 🗓️', url: voteUrl })
        return
      } catch {
        /* 사용자가 취소 → 무시 */
      }
    }
    copy('vote')
  }

  return (
    <div
      className={[
        'rounded-2xl border p-4',
        highlight ? 'border-brand/30 bg-brand/[0.05]' : 'border-slate-200 bg-white',
      ].join(' ')}
    >
      {highlight && (
        <p className="mb-2 text-sm font-bold text-brand-700">
          🎉 방이 만들어졌어요! 멤버들에게 투표 링크를 보내세요.
        </p>
      )}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={share}
          className="flex-1 rounded-xl bg-brand py-3 text-sm font-bold text-white active:scale-[0.99]"
        >
          {copied === 'vote' ? '복사됨 ✓' : '투표 링크 공유'}
        </button>
        <button
          type="button"
          onClick={() => copy('result')}
          className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-600 active:scale-[0.99]"
        >
          {copied === 'result' ? '복사됨 ✓' : '결과 링크'}
        </button>
      </div>
    </div>
  )
}
