# 서른픽 🗓️

친구 모임 일정 투표 웹앱. 카카오톡 투표의 한계를 해결합니다.

- ❌ **미응답자 추적 불가** → ✅ 누가 아직 안 했는지 한눈에
- ❌ **필수 참석자 조건 불가** → ✅ 앵커(꼭 와야 할 사람)가 가능한 날만 추천
- ❌ **과반 판단 수동** → ✅ 정족수 충족 여부 자동 계산

링크 하나로 모임 날짜를 정합니다. 로그인 없이 공유 링크 + 이름 선택 방식.

## 빠른 시작

```bash
npm install
npm run dev
```

→ http://localhost:3000

설치 직후 **샘플 방이 자동 생성**됩니다. 바로 확인:

- 투표: http://localhost:3000/poll/demo
- 결과: http://localhost:3000/poll/demo/result

## 사용 흐름

1. **방 만들기(방장)** — `/` 에서 모임명, 후보 날짜(달력 다중 선택), 멤버 이름, 필수 참석자(⭐ 앵커), 정족수(기본=과반)를 입력 → 공유/결과 링크 생성
2. **투표(멤버)** — 링크를 열고 본인 이름 선택 → 날짜별 **O(가능) / △(애매) / X(불가)** → 제출(언제든 수정 가능)
3. **결과(전원)** — 추천 배너 + 후보 날짜 카드 + 사람×날짜 그리드 + 미응답자 목록 + 날짜 확정 + `.ics` 캘린더 저장 + 링크 공유

## 추천 알고리즘 (핵심 차별점)

각 후보 날짜마다:

```
available = O 찍은 사람들
anchorsOk = 모든 앵커가 available 에 포함? (앵커는 O만 인정, △/X/미응답은 불충족)
count     = available 수
quorumOk  = count >= 정족수
```

랭킹은 `anchorsOk=true` 우선 → `count` 내림차순.

| 표시 | 조건 |
| --- | --- |
| 🟢 확정 추천 | `anchorsOk && quorumOk` (그 중 count 최다가 대표) |
| 🟡 조건부 | 한 조건만 충족 — 무엇이 빠졌는지 명시 (예: "이승현 X", "정족수 −1명") |
| ⚪ 탈락 | 둘 다 미충족 |

**보너스 시나리오**: 미응답자가 전원 O 하면 🟢 가 될 수 있는 날짜를 따로 표시합니다.

로직 전체는 [`lib/recommend.ts`](lib/recommend.ts) 한 파일에 있습니다.

## 폴더 구조

```
app/
  page.tsx                     방 만들기(홈)
  poll/[id]/page.tsx           투표
  poll/[id]/result/page.tsx    결과
  api/poll/[id]/ics/route.ts   .ics 캘린더 내보내기
  actions.ts                   서버 액션(방 생성/투표/확정)
components/                     Calendar, CreateRoom, VoteBoard, ShareBar, ConfirmButton
lib/
  db.ts                        ★ 모든 DB 접근 (@libsql/client) — 교체는 여기만
  recommend.ts                 추천 알고리즘
  types.ts / date.ts / ics.ts / id.ts
data/seoreunpick.db            로컬 SQLite 파일 (gitignore)
```

## 데이터 모델

```
poll(id, title, host_name, quorum, status, confirmed_poll_date_id, created_at)
poll_date(id, poll_id, date)
member(id, poll_id, name, is_anchor)
vote(id, poll_id, member_id, poll_date_id, status['O'|'X'], updated_at)
```

> 날짜 확정 상태를 담기 위해 사양의 `poll` 에 `confirmed_poll_date_id` 컬럼 하나를 추가했습니다.

## DB — 로컬 파일 / 운영 Turso (코드 동일)

DB는 [`@libsql/client`](https://github.com/tursodatabase/libsql-client-ts) 하나로 두 모드를 같은 코드로 씁니다.

- **로컬**: 환경변수 없음 → `data/seoreunpick.db` 파일에 저장. `npm run dev` 하면 끝.
- **운영**: `TURSO_DATABASE_URL`(+ `TURSO_AUTH_TOKEN`) 가 있으면 자동으로 [Turso](https://turso.tech)(libSQL, SQLite 호환)에 연결.

전환은 환경변수만 주면 되고, 코드 변경은 없습니다. 모든 접근은 [`lib/db.ts`](lib/db.ts) 한 파일에 모여 있습니다.

```bash
npm run seed   # 로컬 data/ DB 삭제 → 다음 실행 시 demo 방 재시드
```

## 배포 (Vercel + Turso, 무료)

서버리스(Vercel)는 로컬 디스크가 없으므로 DB는 Turso를 씁니다.

1. **Turso DB 생성** ([app.turso.tech](https://app.turso.tech) 또는 `turso db create seoreunpick`)
   → `Database URL`(`libsql://...`)과 `Auth Token` 확보.
2. **GitHub 에 push** 후 Vercel 에서 그 레포를 Import.
3. Vercel 프로젝트 **Environment Variables** 에 추가:
   - `TURSO_DATABASE_URL = libsql://<your-db>.turso.io`
   - `TURSO_AUTH_TOKEN = <token>`
4. Deploy. 첫 접속 시 스키마 생성 + demo 방 시드가 자동 실행됩니다.

> 영속 디스크가 붙는 곳(Railway/Fly.io)에 올리려면 환경변수 없이 그대로 두고 볼륨을 `data/` 에 마운트해도 됩니다(파일 모드).

## 기술 스택

Next.js 14 (App Router), TypeScript, Tailwind CSS, libSQL(@libsql/client), 모바일 우선(360–430px)
