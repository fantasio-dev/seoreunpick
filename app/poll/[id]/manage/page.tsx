import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import ManageRoom from '@/components/ManageRoom'
import { getPollBundle, verifyManage } from '@/lib/db'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: '방 관리 — 서른픽',
  robots: { index: false },
}

export default async function ManagePage({
  params,
  searchParams,
}: {
  params: { id: string }
  searchParams: { t?: string }
}) {
  const bundle = await getPollBundle(params.id)
  if (!bundle) notFound()

  const token = searchParams.t ?? ''
  const canManage = await verifyManage(params.id, token)

  if (!canManage) {
    return (
      <main className="py-10 text-center">
        <p className="text-2xl">🔒</p>
        <h1 className="mt-2 text-[20px] font-extrabold text-ink">방장만 들어올 수 있어요</h1>
        <p className="mt-1 text-[13px] font-medium text-ink-500">방을 만들 때 받은 관리 링크로 들어와 주세요.</p>
        <Link href={`/poll/${params.id}/result`} className="mt-6 inline-block text-sm font-bold text-brand">
          결과 보기 →
        </Link>
      </main>
    )
  }

  const { poll, members } = bundle

  return (
    <main>
      <header className="mb-6">
        <Link href={`/poll/${poll.id}/result?t=${token}`} className="text-[13px] font-bold text-ink-500">
          ← 결과로
        </Link>
        <h1 className="mt-1.5 text-[22px] font-extrabold leading-snug text-ink">방 관리</h1>
        <p className="mt-1 text-[13px] font-medium text-ink-500">제목, 멤버, 정족수, 마감일을 바꾸거나 방을 삭제해요</p>
      </header>

      <ManageRoom
        pollId={poll.id}
        token={token}
        initial={{
          title: poll.title,
          quorum: poll.quorum,
          deadline: poll.deadline,
          members: members.map((m) => ({ id: m.id, name: m.name, isAnchor: m.isAnchor })),
        }}
      />
    </main>
  )
}
