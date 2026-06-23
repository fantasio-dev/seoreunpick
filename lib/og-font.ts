// OG 이미지(next/og)용 한글 폰트. satori 가 한글 글리프를 그리려면 폰트가 필요하다.
// 로컬 파일을 fetch(file://) 하면 Node fetch 가 막으므로, CDN 절대 URL 에서 받아 모듈 캐시한다.

const FONT_URL =
  'https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/packages/pretendard/dist/public/static/Pretendard-Bold.otf'

let cache: ArrayBuffer | null = null

export async function pretendardBold(): Promise<ArrayBuffer> {
  if (cache) return cache
  const res = await fetch(FONT_URL)
  if (!res.ok) throw new Error('OG 폰트 로드 실패: ' + res.status)
  cache = await res.arrayBuffer()
  return cache
}
