// 날짜 문자열(YYYY-MM-DD) 포맷 헬퍼. 서버/클라이언트 양쪽에서 쓰는 순수 함수.
// new Date 파싱 시 타임존 흔들림을 피하려고 항상 분해해서 로컬 생성자로 만든다.

const WEEKDAY = ['일', '월', '화', '수', '목', '금', '토']

export function parseYmd(s: string): { y: number; m: number; d: number } {
  const [y, m, d] = s.split('-').map(Number)
  return { y, m, d }
}

export function weekdayKo(s: string): string {
  const { y, m, d } = parseYmd(s)
  return WEEKDAY[new Date(y, m - 1, d).getDay()]
}

/** "7월 8일 (수)" */
export function formatKo(s: string): string {
  const { m, d } = parseYmd(s)
  return `${m}월 ${d}일 (${weekdayKo(s)})`
}

/** "7/8" */
export function formatShort(s: string): string {
  const { m, d } = parseYmd(s)
  return `${m}/${d}`
}

/** ics용 "20260708" */
export function formatIcsDate(s: string): string {
  const { y, m, d } = parseYmd(s)
  return `${y}${String(m).padStart(2, '0')}${String(d).padStart(2, '0')}`
}

/** s 의 다음 날을 "20260709" 형식으로 (all-day 이벤트 DTEND 용) */
export function nextDayIcs(s: string): string {
  const { y, m, d } = parseYmd(s)
  const next = new Date(y, m - 1, d + 1)
  const ny = next.getFullYear()
  const nm = String(next.getMonth() + 1).padStart(2, '0')
  const nd = String(next.getDate()).padStart(2, '0')
  return `${ny}${nm}${nd}`
}

// ── 마감일 (KST 기준) ─────────────────────────────────────────────────────────
// 서버는 Vercel(UTC)에서 돌 수 있어 "오늘"을 항상 KST(UTC+9)로 계산한다.

/** KST 기준 오늘 "YYYY-MM-DD" */
export function todayKstYmd(): string {
  const kst = new Date(Date.now() + 9 * 60 * 60 * 1000)
  return kst.toISOString().slice(0, 10)
}

/** 마감일이 지났는지 (마감일 당일까지는 투표 가능, 다음 날부터 마감) */
export function isDeadlinePassed(deadline: string | null | undefined): boolean {
  return !!deadline && todayKstYmd() > deadline
}

/** KST 오늘 → dateStr 까지 남은 일수 (0=오늘, 음수=지남) */
export function daysUntil(dateStr: string): number {
  const a = parseYmd(todayKstYmd())
  const b = parseYmd(dateStr)
  const da = Date.UTC(a.y, a.m - 1, a.d)
  const db = Date.UTC(b.y, b.m - 1, b.d)
  return Math.round((db - da) / 86400000)
}

/** "투표 마감 D-3, 7월 6일 (월)" / "오늘 투표 마감" / "투표 마감됨" */
export function deadlineLabel(deadline: string): string {
  const d = daysUntil(deadline)
  if (d < 0) return '투표 마감됨'
  if (d === 0) return '오늘 투표 마감'
  return `투표 마감 D-${d}, ${formatKo(deadline)}`
}
