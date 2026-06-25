// 무인증 구조라 "내가 만든 방"은 서버가 모른다. 방장이 만든/관리하는 방을
// 이 기기(localStorage)에만 기억해 홈에서 다시 열 수 있게 한다. 관리 토큰도 함께 보관.

const KEY = 'seoreunpick:myRooms'

export interface MyRoom {
  id: string
  title: string
  token: string
  ts: number
}

export function listMyRooms(): MyRoom[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(KEY)
    if (!raw) return []
    const arr = JSON.parse(raw) as MyRoom[]
    if (!Array.isArray(arr)) return []
    return arr.filter((r) => r && r.id).sort((a, b) => b.ts - a.ts)
  } catch {
    return []
  }
}

export function rememberRoom(room: { id: string; title: string; token: string }): void {
  if (typeof window === 'undefined' || !room.id || !room.token) return
  try {
    const rooms = listMyRooms().filter((r) => r.id !== room.id)
    rooms.unshift({ id: room.id, title: room.title, token: room.token, ts: Date.now() })
    window.localStorage.setItem(KEY, JSON.stringify(rooms))
  } catch {
    // 저장 실패(용량/프라이빗 모드)는 조용히 무시
  }
}

export function forgetRoom(id: string): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(KEY, JSON.stringify(listMyRooms().filter((r) => r.id !== id)))
  } catch {
    // 무시
  }
}
