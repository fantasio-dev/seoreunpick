import { createClient, type Client, type InStatement } from '@libsql/client'
import fs from 'node:fs'
import path from 'node:path'
import { isDeadlinePassed } from './date'
import { analyze } from './recommend'
import { newId } from './id'
import type {
  CreatePollInput,
  MemberRow,
  PollBundle,
  PollMeta,
  PollStatus,
  UpdatePollInput,
  VoteEntry,
  VoteRow,
  VoteStatus,
} from './types'

// ─────────────────────────────────────────────────────────────────────────────
// 데이터 접근은 전부 이 파일에 모은다. libSQL(@libsql/client) 하나로
//   - 로컬:  file: 경로 (data/seoreunpick.db)
//   - 운영:  Turso (TURSO_DATABASE_URL / TURSO_AUTH_TOKEN)
// 둘 다 같은 코드로 동작. 다른 DB로 바꿀 때도 이 파일만 손대면 된다.
// ─────────────────────────────────────────────────────────────────────────────

const DB_DIR = path.join(process.cwd(), 'data')

const SCHEMA = `
CREATE TABLE IF NOT EXISTS poll (
  id                     TEXT PRIMARY KEY,
  title                  TEXT NOT NULL,
  host_name              TEXT NOT NULL,
  quorum                 INTEGER NOT NULL,
  status                 TEXT NOT NULL DEFAULT 'open',
  confirmed_poll_date_id INTEGER,
  deadline               TEXT,
  manage_token           TEXT,
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

function makeClient(): Client {
  const url = process.env.TURSO_DATABASE_URL
  if (url) {
    return createClient({ url, authToken: process.env.TURSO_AUTH_TOKEN })
  }
  // 로컬 파일 모드
  fs.mkdirSync(DB_DIR, { recursive: true })
  return createClient({ url: 'file:' + path.join(DB_DIR, 'seoreunpick.db') })
}

// dev 핫리로드/서버리스 콜드스타트마다 중복 init 되지 않게 globalThis 에 캐시한다.
const g = globalThis as unknown as {
  __seoreunpickClient?: Client
  __seoreunpickReady?: Promise<void>
}
const client: Client = g.__seoreunpickClient ?? (g.__seoreunpickClient = makeClient())

/** 스키마 생성 + (비어 있으면) 시드를 프로세스당 한 번만 보장. */
function ready(): Promise<void> {
  if (!g.__seoreunpickReady) g.__seoreunpickReady = init()
  return g.__seoreunpickReady
}
async function init(): Promise<void> {
  await client.executeMultiple(SCHEMA)
  await migrate()
  await seedIfEmpty()
}

/** 이미 만들어진(운영 Turso) 테이블에 누락 컬럼을 더한다. CREATE IF NOT EXISTS 로는 못 한다. */
async function migrate(): Promise<void> {
  await addColumnIfMissing('poll', 'deadline', 'TEXT')
  await addColumnIfMissing('poll', 'manage_token', 'TEXT')
}
async function addColumnIfMissing(table: string, column: string, type: string): Promise<void> {
  const info = await client.execute(`PRAGMA table_info(${table})`)
  const has = info.rows.some((r) => String(r.name) === column)
  if (!has) await client.execute(`ALTER TABLE ${table} ADD COLUMN ${column} ${type}`)
}

// ── 매핑 헬퍼 (snake_case 행 → 도메인 타입) ──────────────────────────────────

type Row = Record<string, unknown>

function mapPoll(row: Row): PollMeta {
  return {
    id: String(row.id),
    title: String(row.title),
    hostName: String(row.host_name),
    quorum: Number(row.quorum),
    status: String(row.status) as PollStatus,
    confirmedPollDateId: row.confirmed_poll_date_id == null ? null : Number(row.confirmed_poll_date_id),
    deadline: row.deadline == null ? null : String(row.deadline),
    createdAt: String(row.created_at),
  }
}

// ── 쓰기 ─────────────────────────────────────────────────────────────────────

export async function createPoll(input: CreatePollInput): Promise<{ id: string; manageToken: string }> {
  await ready()
  const id = input.id ?? newId()
  const manageToken = input.manageToken ?? newId(16) // 방장 전용 비밀 토큰(추측 어렵게 16자)
  const stmts: InStatement[] = [
    {
      sql: `INSERT INTO poll (id, title, host_name, quorum, status, deadline, manage_token) VALUES (?, ?, ?, ?, 'open', ?, ?)`,
      args: [id, input.title, input.hostName, input.quorum, input.deadline ?? null, manageToken],
    },
    ...input.dates.map((d) => ({
      sql: `INSERT INTO poll_date (poll_id, date) VALUES (?, ?)`,
      args: [id, d],
    })),
    ...input.members.map((m) => ({
      sql: `INSERT INTO member (poll_id, name, is_anchor) VALUES (?, ?, ?)`,
      args: [id, m.name, m.isAnchor ? 1 : 0],
    })),
  ]
  await client.batch(stmts, 'write')
  return { id, manageToken }
}

/**
 * 방장 권한 확인. 저장된 토큰과 일치해야 true.
 * 단, 토큰이 없는 레거시 방(이 기능 이전 생성)은 누구나 가능(하위호환).
 * 토큰은 절대 PollBundle/PollMeta 로 클라이언트에 노출하지 않는다.
 */
export async function verifyManage(pollId: string, token: string | null | undefined): Promise<boolean> {
  await ready()
  const res = await client.execute({ sql: `SELECT manage_token FROM poll WHERE id = ?`, args: [pollId] })
  if (res.rows.length === 0) return false
  const stored = res.rows[0].manage_token
  if (stored == null) return true // 레거시 방 = 개방
  return !!token && token === String(stored)
}

/** 방 메타(제목/정족수/마감일) 수정. 날짜·멤버는 건드리지 않는다. */
export async function updatePollMeta(pollId: string, input: UpdatePollInput): Promise<void> {
  await ready()
  await client.execute({
    sql: `UPDATE poll SET title = ?, quorum = ?, deadline = ? WHERE id = ?`,
    args: [input.title, input.quorum, input.deadline, pollId],
  })
}

/** 방 삭제. 자식 행(날짜/멤버/투표)도 함께 지운다(FK CASCADE 미보장 환경 대비 명시 삭제). */
export async function deletePoll(pollId: string): Promise<void> {
  await ready()
  await client.batch(
    [
      { sql: `DELETE FROM vote WHERE poll_id = ?`, args: [pollId] },
      { sql: `DELETE FROM poll_date WHERE poll_id = ?`, args: [pollId] },
      { sql: `DELETE FROM member WHERE poll_id = ?`, args: [pollId] },
      { sql: `DELETE FROM poll WHERE id = ?`, args: [pollId] },
    ],
    'write',
  )
}

/** 한 멤버의 날짜별 응답을 일괄 upsert. 기존 응답은 덮어쓴다. */
export async function upsertVotes(
  pollId: string,
  memberId: number,
  entries: VoteEntry[],
): Promise<void> {
  await ready()
  if (entries.length === 0) return
  const stmts: InStatement[] = entries.map((e) => ({
    sql: `INSERT INTO vote (poll_id, member_id, poll_date_id, status, updated_at)
          VALUES (?, ?, ?, ?, datetime('now'))
          ON CONFLICT(member_id, poll_date_id)
          DO UPDATE SET status = excluded.status, updated_at = excluded.updated_at`,
    args: [pollId, memberId, e.pollDateId, e.status],
  }))
  await client.batch(stmts, 'write')
}

/** 날짜 확정 / 확정 해제(null). */
export async function setConfirmedDate(pollId: string, pollDateId: number | null): Promise<void> {
  await ready()
  await client.execute({
    sql: `UPDATE poll SET status = ?, confirmed_poll_date_id = ? WHERE id = ?`,
    args: [pollDateId === null ? 'open' : 'confirmed', pollDateId, pollId],
  })
}

// ── 읽기 ─────────────────────────────────────────────────────────────────────

export async function getPollBundle(pollId: string): Promise<PollBundle | null> {
  await ready()
  const pollRes = await client.execute({ sql: `SELECT * FROM poll WHERE id = ?`, args: [pollId] })
  if (pollRes.rows.length === 0) return null

  const datesRes = await client.execute({
    sql: `SELECT id, date FROM poll_date WHERE poll_id = ? ORDER BY date ASC, id ASC`,
    args: [pollId],
  })
  const membersRes = await client.execute({
    sql: `SELECT id, name, is_anchor FROM member WHERE poll_id = ? ORDER BY id ASC`,
    args: [pollId],
  })
  const votesRes = await client.execute({
    sql: `SELECT member_id, poll_date_id, status FROM vote WHERE poll_id = ?`,
    args: [pollId],
  })

  const members: MemberRow[] = membersRes.rows.map((r) => ({
    id: Number(r.id),
    name: String(r.name),
    isAnchor: Number(r.is_anchor) === 1,
  }))
  const votes: VoteRow[] = votesRes.rows.map((r) => ({
    memberId: Number(r.member_id),
    pollDateId: Number(r.poll_date_id),
    status: String(r.status) as VoteStatus,
  }))

  const bundle: PollBundle = {
    poll: mapPoll(pollRes.rows[0] as Row),
    dates: datesRes.rows.map((r) => ({ id: Number(r.id), date: String(r.date) })),
    members,
    votes,
  }

  // 마감 자동 확정: cron 이 없으므로 읽는 시점에 게으르게(lazy) 처리한다.
  // 마감일이 지났고 아직 open 이면, 조건(앵커+정족수)을 충족한 대표 날짜로 자동 확정.
  // 충족 날짜가 없으면 확정하지 않고 open 으로 둔다(투표만 닫힘 → 방장이 직접 고름).
  if (bundle.poll.status === 'open' && isDeadlinePassed(bundle.poll.deadline)) {
    const best = analyze(bundle).best
    if (best) {
      await setConfirmedDate(pollId, best.pollDateId)
      bundle.poll = { ...bundle.poll, status: 'confirmed', confirmedPollDateId: best.pollDateId }
    }
  }

  return bundle
}

// ── 시드 ─────────────────────────────────────────────────────────────────────

async function seedIfEmpty(): Promise<void> {
  const SEED_ID = 'demo'
  // 데모 방을 OR IGNORE 로 선점 — 이미 있으면 rowsAffected=0 이라 race-safe
  const claim = await client.execute({
    sql: `INSERT OR IGNORE INTO poll (id, title, host_name, quorum, status, deadline) VALUES (?, ?, ?, ?, 'open', ?)`,
    args: [SEED_ID, '서른개 7월 정모 (윤이사님 승진 축하)', '최태석', 5, '2026-07-06'],
  })
  if (claim.rowsAffected === 0) return // 이미 시드됨

  const dateList = ['2026-07-07', '2026-07-08', '2026-07-09', '2026-07-10']
  const dateId: Record<string, number> = {}
  for (const d of dateList) {
    const r = await client.execute({
      sql: `INSERT INTO poll_date (poll_id, date) VALUES (?, ?)`,
      args: [SEED_ID, d],
    })
    dateId[d] = Number(r.lastInsertRowid)
  }

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
  const memberId: Record<string, number> = {}
  for (const m of memberList) {
    const r = await client.execute({
      sql: `INSERT INTO member (poll_id, name, is_anchor) VALUES (?, ?, ?)`,
      args: [SEED_ID, m.name, m.anchor ? 1 : 0],
    })
    memberId[m.name] = Number(r.lastInsertRowid)
  }

  // 알고리즘이 한눈에 보이도록 샘플 응답 주입 (O/X 2단계).
  //  07-08 → 🟢 확정추천 (앵커 둘 다 O, 7명)
  //  07-07 → 🟡 조건부 (정족수 5 충족이지만 앵커 이승현 X)
  //  07-09 → 🟡 조건부 (앵커 OK지만 정족수 -1, 미응답 전원 O면 도달 가능)
  //  07-10 → ⚪ 탈락
  //  라윤철, 김선우 → 전혀 응답 안 함(미응답)
  const v: Record<string, Record<string, VoteStatus>> = {
    최태석: { '2026-07-07': 'O', '2026-07-08': 'O', '2026-07-09': 'X', '2026-07-10': 'X' },
    김정욱: { '2026-07-07': 'O', '2026-07-08': 'O', '2026-07-09': 'O', '2026-07-10': 'X' },
    이승현: { '2026-07-07': 'X', '2026-07-08': 'O', '2026-07-09': 'O', '2026-07-10': 'X' },
    이풍환: { '2026-07-07': 'O', '2026-07-08': 'O', '2026-07-09': 'X', '2026-07-10': 'O' },
    류재우: { '2026-07-07': 'O', '2026-07-08': 'O', '2026-07-09': 'X', '2026-07-10': 'X' },
    윤희욱: { '2026-07-07': 'O', '2026-07-08': 'O', '2026-07-09': 'O', '2026-07-10': 'X' },
    김민석: { '2026-07-07': 'X', '2026-07-08': 'O', '2026-07-09': 'O', '2026-07-10': 'O' },
  }
  const voteStmts: InStatement[] = []
  for (const [name, perDate] of Object.entries(v)) {
    for (const [d, status] of Object.entries(perDate)) {
      voteStmts.push({
        sql: `INSERT INTO vote (poll_id, member_id, poll_date_id, status) VALUES (?, ?, ?, ?)`,
        args: [SEED_ID, memberId[name], dateId[d], status],
      })
    }
  }
  await client.batch(voteStmts, 'write')
}

/** 시드 방 id (README/홈에서 링크 노출용). */
export const DEMO_POLL_ID = 'demo'
