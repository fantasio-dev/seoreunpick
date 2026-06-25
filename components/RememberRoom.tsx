'use client'

import { useEffect } from 'react'
import { rememberRoom } from '@/lib/myRooms'

// 방장(관리 토큰 보유)이 결과 페이지를 열면 이 기기의 "내가 만든 방" 목록에 기록한다.
// 생성 직후엔 ?t= 가 붙은 결과 페이지로 리다이렉트되므로 자동으로 저장된다.
export default function RememberRoom({
  id,
  title,
  token,
}: {
  id: string
  title: string
  token: string
}) {
  useEffect(() => {
    rememberRoom({ id, title, token })
  }, [id, title, token])
  return null
}
