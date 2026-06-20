/** @type {import('next').NextConfig} */
const nextConfig = {
  // better-sqlite3 는 네이티브 모듈이라 서버 번들에 넣지 않고 외부 require 로 둔다.
  experimental: {
    serverComponentsExternalPackages: ['better-sqlite3'],
  },
}

export default nextConfig
