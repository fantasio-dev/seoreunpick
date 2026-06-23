import Database from 'better-sqlite3'
import fs from 'node:fs'
import path from 'node:path'
import { newId } from './id'
import type {
  CreatePollInput,
  MemberRow,
  PollBundle,
  PollDateRow,
  PollMeta,
  PollStatus,
  VoteEntry,
  VoteRow,
} from './types'

// ─────────────────────────────────────────────────────────────────────────────
// 데이터 접근은 전부 이 파일에 모은다. 다른 DB(Turso/Postgres 등)로 바꿀 때
// 여기 함수 본문만 갈아끼우면 되도록, 바깥에는 도메인 타입만 노출한다.
// ─────────────────────────────────────────────────────────────────────────────

const DB_DIR = path.join(process.cwd(), 'data')
const DB_PATH = process.env.SEOREUNPICK_DB ?? path.join(DB_DIR, 'seoreunpick.db')

const SCHEMA = `
CREATE TABLE IF NOT EXISTS poll (
  id                     TEXT PRIMARY KEY,
  title                  TEXT NOT NULL,
  host_name              TEXT NOT NULL,
  quorum                 INTEGER NOT NULL,
  status                 TEXT NOT NULL DEFAULT 'open',
  confirmed_poll_date_id INTEGER,
  created_at             TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS poll_date (
  id      INTEGER PRIMARY KEY AUTOINCREMENT,
  poll_id TEXT NOT NULL REFERENCES poll(id) ON DELETE CASCADE,
  date    TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS member (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  poll_id   TEXT NOT NULL REFERENCES poll(id) ON DELETE CASCADE,
  name      TEXT NOT NULL,
  is_anchor INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS vote (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  poll_id      TEXT NOT NULL REFERENCES poll(id) ON DELETE CASCADE,
  member_id    INTEGER NOT NULL REFERENCES member(id) ON DELETE CASCADE,
  poll_date_id INTEGER NOT NULL REFERENCES poll_date(id) ON DELETE CASCADE,
  status       TEXT NOT NULL,
  updated_at   TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(member_id, poll_date_id)
);

CREATE INDEX IF NOT EXISTS idx_poll_date_poll ON poll_date(poll_id);
CREATE INDEX IF NOT EXISTS idx_member_poll ON member(poll_id);
CREATE INDEX IF NOT EXISTS idx_vote_poll ON vote(poll_id);
`

function init(): Database.Database {
  fs.mkdirSync(DB_DIR, { recursive: true })
  const db = new Database(DB_PATH)
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')
  db.exec(SCHEMA)
  seedIfEmpty(db)
  return db
}

// dev 핫리로드 때마다 새 커넥션이 열리는 걸 막으려고 globalThis 에 캐시한다.
const globalForDb = globalThis as unknown as { __seoreunpickDb?: Database.Database }
const db: Database.Database = globalForDb.__seoreunpickDb ?? (globalForDb.__seoreunpickDb = init())

// ── 매핑 헬퍼 (snake_case 행 → 도메인 타입) ──────────────────────────────────

function mapPoll(row: any): PollMeta {
  return {
    id: row.id,
    title: row.title,
    hostName: row.host_name,
    quorum: row.quorum,
    status: row.status as PollStatus,
    confirmedPollDateId: row.confirmed_poll_date_id ?? null,
    createdAt: row.created_at,
  }
}

// ── 쓰기 ─────────────────────────────────────────────────────────────────────

export function createPoll(input: CreatePollInput): string {
  const id = input.id ?? newId()
  const insertPoll = db.prepare(
    `INSERT INTO poll (id, title, host_name, quorum, status) VALUES (?, ?, ?, ?, 'open')`,
  )
  const insertDate = db.prepare(`INSERT INTO poll_date (poll_id, date) VALUES (?, ?)`)
  const insertMember = db.prepare(`INSERT INTO member (poll_id, name, is_anchor) VALUES (?, ?, ?)`)

  const tx = db.transaction(() => {
    insertPoll.run(id, input.title, input.hostName, input.quorum)
    for (const d of input.dates) insertDate.run(id, d)
    for (const m of input.members) insertMember.run(id, m.name, m.isAnchor ? 1 : 0)
  })
  tx()
  return id
}

/** 한 멤버의 날짜별 응답을 일괄 upsert. 기존 응답은 덮어쓴다. */
export function upsertVotes(pollId: string, memberId: number, entries: VoteEntry[]): void {
  const stmt = db.prepare(
    `INSERT INTO vote (poll_id, member_id, poll_date_id, status, updated_at)
     VALUES (?, ?, ?, ?, datetime('now'))
     ON CONFLICT(member_id, poll_date_id)
     DO UPDATE SET status = excluded.status, updated_at = excluded.updated_at`,
  )
  const tx = db.transaction(() => {
    for (const e of entries) stmt.run(pollId, memberId, e.pollDateId, e.status)
  })
  tx()
}

/** 날짜 확정 / 확정 해제(null). */
export function setConfirmedDate(pollId: string, pollDateId: number | null): void {
  db.prepare(`UPDATE poll SET status = ?, confirmed_poll_date_id = ? WHERE id = ?`).run(
    pollDateId === null ? 'open' : 'confirmed',
    pollDateId,
    pollId,
  )
}

// ── 읽기 ─────────────────────────────────────────────────────────────────────

export function getPollBundle(pollId: string): PollBundle | null {
  const pollRow = db.prepare(`SELECT * FROM poll WHERE id = ?`).get(pollId)
  if (!pollRow) return null

  const dates = db
    .prepare(`SELECT id, date FROM poll_date WHERE poll_id = ? ORDER BY date ASC, id ASC`)
    .all(pollId) as PollDateRow[]

  const memberRows = db
    .prepare(`SELECT id, name, is_anchor FROM member WHERE poll_id = ? ORDER BY id ASC`)
    .all(pollId) as { id: number; name: string; is_anchor: number }[]
  const members: MemberRow[] = memberRows.map((m) => ({
    id: m.id,
    name: m.name,
    isAnchor: !!m.is_anchor,
  }))

  const voteRows = db
    .prepare(`SELECT member_id, poll_date_id, status FROM vote WHERE poll_id = ?`)
    .all(pollId) as { member_id: number; poll_date_id: number; status: string }[]
  const votes: VoteRow[] = voteRows.map((v) => ({
    memberId: v.member_id,
    pollDateId: v.poll_date_id,
    status: v.status as VoteRow['status'],
  }))

  return { poll: mapPoll(pollRow), dates, members, votes }
}

// ── 시드 ─────────────────────────────────────────────────────────────────────

function seedIfEmpty(handle: Database.Database): void {
  const count = (handle.prepare(`SELECT COUNT(*) AS c FROM poll`).get() as { c: number }).c
  if (count > 0) return

  const SEED_ID = 'demo'
  handle
    .prepare(`INSERT INTO poll (id, title, host_name, quorum, status) VALUES (?, ?, ?, ?, 'open')`)
    .run(SEED_ID, '서른개 7월 정모 (윤이사님 승진 축하)', '최태석', 5)

  const dateList = ['2026-07-07', '2026-07-08', '2026-07-09', '2026-07-10']
  const insDate = handle.prepare(`INSERT INTO poll_date (poll_id, date) VALUES (?, ?)`)
  const dateId: Record<string, number> = {}
  for (const d of dateList) dateId[d] = Number(insDate.run(SEED_ID, d).lastInsertRowid)

  // 앵커(필수 참석): 이승현, 윤희욱
  const memberList: { name: string; anchor: boolean }[] = [
    { name: '최태석', anchor: false },
    { name: '김정욱', anchor: false },
    { name: '이승현', anchor: true },
    { name: '이풍환', anchor: false },
    { name: '류재우', anchor: false },
    { name: '윤희욱', anchor: true },
    { name: '라윤철', anchor: false },
    { name: '김선우', anchor: false },
    { name: '김민석', anchor: false },
  ]
  const insMember = handle.prepare(`INSERT INTO member (poll_id, name, is_anchor) VALUES (?, ?, ?)`)
  const memberId: Record<string, number> = {}
  for (const m of memberList) {
    memberId[m.name] = Number(insMember.run(SEED_ID, m.name, m.anchor ? 1 : 0).lastInsertRowid)
  }

  // 알고리즘이 한눈에 보이도록 샘플 응답 주입 (O/X 2단계).
  //  07-08 → 🟢 확정추천 (앵커 둘 다 O, 7명)
  //  07-07 → 🟡 조건부 (정족수 5 충족이지만 앵커 이승현 X)
  //  07-09 → 🟡 조건부 (앵커 OK지만 정족수 -1, 미응답 전원 O면 도달 가능)
  //  07-10 → ⚪ 탈락
  //  라윤철, 김선우 → 전혀 응답 안 함(미응답)
  const v: Record<string, Record<string, 'O' | 'X'>> = {
    최태석: { '2026-07-07': 'O', '2026-07-08': 'O', '2026-07-09': 'X', '2026-07-10': 'X' },
    김정욱: { '2026-07-07': 'O', '2026-07-08': 'O', '2026-07-09': 'O', '2026-07-10': 'X' },
    이승현: { '2026-07-07': 'X', '2026-07-08': 'O', '2026-07-09': 'O', '2026-07-10': 'X' },
    이풍환: { '2026-07-07': 'O', '2026-07-08': 'O', '2026-07-09': 'X', '2026-07-10': 'O' },
    류재우: { '2026-07-07': 'O', '2026-07-08': 'O', '2026-07-09': 'X', '2026-07-10': 'X' },
    윤희욱: { '2026-07-07': 'O', '2026-07-08': 'O', '2026-07-09': 'O', '2026-07-10': 'X' },
    김민석: { '2026-07-07': 'X', '2026-07-08': 'O', '2026-07-09': 'O', '2026-07-10': 'O' },
  }
  const insVote = handle.prepare(
    `INSERT INTO vote (poll_id, member_id, poll_date_id, status) VALUES (?, ?, ?, ?)`,
  )
  for (const [name, perDate] of Object.entries(v)) {
    for (const [d, status] of Object.entries(perDate)) {
      insVote.run(SEED_ID, memberId[name], dateId[d], status)
    }
  }
}

/** 시드 방 id (README/홈에서 링크 노출용). */
export const DEMO_POLL_ID = 'demo'
