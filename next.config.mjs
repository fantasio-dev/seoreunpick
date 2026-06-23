/** @type {import('next').NextConfig} */
const nextConfig = {
  // better-sqlite3 는 네이티브 모듈이라 서버 번들에 넣지 않고 외부 require 로 둔다.
  experimental: {
    serverComponentsExternalPackages: ['better-sqlite3'],
    // 터널(ngrok/cloudflared) 도메인에서 서버 액션(투표/방생성)이 막히지 않게 허용
    serverActions: {
      allowedOrigins: ['*.ngrok-free.app', '*.ngrok.io', '*.trycloudflare.com'],
    },
  },
}

export default nextConfig
