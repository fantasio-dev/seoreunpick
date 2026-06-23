// 도메인 타입. DB 행(snake_case)은 lib/db.ts 안에서 camelCase 로 매핑해 내보낸다.

export type VoteStatus = 'O' | 'X'

export type PollStatus = 'open' | 'confirmed'

export interface PollMeta {
  id: string
  title: string
  hostName: string
  quorum: number
  status: PollStatus
  confirmedPollDateId: number | null
  createdAt: string
}

export interface PollDateRow {
  id: number
  date: string // YYYY-MM-DD
}

export interface MemberRow {
  id: number
  name: string
  isAnchor: boolean
}

export interface VoteRow {
  memberId: number
  pollDateId: number
  status: VoteStatus
}

/** 한 방의 모든 데이터를 한 번에 담는 번들 (UI 렌더링용) */
export interface PollBundle {
  poll: PollMeta
  dates: PollDateRow[]
  members: MemberRow[]
  votes: VoteRow[]
}

/** 방 생성 입력 */
export interface CreatePollInput {
  id?: string // 시드용 고정 id (없으면 자동 생성)
  title: string
  hostName: string
  quorum: number
  dates: string[]
  members: { name: string; isAnchor: boolean }[]
}

/** 투표 제출 입력 (한 멤버의 날짜별 응답) */
export interface VoteEntry {
  pollDateId: number
  status: VoteStatus
}
