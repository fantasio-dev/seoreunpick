import Link from 'next/link'
import CreateRoom from '@/components/CreateRoom'
import { DEMO_POLL_ID } from '@/lib/db'

export default function HomePage() {
  return (
    <main>
      <header className="mb-6">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🗓️</span>
          <h1 className="text-xl font-extrabold tracking-tight">서른픽</h1>
        </div>
        <p className="mt-1.5 text-[15px] leading-relaxed text-slate-500">
          링크 하나로 모임 날짜를 정해요.
          <br />
          누가 안 했는지, 꼭 와야 할 사람은 되는지, 과반은 넘었는지 — 자동으로 알려줘요.
        </p>
      </header>

      <section className="mb-5 rounded-2xl border border-brand/15 bg-brand/[0.04] p-4">
        <p className="text-sm font-semibold text-brand-700">새 모임 만들기</p>
        <p className="mt-0.5 text-xs text-slate-500">
          아래를 채우면 공유용 투표 링크와 결과 링크가 생성돼요.
        </p>
      </section>

      <CreateRoom />

      <div className="mt-8 border-t border-slate-200 pt-5 text-center">
        <p className="text-xs text-slate-400">처음이라면 샘플 방으로 먼저 둘러보세요</p>
        <div className="mt-2 flex justify-center gap-2">
          <Link
            href={`/poll/${DEMO_POLL_ID}`}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600"
          >
            샘플 투표하기
          </Link>
          <Link
            href={`/poll/${DEMO_POLL_ID}/result`}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600"
          >
            샘플 결과보기
          </Link>
        </div>
      </div>
    </main>
  )
}
