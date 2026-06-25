'use client'

import { useState } from 'react'

interface Props {
  pollId: string
  name: string
  title: string
}

/** 미응답자 1명을 "콕" 찌르는 개인 맞춤 독촉 문구 복사 버튼(칩). */
export default function PokeButton({ pollId, name, title }: Props) {
  const [copied, setCopied] = useState(false)

  async function poke() {
    const origin = window.location.origin
    const url = `${origin}/poll/${pollId}`
    const text = `🫵 ${name}아, "${title}" 날짜 투표만 너 남았어!\n링크 열고 O/X 한 번만 찍어주면 끝이야 🙏\n${url}`
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      window.prompt('아래를 복사해서 보내세요', text)
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 1600)
  }

  return (
    <button
      type="button"
      onClick={poke}
      className={[
        'inline-flex items-center gap-1 rounded-full px-3 py-1 text-[13px] font-medium transition active:scale-95',
        copied
          ? 'bg-ok-light text-ok-ink'
          : 'border border-dashed border-line-strong text-ink-600 active:bg-surface-sunken',
      ].join(' ')}
    >
      {name} {copied ? '복사됨 ✓' : <span className="text-ink-400">콕</span>}
    </button>
  )
}
