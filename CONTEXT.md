# 서른픽 — 작업 컨텍스트 (핸드오프)

> 친구 모임 일정 투표 웹앱. 카톡 투표의 한계(① 미응답자 추적 ② 필수 참석자 조건 ③ 과반 자동 판단)를 해결.
> **핵심 차별점 = 필수 참석자(앵커) 조건 + 정족수 기반 자동 추천.** 나머지는 거들 뿐.

## 배포/리소스
- **로컬**: `~/woowa/dev/seoreunpick` (개인 영역. 회사 영역 `~/woowa/src` 아님)
- **GitHub**: `git@github.com:fantasio-dev/seoreunpick.git` (SSH, 계정 `fantasio-dev`, Public, 브랜치 `main`)
- **라이브**: https://seoreunpick.vercel.app — **`main` 에 push 하면 Vercel 자동 재배포** (~30초)
- **DB(운영)**: Turso(libSQL). Vercel 환경변수 `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN` 에 설정돼 있음
- **DB(로컬)**: 환경변수 없으면 자동으로 `data/seoreunpick.db` 파일 모드 (gitignore). 첫 실행 시 demo 방 자동 시드

## 스택
Next.js 14.2.35 (App Router) · TypeScript · Tailwind CSS · @libsql/client · 모바일 우선(360–430px) · Node 25(로컬)

## 폴더 구조 / 핵심 파일
```
app/
  layout.tsx                      메타데이터(openGraph/twitter), Pretendard CDN, 컨테이너
  page.tsx                        홈(방 만들기)
  poll/[id]/page.tsx              투표 (generateMetadata 있음)
  poll/[id]/result/page.tsx       결과 (generateMetadata, Hero/OtherRow 내부 컴포넌트)
  poll/[id]/opengraph-image.tsx   방별 동적 OG (모임명+현황 카드)
  poll/[id]/result/opengraph-image.tsx  부모 OG 재export (결과 링크용)
  opengraph-image.tsx             브랜드 OG
  icon.svg                        파비콘(블루 체크)
  api/poll/[id]/ics/route.ts      .ics 캘린더 내보내기
  actions.ts                      서버 액션: createPollAction / submitVoteAction / confirmDateAction
components/                       CreateRoom, Calendar, VoteBoard, ShareBar, ConfirmButton, CopyLine
lib/
  db.ts          ★ 모든 DB 접근 (@libsql/client, async). DB 교체는 여기만
  recommend.ts   ★ 추천 알고리즘 (순수 함수, DB 모름)
  types.ts  date.ts  ics.ts  id.ts  og-font.ts(OG용 한글 폰트 CDN fetch)
```

## 데이터 모델
```
poll(id, title, host_name, quorum, status['open'|'confirmed'], confirmed_poll_date_id, deadline 'YYYY-MM-DD'|null, created_at)
poll_date(id, poll_id, date 'YYYY-MM-DD')
member(id, poll_id, name, is_anchor 0|1)
vote(member_id, poll_date_id, status['O'|'X'], ...)   UNIQUE(member_id, poll_date_id)
```
- `confirmed_poll_date_id` 는 사양에 없던 추가 컬럼(날짜 확정 상태 저장용).
- `deadline` 은 선택(없으면 무기한). 마감 지나면 ① 추가 투표 차단 ② green 날짜 자동 확정. 기존 Turso 테이블은 `db.ts migrate()` 가 `ALTER TABLE ... ADD COLUMN` 으로 보강.

## 추천 알고리즘 (lib/recommend.ts `analyze`)
각 날짜: `available = O 찍은 사람`, `anchorsOk = 모든 앵커가 O`, `count`, `quorumOk = count>=정족수`.
- 🟢 green = anchorsOk && quorumOk (그 중 count 최다 = 대표 추천)
- 🟡 yellow = 한 조건만 충족 (사유: "필수 참석자 미충족 (이승현 X)", "정족수 −N명")
- ⚪ gray = 둘 다 미충족
- 보너스: 미응답자 전원 O 시 green 도달 가능하면 표시(`canBecomeGreen`)

## 주요 결정 / 컨벤션 (꼭 지킬 것)
- **투표는 O/X 2단계** (△ '애매' 제거됨). `VoteStatus = 'O' | 'X'`
- **정족수 기본 = 과반 자동**(숨김, "바꾸기"로 펼침). 방장 이름 필드 없음(첫 멤버가 방장)
- **디자인 = 토스/당근 톤**. 토큰은 `tailwind.config.ts`: `brand`(#3182F6), `ink`/`line`/`surface`/`ok`(초록 가능)/`maybe`(노랑)/`no`(회색). 폰트 Pretendard
- **가운뎃점 ' · ' 쓰지 말 것 → 콤마 ','** (사용자 강한 선호)
- **최대한 미니멀**, 한국어 UI, 추측성 기능 추가 금지(요청한 것만)
- DB 함수는 전부 **async** (libSQL). 서버컴포넌트/액션에서 `await`

## 함정 (Gotchas)
- **OG 한글 폰트**: satori는 폰트 없으면 한글이 깨짐(□□□). `lib/og-font.ts` 가 Pretendard-Bold.otf 를 **CDN 절대 URL로 fetch**(로컬 file:// fetch는 Node가 막음). OG에 **이모지 넣지 말 것**(satori 미렌더). 결과 세그먼트는 부모 OG 자동 상속 안 됨 → `result/opengraph-image.tsx` 재export로 해결
- **카톡 OG 캐시**: 전에 공유한 링크는 미리보기가 안 바뀜. 새 링크/`?v=1` 로 우회
- **회사망 TLS 검사(MITM)**: 사내 네트워크에선 ngrok 실패(cert), cloudflared(QUIC)는 됨. Turso/Vercel CLI도 막힐 수 있어 **브라우저 대시보드 권장**
- **Node 25 + libSQL**: 로컬 파일 모드 정상 동작 확인됨

## 지금까지 완료
MVP → 토스 디자인 전면개편 → 미니멀(O/X, 결과 추천중심) → libSQL(Turso 대비) → Vercel 배포 → OG 이미지/메타 + 카톡 복붙 문구(킥) + 사유 칩 + 결과 OG fix. **전부 라이브 + 검증 완료.**

## 다음 후보 (TODO)
- [x] **마감일 + 자동 확정** — 방 생성 시 마감일(선택). 마감 지나면 투표 차단 + green(앵커+정족수 충족) 날짜 자동 확정(없으면 방장이 직접). 결과에 D-day, 미응답 독촉 문구 버튼. 자동 확정은 cron 없이 `db.ts getPollBundle` 읽는 시점 lazy 처리(KST 기준). 마감 판정 헬퍼는 `lib/date.ts`(`todayKstYmd`/`isDeadlinePassed`/`deadlineLabel`).
- [ ] **카카오 공유 SDK** (복사 대신 진짜 카톡 리치 카드 전송)
- [ ] **카카오 로그인** (본인확인 → 이름 고르기 제거)
- [ ] 방 수정/삭제, 방장만 확정(권한)
- [ ] 미응답자 콕 독촉 멘트 버튼, 확정 시 축하 연출

## 로컬 실행
```bash
npm install && npm run dev     # 환경변수 없이 = 로컬 파일 DB, demo 방 자동 시드
npm run seed                   # data/ DB 삭제 → 다음 실행 시 재시드
npm run build                  # 배포 전 검증
```
> 비밀값(Turso 토큰 등)은 절대 코드/깃에 넣지 말 것. 운영 env 는 Vercel 대시보드에만.
