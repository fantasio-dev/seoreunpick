import type { PollBundle, VoteStatus } from './types'

// ─────────────────────────────────────────────────────────────────────────────
// 추천 알고리즘 (이 앱의 핵심 차별점)
//
// 각 후보 날짜에 대해:
//   available = O(가능) 찍은 사람들
//   anchorsOk = 모든 앵커가 available 에 포함? (앵커는 O만 인정, X/미응답이면 불충족)
//   count     = available 수
//   quorumOk  = count >= 정족수
// 랭킹: anchorsOk=true 우선 → count 내림차순
// 표시:
//   🟢 확정 추천: anchorsOk && quorumOk (그 중 count 최다가 대표)
//   🟡 조건부   : 한 조건만 충족 — 무엇이 빠졌는지 명시
//   ⚪ 탈락     : 둘 다 미충족
// 보너스: 미응답자가 전원 O 하면 🟢 도달 가능한 날짜인지 시나리오 표시
// ─────────────────────────────────────────────────────────────────────────────

export type Tier = 'green' | 'yellow' | 'gray'

export interface AnchorIssue {
  name: string
  status: VoteStatus | '미응답'
}

export interface DateAnalysis {
  pollDateId: number
  date: string
  oNames: string[]
  xNames: string[]
  noneNames: string[] // 이 날짜에 응답 안 한 사람
  count: number // O 수
  anchorsOk: boolean
  anchorIssues: AnchorIssue[] // O 가 아닌 앵커들
  quorumOk: boolean
  quorumShort: number // 정족수까지 몇 명 모자란지 (0이면 충족)
  tier: Tier
  reasons: string[] // 조건부/탈락 사유 (사람이 읽는 문장)
  potentialCount: number // 미응답자가 전원 O 했을 때 가능 인원
  canBecomeGreen: boolean // 미응답자 전원 O 시 🟢 가능?
}

export interface Recommendation {
  analyses: DateAnalysis[] // 날짜 순(시간순)
  ranked: DateAnalysis[] // 랭킹순(좋은 것 먼저)
  best: DateAnalysis | null // 대표 확정 추천(🟢 중 count 최다)
  bestFallback: DateAnalysis | null // 🟢 없을 때 차선(🟡 중 최상)
  totalMembers: number
  respondedMembers: number
  noResponseMembers: string[] // 한 날짜도 응답 안 한 사람
  quorum: number
}

function statusLabel(s: VoteStatus | '미응답'): string {
  return s
}

export function analyze(bundle: PollBundle): Recommendation {
  const { poll, dates, members, votes } = bundle
  const quorum = poll.quorum
  const anchors = members.filter((m) => m.isAnchor)

  // (memberId → (pollDateId → status))
  const voteMap = new Map<number, Map<number, VoteStatus>>()
  for (const v of votes) {
    let inner = voteMap.get(v.memberId)
    if (!inner) {
      inner = new Map()
      voteMap.set(v.memberId, inner)
    }
    inner.set(v.pollDateId, v.status)
  }

  const analyses: DateAnalysis[] = dates.map((d) => {
    const oNames: string[] = []
    const xNames: string[] = []
    const noneNames: string[] = []

    for (const m of members) {
      const status = voteMap.get(m.id)?.get(d.id)
      if (status === 'O') oNames.push(m.name)
      else if (status === 'X') xNames.push(m.name)
      else noneNames.push(m.name)
    }

    const count = oNames.length

    const anchorIssues: AnchorIssue[] = anchors
      .map((a) => {
        const status = voteMap.get(a.id)?.get(d.id)
        return { name: a.name, status: (status ?? '미응답') as VoteStatus | '미응답' }
      })
      .filter((a) => a.status !== 'O')
    const anchorsOk = anchorIssues.length === 0

    const quorumOk = count >= quorum
    const quorumShort = Math.max(0, quorum - count)

    let tier: Tier
    if (anchorsOk && quorumOk) tier = 'green'
    else if (anchorsOk || quorumOk) tier = 'yellow'
    else tier = 'gray'

    const reasons: string[] = []
    if (!anchorsOk) {
      const detail = anchorIssues.map((a) => `${a.name} ${statusLabel(a.status)}`).join(', ')
      reasons.push(`필수 참석자 미충족 (${detail})`)
    }
    if (!quorumOk) {
      reasons.push(`정족수 −${quorumShort}명 (가능 ${count} / 필요 ${quorum})`)
    }

    // 보너스: 미응답자가 전원 O 했을 때를 가정
    const potentialCount = count + noneNames.length
    // 앵커가 X 로 막혀 있으면(미응답이 아니면) 전원 O 가정으로도 못 살림
    const anchorBlocked = anchorIssues.some((a) => a.status === 'X')
    const canBecomeGreen =
      tier !== 'green' && !anchorBlocked && potentialCount >= quorum && noneNames.length > 0

    return {
      pollDateId: d.id,
      date: d.date,
      oNames,
      xNames,
      noneNames,
      count,
      anchorsOk,
      anchorIssues,
      quorumOk,
      quorumShort,
      tier,
      reasons,
      potentialCount,
      canBecomeGreen,
    }
  })

  // 랭킹: anchorsOk 우선 → count 내림차순 → 날짜 빠른 순
  const ranked = [...analyses].sort((a, b) => {
    if (a.anchorsOk !== b.anchorsOk) return a.anchorsOk ? -1 : 1
    if (a.count !== b.count) return b.count - a.count
    return a.date < b.date ? -1 : 1
  })

  const greens = analyses
    .filter((a) => a.tier === 'green')
    .sort((a, b) => b.count - a.count || (a.date < b.date ? -1 : 1))
  const best = greens[0] ?? null

  const yellows = analyses
    .filter((a) => a.tier === 'yellow')
    .sort((a, b) => {
      if (a.anchorsOk !== b.anchorsOk) return a.anchorsOk ? -1 : 1
      return b.count - a.count || (a.date < b.date ? -1 : 1)
    })
  const bestFallback = best ? null : yellows[0] ?? null

  // 한 날짜라도 응답한 멤버 = 응답자
  const respondedIds = new Set(votes.map((v) => v.memberId))
  const noResponseMembers = members.filter((m) => !respondedIds.has(m.id)).map((m) => m.name)

  return {
    analyses,
    ranked,
    best,
    bestFallback,
    totalMembers: members.length,
    respondedMembers: respondedIds.size,
    noResponseMembers,
    quorum,
  }
}
