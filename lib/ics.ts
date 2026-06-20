import { formatIcsDate, nextDayIcs } from './date'

interface IcsInput {
  title: string
  date: string // YYYY-MM-DD
  uid: string
}

/** 종일(all-day) 일정 .ics 문자열 생성. RFC 5545 최소 형식, 줄바꿈은 CRLF. */
export function buildIcs({ title, date, uid }: IcsInput): string {
  // 텍스트 이스케이프: 쉼표/세미콜론/역슬래시
  const esc = (s: string) => s.replace(/[\\;,]/g, (m) => '\\' + m).replace(/\n/g, '\\n')
  const stamp = formatIcsDate(date) + 'T000000Z'

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//seoreunpick//KO',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${stamp}`,
    `DTSTART;VALUE=DATE:${formatIcsDate(date)}`,
    `DTEND;VALUE=DATE:${nextDayIcs(date)}`,
    `SUMMARY:${esc(title)}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ]
  return lines.join('\r\n') + '\r\n'
}
