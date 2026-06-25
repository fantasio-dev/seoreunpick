'use client'

import { useEffect, useState } from 'react'

interface Props {
  pollId: string
  title?: string
  highlight?: boolean // 방 생성 직후 강조
}

type KakaoSDK = {
  isInitialized: () => boolean
  Share?: { sendDefault: (o: unknown) => void }
}

const kakaoEnabled = !!process.env.NEXT_PUBLIC_KAKAO_JS_KEY

export default function ShareBar({ pollId, title, highlight }: Props) {
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
    // 1순위: 카카오 공유 SDK(리치 카드). 키/SDK 없으면 자동으로 아래 폴백으로 내려간다.
    const k = (window as unknown as { Kakao?: KakaoSDK }).Kakao
    if (k?.isInitialized?.() && k.Share) {
      try {
        k.Share.sendDefault({
          objectType: 'feed',
          content: {
            title: title || '모임 날짜 투표',
            description: '되는 날 O/X 한 번만 찍어줘! 서른픽',
            imageUrl: `${origin}/poll/${pollId}/opengraph-image`,
            link: { mobileWebUrl: voteUrl, webUrl: voteUrl },
          },
          buttons: [{ title: '투표하러 가기', link: { mobileWebUrl: voteUrl, webUrl: voteUrl } }],
        })
        return
      } catch {
        /* SDK 실패 → 폴백 */
      }
    }
    // 2순위: 웹 공유 시트
    if (navigator.share) {
      try {
        await navigator.share({ title: '모임 날짜 투표', text: '날짜 투표해줘! 🗓️', url: voteUrl })
        return
      } catch {
        /* 사용자가 취소 → 무시 */
      }
    }
    // 3순위: 링크 복사
    copy('vote')
  }

  return (
    <div
      className={[
        'rounded-2xl p-4',
        highlight ? 'bg-brand-light' : 'card',
      ].join(' ')}
    >
      {highlight && (
        <p className="mb-2.5 text-[15px] font-bold text-brand-dark">
          🎉 방이 만들어졌어요! 멤버들에게 투표 링크를 보내세요
        </p>
      )}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={share}
          className="h-12 flex-1 rounded-xl bg-brand text-[15px] font-bold text-white active:bg-brand-dark active:scale-[0.99]"
        >
          {copied === 'vote' ? '복사됨 ✓' : kakaoEnabled ? '💬 카톡으로 공유' : '🔗 투표 링크 공유'}
        </button>
        <button
          type="button"
          onClick={() => copy('result')}
          className="h-12 shrink-0 rounded-xl bg-white px-4 text-[15px] font-bold text-ink-700 shadow-card active:scale-[0.99]"
        >
          {copied === 'result' ? '복사됨 ✓' : '결과 링크'}
        </button>
      </div>
    </div>
  )
}
