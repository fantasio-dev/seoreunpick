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
  db.ts                        ★ 모든 DB 접근 (better-sqlite3) — 교체는 여기만
  recommend.ts                 추천 알고리즘
  types.ts / date.ts / ics.ts / id.ts
data/seoreunpick.db            SQLite 파일 (gitignore)
```

## 데이터 모델

```
poll(id, title, host_name, quorum, status, confirmed_poll_date_id, created_at)
poll_date(id, poll_id, date)
member(id, poll_id, name, is_anchor)
vote(id, poll_id, member_id, poll_date_id, status['O'|'△'|'X'], updated_at)
```

> 날짜 확정 상태를 담기 위해 사양의 `poll` 에 `confirmed_poll_date_id` 컬럼 하나를 추가했습니다.

## 배포 (영속 디스크)

SQLite 파일(`data/`)을 유지하려면 **영속 디스크가 붙는** 호스팅을 쓰세요.

**Railway / Render / Fly.io 공통**

1. 빌드: `npm install && npm run build`
2. 실행: `npm run start` (기본 포트 3000, 환경변수 `PORT` 자동 인식)
3. **영속 볼륨을 `/app/data` (= 프로젝트의 `data/`)에 마운트** — 이게 없으면 재배포 때 투표가 사라집니다.
4. (선택) DB 경로를 바꾸려면 환경변수 `SEOREUNPICK_DB=/data/seoreunpick.db` 지정 후, 볼륨을 `/data` 에 마운트.

- **Fly.io**: `fly volumes create data --size 1` 후 `fly.toml` 의 `[mounts]` 에 `source="data"`, `destination="/data"`. 환경변수 `SEOREUNPICK_DB=/data/seoreunpick.db`.
- **Render**: Disk 추가(Mount Path `/data`) + 환경변수 `SEOREUNPICK_DB=/data/seoreunpick.db`.
- **Railway**: Volume 추가(Mount `/data`) + 동일 환경변수.

재시드가 필요하면:

```bash
npm run seed   # data/ 의 DB 파일 삭제 → 다음 실행 시 demo 방 재생성
```

## Vercel 등 서버리스에 올리려면 (SQLite → Turso)

Vercel/서버리스는 **로컬 디스크가 사라지므로** `better-sqlite3` 파일 DB가 맞지 않습니다.
[Turso](https://turso.tech)(libSQL, SQLite 호환)로 한 줄 교체하세요.

1. `npm i @libsql/client` 후 Turso DB 생성 → `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN` 설정
2. **교체는 `lib/db.ts` 한 파일만** — `better-sqlite3` 의 동기 `prepare/run/get/all` 호출을 `@libsql/client` 의 비동기 `execute` 로 바꾸고, 호출부(서버 액션/서버 컴포넌트)에 `await` 를 추가하면 됩니다. 스키마(`SCHEMA`)와 도메인 함수 시그니처는 그대로 유지됩니다.

> 모든 DB 접근이 `lib/db.ts` 에 모여 있어 교체 범위가 이 파일로 한정됩니다.

## 기술 스택

Next.js 14 (App Router), TypeScript, Tailwind CSS, better-sqlite3, 모바일 우선(360–430px)
