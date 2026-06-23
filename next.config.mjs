/** @type {import('next').NextConfig} */
const nextConfig = {
  // @libsql/client 는 로컬 파일 모드에서 네이티브 바인딩을 쓰므로 서버 번들에 넣지 않는다.
  experimental: {
    serverComponentsExternalPackages: ['@libsql/client', 'libsql'],
    // 터널/배포 도메인에서 서버 액션(투표/방생성)이 막히지 않게 허용
    serverActions: {
      allowedOrigins: ['*.trycloudflare.com', '*.ngrok-free.app', '*.vercel.app'],
    },
  },
}

export default nextConfig
