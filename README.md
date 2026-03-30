Great progress! The backend is working perfectly — NDA and SOW both generated, job complete. The problem now is the **rewrite for `/jobs/:path*` is conflicting with your Next.js `/jobs/[jobId]` page route.**

When you visit `localhost:3000/jobs/8777af5b-...`, Next.js is forwarding it to FastAPI instead of rendering your React page, and FastAPI returns the 401 JSON directly to the browser.

Fix your `next.config.js` — the jobs rewrite needs a more specific prefix that doesn't collide with your page routes:

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
        source: '/api/jobs/:path*',
        destination: 'http://localhost:8000/jobs/:path*',
      },
      {
        source: '/api/download/:path*',
        destination: 'http://localhost:8000/download/:path*',
      },
      {
        source: '/api/health',
        destination: 'http://localhost:8000/health',
      },
    ];
  },
};

module.exports = nextConfig;
```

Then update `lib/api/jobs.ts` — all job/download calls need the `/api/` prefix now:

```ts
// Change these path prefixes:
getJob(id)        → '/api/jobs/' + id
listJobs()        → '/api/jobs'
downloadNda(id)   → '/api/download/' + id + '/nda'
downloadSow(id)   → '/api/download/' + id + '/sow'
getCanonical(id)  → '/api/download/' + id + '/canonical'
regenerate(id)    → '/api/jobs/' + id + '/regenerate'
// /analyze stays as-is (no conflict with pages)
```

Restart cleanly:
```bash
rm -rf .next && npm run dev
```

`localhost:3000/jobs/8777af5b-...` will now render your React workspace page, and API calls go through `/api/jobs/...` to FastAPI.
