import Link from 'next/link'
import CreateRoom from '@/components/CreateRoom'
import MyRooms from '@/components/MyRooms'
import { DEMO_POLL_ID } from '@/lib/db'

export default function HomePage() {
  return (
    <main>
      <header className="mb-7">
        <div className="mb-3 inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-brand text-[22px] shadow-float shadow-brand/25">
          🗓️
        </div>
        <h1 className="text-[26px] font-extrabold leading-tight tracking-tight text-ink">
          모임 날짜,
          <br />
          한 번에 정해요
        </h1>
        <p className="mt-2 text-[15px] leading-relaxed text-ink-600">
          누가 안 했는지, 꼭 와야 할 사람은 되는지,
          <br />
          과반은 넘었는지까지 서른픽이 자동으로 알려줘요.
        </p>
      </header>

      <CreateRoom />

      <MyRooms />

      <div className="mt-9">
        <div className="mb-3 flex items-center gap-3">
          <span className="h-px flex-1 bg-line" />
          <span className="text-xs font-medium text-ink-500">처음이세요?</span>
          <span className="h-px flex-1 bg-line" />
        </div>
        <div className="grid grid-cols-2 gap-2.5">
          <Link
            href={`/poll/${DEMO_POLL_ID}`}
            className="flex h-12 items-center justify-center rounded-2xl bg-surface-sunken text-sm font-bold text-ink-700 active:scale-[0.99]"
          >
            샘플 투표 체험
          </Link>
          <Link
            href={`/poll/${DEMO_POLL_ID}/result`}
            className="flex h-12 items-center justify-center rounded-2xl bg-surface-sunken text-sm font-bold text-ink-700 active:scale-[0.99]"
          >
            샘플 결과 보기
          </Link>
        </div>
      </div>
    </main>
  )
}
