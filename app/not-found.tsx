import Link from 'next/link'

export default function NotFound() {
  return (
    <main className="flex min-h-[60vh] flex-col items-center justify-center text-center">
      <div className="text-6xl">🤔</div>
      <h1 className="mt-4 text-[20px] font-extrabold text-ink">방을 찾을 수 없어요</h1>
      <p className="mt-1.5 text-sm font-medium text-ink-600">링크가 만료됐거나 잘못된 주소예요.</p>
      <Link
        href="/"
        className="mt-6 rounded-2xl bg-brand px-6 py-3 text-[15px] font-bold text-white active:scale-95"
      >
        새 모임 만들기
      </Link>
    </main>
  )
}
