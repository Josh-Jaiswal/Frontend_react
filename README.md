# EY Contract Intelligence Frontend

Next.js App Router frontend for the FastAPI contract intelligence backend.

## Environment

Create a `.env.local` file with:

```bash
BACKEND_ORIGIN=http://localhost:8000
NEXT_PUBLIC_CONTRACT_API_KEY=GoldenEY1479
```

## Install

```bash
npm install
npm run dev
```

## Routes

- `/` — upload flow
- `/jobs` — dashboard
- `/jobs/[jobId]` — job workspace

## Backend expectations

The frontend expects these endpoints from the FastAPI service:

- `POST /analyze`
- `GET /jobs`
- `GET /jobs/{job_id}`
- `POST /jobs/{job_id}/regenerate`
- `GET /download/{job_id}/canonical`
- `GET /download/{job_id}/source`
- `GET /download/{job_id}/nda`
- `GET /download/{job_id}/sow`
