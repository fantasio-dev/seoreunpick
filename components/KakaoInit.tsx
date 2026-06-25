'use client'

import Script from 'next/script'

// 공개키(JS key)만 사용. 없으면 SDK 자체를 안 불러오고, 공유는 기존 복사/웹공유로 폴백된다.
const KAKAO_KEY = process.env.NEXT_PUBLIC_KAKAO_JS_KEY

type KakaoSDK = { isInitialized: () => boolean; init: (key: string) => void }

export default function KakaoInit() {
  if (!KAKAO_KEY) return null
  return (
    <Script
      src="https://t1.kakaocdn.net/kakao_js_sdk/2.7.2/kakao.min.js"
      strategy="afterInteractive"
      onLoad={() => {
        const k = (window as unknown as { Kakao?: KakaoSDK }).Kakao
        if (k && !k.isInitialized()) k.init(KAKAO_KEY)
      }}
    />
  )
}
