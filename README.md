`types.ts` and `jobs.ts` are both correct. `job_id` is properly typed, `listJobs` returns `JobsListResponse` with a `jobs` array.

The bug is in **`useJobList.ts`** — I'd bet it's doing `setJobs(res)` instead of `setJobs(res.jobs)`. Go check that file right now:

```ts
// ❌ This sets jobs to the whole response object { total, jobs: [...] }
listJobs().then(setJobs)

// ✅ This correctly unwraps the array
listJobs().then((res) => setJobs(res.jobs))
```

If that's not it, also check `hooks/useJobList.ts` for the initial state type — it needs to be an array:

```ts
// ❌ Wrong — object, not array
const [jobs, setJobs] = useState({})

// ✅ Correct
const [jobs, setJobs] = useState<JobRecord[]>([])
```

Here's the complete correct `useJobList.ts` to just replace it entirely:

```ts
import { useEffect, useState } from 'react';
import { listJobs } from '@/lib/api/jobs';
import type { JobRecord } from '@/lib/api/types';

export function useJobList() {
  const [jobs, setJobs] = useState<JobRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = async () => {
    setLoading(true);
    try {
      const res = await listJobs();
      setJobs(res.jobs);   // ← unwrap .jobs here
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load jobs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetch();
  }, []);

  return { jobs, loading, error, refresh: fetch };
}
```

Replace your current `useJobList.ts` with this and the `undefined` job_id issue on the dashboard will be gone.
