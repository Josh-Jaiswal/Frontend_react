Add this to next.config.js:
/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        source: '/analyze',
        destination: 'http://localhost:8000/analyze',
      },
      {
        source: '/jobs/:path*',
        destination: 'http://localhost:8000/jobs/:path*',
      },
      {
        source: '/download/:path*',
        destination: 'http://localhost:8000/download/:path*',
      },
    ];
  },
};

module.exports = nextConfig;
Then in lib/api/client.ts, change the base path so it uses relative URLs (letting the rewrite handle routing):
// lib/env.ts — change API_URL for client-side calls
export const API_URL =
  typeof window !== 'undefined'
    ? ''           // ← relative URL, rewrite handles it
    : process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
