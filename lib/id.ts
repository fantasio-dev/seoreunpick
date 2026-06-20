import { randomBytes } from 'node:crypto'

// 헷갈리는 글자(0/o, 1/l/i) 제외한 32자 알파벳 → 공유 링크가 짧고 읽기 쉽다.
const ALPHABET = '23456789abcdefghijkmnpqrstuvwxyz'

/** URL-safe 짧은 랜덤 id (기본 8자). 추측 어렵게 쓰되 링크는 짧게. */
export function newId(len = 8): string {
  const bytes = randomBytes(len)
  let out = ''
  for (let i = 0; i < len; i++) {
    out += ALPHABET[bytes[i] % ALPHABET.length]
  }
  return out
}
