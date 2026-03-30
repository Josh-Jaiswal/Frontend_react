Good progress — the routing is now working (200 responses, correct job ID in the URL, no more `undefined`). The page is blank because `ContractViewer` is rendering nothing.

The page is loading but the content isn't showing. I need to see these files to fix it:

- `components/viewer/ContractViewer.tsx`
- `components/shared/LoadingOverlay.tsx`

But based on what I can see, the most likely cause is that `fetchCanonicalBlob` returns a `Blob` but your page is passing it directly to `ContractViewer` as `canonical` — which expects a `CanonicalDocument` (parsed JSON object), not a raw Blob.

Fix this in `page.tsx` — change how you parse the canonical data:

```ts
// ❌ Current — passing raw Blob
const c = await fetchCanonicalBlob(jobId);
setCanonical(c);

// ✅ Fix — parse Blob to JSON first
const blob = await fetchCanonicalBlob(jobId);
const text = await blob.text();
const c = JSON.parse(text) as CanonicalDocument;
setCanonical(c);
```

Apply that change in **both** places in your `page.tsx` where `fetchCanonicalBlob` is called — the initial load `useEffect` and the `handlePollingUpdate` callback.

Also add a quick debug line temporarily to confirm data is arriving:

```ts
console.log('canonical loaded:', c);
console.log('job:', job);
```

Check the browser console — if you see the data there, the issue is purely in `ContractViewer` not rendering it. Share `ContractViewer.tsx` and I'll fix that next.
