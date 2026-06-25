'use client'

import { useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { deletePollAction, updatePollAction } from '@/app/actions'

interface MemberRow {
  k: number // 클라이언트 전용 안정 key
  id: number | null // 기존 멤버 id (새 멤버는 null)
  name: string
  isAnchor: boolean
}

interface Props {
  pollId: string
  token: string
  initial: {
    title: string
    quorum: number
    deadline: string | null
    members: { id: number; name: string; isAnchor: boolean }[]
  }
}

/** 방장 전용 방 관리(제목/정족수/마감일/멤버 수정, 삭제). 날짜 편집은 범위 밖. */
export default function ManageRoom({ pollId, token, initial }: Props) {
  const router = useRouter()
  const keyRef = useRef(0)
  const [title, setTitle] = useState(initial.title)
  const [quorum, setQuorum] = useState(initial.quorum)
  const [deadline, setDeadline] = useState(initial.deadline ?? '')
  const [members, setMembers] = useState<MemberRow[]>(() =>
    initial.members.map((m) => ({ k: keyRef.current++, id: m.id, name: m.name, isAnchor: m.isAnchor })),
  )
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const today = new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10)

  const validCount = useMemo(() => members.filter((m) => m.name.trim().length > 0).length, [members])
  // 정족수는 멤버 수 이내로만
  const effQuorum = Math.min(Math.max(1, quorum), Math.max(1, validCount))

  function updateMember(k: number, patch: Partial<MemberRow>) {
    setMembers((prev) => prev.map((m) => (m.k === k ? { ...m, ...patch } : m)))
  }
  function addMember() {
    setMembers((prev) => [...prev, { k: keyRef.current++, id: null, name: '', isAnchor: false }])
  }
  function removeMember(k: number) {
    setMembers((prev) => (prev.length <= 1 ? prev : prev.filter((m) => m.k !== k)))
  }

  async function save() {
    setError('')
    if (!title.trim()) return setError('모임명을 입력해주세요.')
    const cleaned = members
      .map((m) => ({ id: m.id, name: m.name.trim(), isAnchor: m.isAnchor }))
      .filter((m) => m.name.length > 0)
    if (cleaned.length < 2) return setError('멤버를 2명 이상 입력해주세요.')
    const names = cleaned.map((m) => m.name)
    if (new Set(names).size !== names.length) return setError('멤버 이름이 중복됩니다.')

    setSaving(true)
    try {
      await updatePollAction(pollId, token, {
        title: title.trim(),
        quorum: effQuorum,
        deadline: deadline || null,
        members: cleaned,
      })
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
        <div className="mb-2 flex items-baseline gap-1.5">
          <span className="text-[15px] font-bold text-ink">멤버</span>
          <span className="text-xs font-medium text-ink-500">⭐ = 필수 참석자. 삭제하면 그 사람 투표도 사라져요</span>
        </div>
        <div className="space-y-2">
          {members.map((m) => (
            <div key={m.k} className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => updateMember(m.k, { isAnchor: !m.isAnchor })}
                className={[
                  'flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-2xl text-lg transition active:scale-95',
                  m.isAnchor ? 'bg-maybe-light text-maybe' : 'bg-surface-sunken text-ink-400',
                ].join(' ')}
                aria-label="필수 참석자 토글"
                title="필수 참석자(앵커)로 지정"
              >
                {m.isAnchor ? '⭐' : '☆'}
              </button>
              <input
                value={m.name}
                onChange={(e) => updateMember(m.k, { name: e.target.value })}
                placeholder="이름"
                className="input flex-1"
              />
              <button
                type="button"
                onClick={() => removeMember(m.k)}
                className="flex h-[52px] w-10 shrink-0 items-center justify-center rounded-2xl text-ink-400 active:scale-95"
                aria-label="멤버 삭제"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={addMember}
          className="mt-2 h-12 w-full rounded-2xl bg-surface-sunken text-sm font-bold text-ink-600 active:scale-[0.99]"
        >
          + 멤버 추가
        </button>
      </div>

      <div>
        <label className="mb-2 block text-[15px] font-bold text-ink">정족수</label>
        <div className="flex h-[52px] items-center justify-between rounded-2xl bg-surface-sunken px-2">
          <button
            type="button"
            onClick={() => setQuorum(Math.max(1, effQuorum - 1))}
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-xl font-bold text-ink-700 shadow-card active:scale-95"
            aria-label="정족수 줄이기"
          >
            −
          </button>
          <span className="text-[17px] font-bold text-ink">
            {effQuorum}
            <span className="ml-1 text-sm font-medium text-ink-500">/ {validCount}명</span>
          </span>
          <button
            type="button"
            onClick={() => setQuorum(Math.min(Math.max(1, validCount), effQuorum + 1))}
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
        <p className="mt-1.5 text-xs font-medium text-ink-500">후보 날짜는 여기서 못 바꿔요. 바꾸려면 방을 새로 만들어 주세요.</p>
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
