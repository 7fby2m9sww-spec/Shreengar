import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'zhjbsccyugzjinarprcw.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin',
          },
        ],
      },
    ]
  },
  async redirects() {
    return [
      {
        source: '/admin/inventory',
        has: [
          {
            type: 'query',
            key: 'filter',
            value: 'low_stock',
          },
        ],
        destination: '/admin/products?stock=low',
        permanent: true,
      },
      {
        source: '/admin/inventory',
        has: [
          {
            type: 'query',
            key: 'filter',
            value: 'out_of_stock',
          },
        ],
        destination: '/admin/products?stock=out',
        permanent: true,
      },
      {
        source: '/admin/inventory',
        destination: '/admin/products',
        permanent: true,
      },
      {
        source: '/admin/inventory/low-stock',
        destination: '/admin/products?stock=low',
        permanent: true,
      },
      {
        source: '/admin/inventory/out-of-stock',
        destination: '/admin/products?stock=out',
        permanent: true,
      },
    ]
  },
}

export default nextConfig
