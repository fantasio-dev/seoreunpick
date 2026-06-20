// DB를 초기화한다. 시드 방(demo)은 lib/db.ts 가 빈 DB를 만났을 때 자동 생성하므로,
// 이 스크립트는 기존 data 파일을 지워 "다음 실행 시 다시 시드되도록" 한다.
import fs from 'node:fs'
import path from 'node:path'

const dir = path.join(process.cwd(), 'data')
const files = ['seoreunpick.db', 'seoreunpick.db-shm', 'seoreunpick.db-wal']

let removed = 0
for (const f of files) {
  const p = path.join(dir, f)
  if (fs.existsSync(p)) {
    fs.rmSync(p)
    removed++
    console.log('삭제:', f)
  }
}

if (removed === 0) console.log('지울 DB 파일이 없습니다 (아직 생성 전).')
console.log('완료. 다음 `npm run dev` 시 시드 방(/poll/demo)이 다시 생성됩니다.')
