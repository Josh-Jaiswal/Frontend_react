Two problems visible right now.

**Problem 1 — Request URL is `localhost:3000/undefined/analyze`**

The `undefined` in the URL means `API_BASE_PATH` is resolving to `undefined` at runtime. Look at your `env.ts` in image 2 — you have **two separate duplicate blocks** in the same file, and `API_KEY` on line 8 is reading `NEXT_PUBLIC_API_URL` instead of `NEXT_PUBLIC_API_KEY`. The file is a mess. Replace the entire `lib/env.ts` with just this:

```ts
// lib/env.ts
export const API_BASE_PATH =
  typeof window !== 'undefined'
    ? ''  // client-side: use relative URLs via Next.js rewrite
    : process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export const API_KEY =
  process.env.NEXT_PUBLIC_API_KEY || 'GoldenEY1479';
```

Delete everything else in that file. The duplicate definitions are overwriting each other.

**Problem 2 — The rewrite isn't matching**

The 404 is coming from Next.js itself (`X-Nextjs-Action-Not-Found` in the response headers), meaning the rewrite in `next.config.js` never forwarded the request to FastAPI. Make sure your `next.config.js` looks exactly like this:

```js
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
      {
        source: '/health',
        destination: 'http://localhost:8000/health',
      },
    ];
  },
};

module.exports = nextConfig;
```

**Then hard restart — this is mandatory:**

```bash
# Ctrl+C to stop, then:
rm -rf .next
npm run dev
```

The `.next` cache will hold the old broken config otherwise. The `undefined` in the URL and the 404 both disappear once `env.ts` is clean and the dev server restarts fresh.
