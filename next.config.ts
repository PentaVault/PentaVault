import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  images: {
    remotePatterns: [],
    dangerouslyAllowSVG: false,
  },
  env: {},
  async redirects() {
    return [
      {
        source: '/dashboard/projects',
        destination: '/projects',
        permanent: false,
      },
      {
        source: '/dashboard/projects/:path*',
        destination: '/projects/:path*',
        permanent: false,
      },
      {
        source: '/dashboard/org/:orgId/projects',
        destination: '/projects',
        permanent: false,
      },
      {
        source: '/dashboard/org/:orgId/projects/:path*',
        destination: '/projects/:path*',
        permanent: false,
      },
      {
        source: '/projects/:projectId/usage',
        destination: '/projects/:projectId/observability',
        permanent: false,
      },
      {
        source: '/projects/:projectId/analytics',
        destination: '/projects/:projectId/observability',
        permanent: false,
      },
    ]
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-DNS-Prefetch-Control', value: 'on' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        ],
      },
    ]
  },
}

export default nextConfig
