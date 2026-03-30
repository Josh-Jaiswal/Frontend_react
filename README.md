In app/jobs/[jobId]/page.tsx, make sure you're reading from params, not the store:
// ✅ correct — read from URL params
export default function JobPage({ params }: { params: { jobId: string } }) {
  const { jobId } = params;
  // use jobId directly for all API calls
}
Not like this:
// ❌ wrong — store is empty on direct navigation
const jobId = useAppStore((s) => s.jobId);
