/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  experimental: {
    serverActions: {
      allowedOrigins: ['localhost:3010'],
    },
  },
  output: 'standalone',
}

module.exports = nextConfig

