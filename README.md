The page is stuck on "Loading job workspace…" even though the backend completed successfully (NDA + SOW both generated, job complete). The loading spinner never stops.

The issue is that the job completed **before** the page loaded, so the polling never fires an update — and the initial load fetched the job as `complete` but is probably hanging on `fetchCanonicalBlob`.

Add this console log immediately to find where it's stuck. In `page.tsx` inside the `load` function:

```ts
const load = async () => {
  setLoading(true);
  setError(null);
  try {
    console.log('1. fetching job...');
    const result = await getJob(jobId);
    console.log('2. job result:', result.status);
    setJob(result);

    if (result.status === 'complete') {
      console.log('3. fetching canonical...');
      const c = await loadCanonical();
      console.log('4. canonical:', c);
      if (mounted) setCanonical(c);
    }
  } catch (err) {
    console.error('load error:', err);
    // ...
  } finally {
    console.log('5. setting loading false');
    if (mounted) setLoading(false);
  }
};
```

Open browser console and tell me which number it stops at. My bet is it stops at **3** — meaning `fetchCanonicalBlob` is hanging or throwing silently, and `loadCanonical` swallows the error and returns `null`, but something else is blocking `setLoading(false)`.

Also check your `next.config.js` — make sure this rewrite exists:

```js
{
  source: '/api/download/:path*',
  destination: 'http://localhost:8000/download/:path*',
}
```

Without it, `fetchCanonicalBlob` hits a 404 silently and the try/catch in `loadCanonical` catches it, returns `null`, but if there's any other await after that hanging, `setLoading(false)` in `finally` never runs. Share what the console shows.
