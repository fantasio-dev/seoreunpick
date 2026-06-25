'use server'

import { revalidatePath } from 'next/cache'
import { createPoll, getPollBundle, setConfirmedDate, upsertVotes } from '@/lib/db'
import { isDeadlinePassed, todayKstYmd } from '@/lib/date'
import type { CreatePollInput, VoteEntry } from '@/lib/types'

/** 방 생성 → 새 poll id 반환. 클라이언트가 받아서 결과 페이지로 이동한다. */
export async function createPollAction(input: CreatePollInput): Promise<{ id: string }> {
  const title = input.title.trim()
  const members = input.members
    .map((m) => ({ name: m.name.trim(), isAnchor: m.isAnchor }))
    .filter((m) => m.name.length > 0)
  const dates = Array.from(new Set(input.dates)).sort()

  if (!title) throw new Error('모임명을 입력해주세요.')
  if (members.length < 2) throw new Error('멤버를 2명 이상 입력해주세요.')
  if (dates.length < 1) throw new Error('후보 날짜를 1개 이상 골라주세요.')

  // 이름 중복 방지
  const names = members.map((m) => m.name)
  if (new Set(names).size !== names.length) throw new Error('멤버 이름이 중복됩니다.')

  const quorum = Math.min(Math.max(1, Math.round(input.quorum)), members.length)
  const hostName = input.hostName.trim() || members[0].name

  // 마감일(선택): 지난 날짜면 무시
  let deadline: string | null = input.deadline?.trim() || null
  if (deadline && deadline < todayKstYmd()) deadline = null

  const id = await createPoll({ title, hostName, quorum, dates, members, deadline })
  return { id }
}

/** 한 멤버의 투표 제출/수정. */
export async function submitVoteAction(
  pollId: string,
  memberId: number,
  entries: VoteEntry[],
): Promise<{ ok: true }> {
  // 마감 지난 방은 추가 투표 차단 (getPollBundle 이 마감 자동 확정도 함께 처리)
  const bundle = await getPollBundle(pollId)
  if (!bundle) throw new Error('방을 찾을 수 없어요.')
  if (isDeadlinePassed(bundle.poll.deadline)) throw new Error('투표가 마감됐어요.')

  await upsertVotes(pollId, memberId, entries)
  revalidatePath(`/poll/${pollId}`)
  revalidatePath(`/poll/${pollId}/result`)
  return { ok: true }
}

/** 날짜 확정 / 해제. */
export async function confirmDateAction(
  pollId: string,
  pollDateId: number | null,
): Promise<{ ok: true }> {
  await setConfirmedDate(pollId, pollDateId)
  revalidatePath(`/poll/${pollId}`)
  revalidatePath(`/poll/${pollId}/result`)
  return { ok: true }
}
