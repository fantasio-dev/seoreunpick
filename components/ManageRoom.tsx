'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { deletePollAction, updatePollAction } from '@/app/actions'

interface Props {
  pollId: string
  token: string
  memberCount: number
  initial: { title: string; quorum: number; deadline: string | null }
}

/** 방장 전용 방 관리(제목/정족수/마감일 수정, 삭제). 날짜·멤버 편집은 범위 밖. */
export default function ManageRoom({ pollId, token, memberCount, initial }: Props) {
  const router = useRouter()
  const [title, setTitle] = useState(initial.title)
  const [quorum, setQuorum] = useState(initial.quorum)
  const [deadline, setDeadline] = useState(initial.deadline ?? '')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const today = new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10)

  async function save() {
    setError('')
    if (!title.trim()) return setError('모임명을 입력해주세요.')
    setSaving(true)
    try {
      await updatePollAction(pollId, token, { title: title.trim(), quorum, deadline: deadline || null })
      setSaved(true)
      setTimeout(() => setSaved(false), 1600)
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : '저장에 실패했어요.')
    } finally {
      setSaving(false)
    }
  }

  async function remove() {
    setDeleting(true)
    try {
      await deletePollAction(pollId, token)
      router.push('/')
    } catch (e) {
      setError(e instanceof Error ? e.message : '삭제에 실패했어요.')
      setDeleting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <label className="mb-2 block text-[15px] font-bold text-ink">모임명</label>
        <input value={title} onChange={(e) => setTitle(e.target.value)} className="input" />
      </div>

      <div>
        <label className="mb-2 block text-[15px] font-bold text-ink">정족수</label>
        <div className="flex h-[52px] items-center justify-between rounded-2xl bg-surface-sunken px-2">
          <button
            type="button"
            onClick={() => setQuorum((q) => Math.max(1, q - 1))}
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-xl font-bold text-ink-700 shadow-card active:scale-95"
            aria-label="정족수 줄이기"
          >
            −
          </button>
          <span className="text-[17px] font-bold text-ink">
            {quorum}
            <span className="ml-1 text-sm font-medium text-ink-500">/ {memberCount}명</span>
          </span>
          <button
            type="button"
            onClick={() => setQuorum((q) => Math.min(memberCount, q + 1))}
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-xl font-bold text-ink-700 shadow-card active:scale-95"
            aria-label="정족수 늘리기"
          >
            +
          </button>
        </div>
      </div>

      <div>
        <label className="mb-2 block text-[15px] font-bold text-ink">투표 마감일</label>
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={deadline}
            min={today}
            onChange={(e) => setDeadline(e.target.value)}
            className="input flex-1"
          />
          {deadline && (
            <button
              type="button"
              onClick={() => setDeadline('')}
              className="h-[52px] shrink-0 rounded-2xl bg-surface-sunken px-3.5 text-[13px] font-bold text-ink-600 active:scale-95"
            >
              없음
            </button>
          )}
        </div>
        <p className="mt-1.5 text-xs font-medium text-ink-500">
          날짜와 멤버는 여기서 못 바꿔요. 바꾸려면 방을 새로 만들어 주세요.
        </p>
      </div>

      {error && (
        <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm font-medium text-rose-600">{error}</p>
      )}

      <button type="button" onClick={save} disabled={saving} className="btn-primary">
        {saving ? '저장 중…' : saved ? '저장됨 ✓' : '저장하기'}
      </button>

      <div className="border-t border-line pt-5">
        {!confirmDelete ? (
          <button
            type="button"
            onClick={() => setConfirmDelete(true)}
            className="h-12 w-full rounded-2xl bg-rose-50 text-[15px] font-bold text-rose-600 active:scale-[0.99]"
          >
            방 삭제하기
          </button>
        ) : (
          <div className="rounded-2xl bg-rose-50 p-4">
            <p className="text-sm font-bold text-rose-600">정말 삭제할까요? 투표 기록까지 모두 사라져요.</p>
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={remove}
                disabled={deleting}
                className="h-11 flex-1 rounded-xl bg-rose-600 text-sm font-bold text-white active:scale-[0.99] disabled:opacity-60"
              >
                {deleting ? '삭제 중…' : '네, 삭제할게요'}
              </button>
              <button
                type="button"
                onClick={() => setConfirmDelete(false)}
                className="h-11 flex-1 rounded-xl bg-white text-sm font-bold text-ink-700 active:scale-[0.99]"
              >
                취소
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
