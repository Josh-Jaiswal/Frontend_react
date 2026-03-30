The polling hook is fine — it has the `!jobId` guard. The bug is somewhere else.

The `/jobs/undefined` requests are coming from `getJob` being called with `undefined`. This means `jobId` from `params` is actually `undefined` at runtime when navigating from the dashboard.

This is a Next.js App Router timing issue. In the App Router, `params` in a `'use client'` page component can be a Promise in newer Next.js versions. Add this to your `page.tsx` — share your `lib/api/jobs.ts` too but here's the fix to apply now:

**Fix `app/jobs/[jobId]/page.tsx` — top of the component:**

```ts
export default function JobPage({ params }: { params: { jobId: string } }) {
  const { jobId } = params;

  // Log it immediately to confirm
  console.log('JobPage mounted with jobId:', jobId);

  if (!jobId || jobId === 'undefined') {
    return null;
  }
  // ... rest unchanged
```

Also check your **dashboard "View" button** — this is the most likely real cause. In `components/dashboard/JobRow.tsx`, find where it navigates and confirm it's using the right field:

```ts
// ❌ Wrong — job.id might be undefined
router.push(`/jobs/${job.id}`)

// ✅ Correct — must match your API response shape
router.push(`/jobs/${job.job_id}`)
```

Your API returns `job_id` (with underscore) not `id`. If the dashboard is passing `job.id` instead of `job.job_id`, that's exactly where the `undefined` comes from — before the page even mounts. Share `JobRow.tsx` and `lib/api/jobs.ts` and I'll confirm.
