import type { NextConfig } from 'next'
import path from 'path'

const nextConfig: NextConfig = {
  poweredByHeader: false,
  outputFileTracingRoot: path.resolve(__dirname),
  experimental: {
    optimizePackageImports: [
      'lucide-react',
      'date-fns',
      '@headlessui/react',
      'recharts',
    ],
  },
  images: {
    remotePatterns: [
      { protocol: 'http', hostname: 'localhost', port: '8000' },
      { protocol: 'http', hostname: '127.0.0.1', port: '8000' },
      { protocol: 'https', hostname: 'localhost', port: '8000' },
      { protocol: 'https', hostname: '127.0.0.1', port: '8000' },
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'plus.unsplash.com' },
      { protocol: 'https', hostname: 'res.cloudinary.com' },
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
      { protocol: 'https', hostname: 'vanphongchothue.vn' },
      { protocol: 'https', hostname: 'www.vanphongchothue.vn' },
      { protocol: 'https', hostname: 'i1-giadinh.vnecdn.net' },
      { protocol: 'https', hostname: 'i-giadinh.vnecdn.net' },
    ],
  },
}

export default nextConfig
