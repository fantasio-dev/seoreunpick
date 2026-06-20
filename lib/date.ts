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
