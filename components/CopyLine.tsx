'use client'

import { useState } from 'react'

interface Props {
  pollId: string
  message: string // URL 제외 본문 (마지막에 링크가 붙는다)
  linkTo?: 'vote' | 'result'
  tone?: 'ok' | 'brand'
}

/** 카톡에 그대로 붙여넣는 "한 줄 요약" + 링크. 복사 버튼. */
export default function CopyLine({ pollId, message, linkTo = 'vote', tone = 'brand' }: Props) {
  const [copied, setCopied] = useState(false)

  async function copy() {
    const origin = window.location.origin
    const url = linkTo === 'vote' ? `${origin}/poll/${pollId}` : `${origin}/poll/${pollId}/result`
    const text = `${message}\n${url}`
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      window.prompt('아래를 복사해서 카톡에 붙여넣으세요', text)
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 1600)
  }

  const btn = tone === 'ok' ? 'bg-ok text-white' : 'bg-brand text-white'

  return (
    <div className="rounded-2xl bg-white/70 p-3">
      <p className="whitespace-pre-line text-[13px] font-medium leading-relaxed text-ink-700">
        {message}
      </p>
      <button
        type="button"
        onClick={copy}
        className={`mt-2.5 h-11 w-full rounded-xl text-[14px] font-bold active:scale-[0.99] ${btn}`}
      >
        {copied ? '복사됨 ✓ 카톡에 붙여넣기' : '💬 카톡에 보낼 문구 복사'}
      </button>
    </div>
  )
}
