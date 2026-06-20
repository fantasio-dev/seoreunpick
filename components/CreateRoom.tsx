'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createPollAction } from '@/app/actions'
import { formatKo } from '@/lib/date'
import Calendar from './Calendar'

interface MemberInput {
  name: string
  isAnchor: boolean
}

export default function CreateRoom() {
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [hostName, setHostName] = useState('')
  const [dates, setDates] = useState<string[]>([])
  const [members, setMembers] = useState<MemberInput[]>([
    { name: '', isAnchor: false },
    { name: '', isAnchor: false },
    { name: '', isAnchor: false },
  ])
  const [quorum, setQuorum] = useState<number>(2)
  const [quorumTouched, setQuorumTouched] = useState(false)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const validCount = useMemo(
    () => members.filter((m) => m.name.trim().length > 0).length,
    [members],
  )
  const majority = Math.max(1, Math.floor(validCount / 2) + 1)
  const effectiveQuorum = quorumTouched ? quorum : majority

  function updateMember(i: number, patch: Partial<MemberInput>) {
    setMembers((prev) => prev.map((m, idx) => (idx === i ? { ...m, ...patch } : m)))
  }
  function addMember() {
    setMembers((prev) => [...prev, { name: '', isAnchor: false }])
  }
  function removeMember(i: number) {
    setMembers((prev) => (prev.length <= 1 ? prev : prev.filter((_, idx) => idx !== i)))
  }

  async function handleSubmit() {
    setError('')
    const cleanMembers = members
      .map((m) => ({ name: m.name.trim(), isAnchor: m.isAnchor }))
      .filter((m) => m.name.length > 0)

    if (!title.trim()) return setError('모임명을 입력해주세요.')
    if (cleanMembers.length < 2) return setError('멤버를 2명 이상 입력해주세요.')
    if (dates.length < 1) return setError('후보 날짜를 1개 이상 골라주세요.')
    const names = cleanMembers.map((m) => m.name)
    if (new Set(names).size !== names.length) return setError('멤버 이름이 중복됩니다.')

    setSubmitting(true)
    try {
      const { id } = await createPollAction({
        title: title.trim(),
        hostName: hostName.trim(),
        quorum: effectiveQuorum,
        dates,
        members: cleanMembers,
      })
      router.push(`/poll/${id}/result?created=1`)
    } catch (e) {
      setError(e instanceof Error ? e.message : '방 생성에 실패했어요.')
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* 모임명 */}
      <Field label="모임명" required>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="예) 서른개 7월 정모"
          className="input"
        />
      </Field>

      {/* 방장 이름 */}
      <Field label="방장 이름" hint="비워두면 첫 번째 멤버가 방장이 돼요">
        <input
          value={hostName}
          onChange={(e) => setHostName(e.target.value)}
          placeholder="예) 최태석"
          className="input"
        />
      </Field>

      {/* 후보 날짜 */}
      <Field label="후보 날짜" required hint="달력에서 여러 날을 탭하세요">
        <Calendar value={dates} onChange={setDates} />
        {dates.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {dates.map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setDates(dates.filter((x) => x !== d))}
                className="inline-flex items-center gap-1 rounded-full bg-brand/10 px-2.5 py-1 text-xs font-medium text-brand-700"
              >
                {formatKo(d)} <span className="text-brand-700/60">✕</span>
              </button>
            ))}
          </div>
        )}
      </Field>

      {/* 멤버 */}
      <Field label="멤버" required hint="⭐ = 필수 참석자(앵커). 이 사람이 빠지면 추천에서 제외돼요">
        <div className="space-y-2">
          {members.map((m, i) => (
            <div key={i} className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => updateMember(i, { isAnchor: !m.isAnchor })}
                className={[
                  'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border text-lg transition',
                  m.isAnchor
                    ? 'border-amber-300 bg-amber-50 text-amber-500'
                    : 'border-slate-200 bg-white text-slate-300',
                ].join(' ')}
                aria-label="필수 참석자 토글"
                title="필수 참석자(앵커)로 지정"
              >
                {m.isAnchor ? '⭐' : '☆'}
              </button>
              <input
                value={m.name}
                onChange={(e) => updateMember(i, { name: e.target.value })}
                placeholder={`멤버 ${i + 1} 이름`}
                className="input flex-1"
              />
              <button
                type="button"
                onClick={() => removeMember(i)}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-slate-300 hover:text-rose-400"
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
          className="mt-2 w-full rounded-xl border border-dashed border-slate-300 py-2.5 text-sm font-medium text-slate-500 hover:border-brand/40 hover:text-brand"
        >
          + 멤버 추가
        </button>
      </Field>

      {/* 정족수 */}
      <Field label="정족수" hint={`최소 ${effectiveQuorum}명 모이면 성사로 봐요`}>
        <div className="flex items-center gap-2">
          <input
            type="number"
            min={1}
            max={Math.max(1, validCount)}
            value={effectiveQuorum}
            onChange={(e) => {
              setQuorumTouched(true)
              setQuorum(Number(e.target.value))
            }}
            className="input w-24 text-center"
          />
          <span className="text-sm text-slate-400">/ {validCount || 0}명</span>
          {quorumTouched && (
            <button
              type="button"
              onClick={() => setQuorumTouched(false)}
              className="ml-auto rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-500"
            >
              과반({majority})으로
            </button>
          )}
        </div>
      </Field>

      {error && (
        <p className="rounded-xl bg-rose-50 px-3 py-2.5 text-sm text-rose-600">{error}</p>
      )}

      <button
        type="button"
        onClick={handleSubmit}
        disabled={submitting}
        className="sticky bottom-4 w-full rounded-2xl bg-brand py-4 text-base font-bold text-white shadow-lg shadow-brand/25 transition active:scale-[0.99] disabled:opacity-60"
      >
        {submitting ? '만드는 중…' : '방 만들고 링크 받기'}
      </button>
    </div>
  )
}

function Field({
  label,
  required,
  hint,
  children,
}: {
  label: string
  required?: boolean
  hint?: string
  children: React.ReactNode
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-baseline gap-1.5">
        <span className="text-sm font-semibold text-slate-700">{label}</span>
        {required && <span className="text-brand">*</span>}
        {hint && <span className="text-xs text-slate-400">{hint}</span>}
      </div>
      {children}
    </div>
  )
}
