/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    serverActions: {
      allowedOrigins: ['localhost:3010'],
    },
  },
  output: 'standalone',
}

module.exports = nextConfig

