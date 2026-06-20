import Link from 'next/link'

export default function NotFound() {
  return (
    <main className="flex min-h-[60vh] flex-col items-center justify-center text-center">
      <div className="text-5xl">🤔</div>
      <h1 className="mt-3 text-lg font-bold">방을 찾을 수 없어요</h1>
      <p className="mt-1 text-sm text-slate-500">링크가 만료됐거나 잘못된 주소예요.</p>
      <Link
        href="/"
        className="mt-5 rounded-xl bg-brand px-5 py-2.5 text-sm font-semibold text-white"
      >
        새 모임 만들기
      </Link>
    </main>
  )
}
