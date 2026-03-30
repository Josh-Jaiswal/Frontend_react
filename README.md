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
- `GET /download/{job_id}/sow'

contract-intelligence-frontend/
│
├── app/                                # Next.js App Router
│   ├── layout.tsx                      # Root layout (AppShell wrapper)
│   ├── page.tsx                        # "/" → Upload page
│   ├── globals.css                     # Global + Tailwind styles
│   ├── providers.tsx                   # Zustand + global providers
│   ├── loading.tsx                     # Global loading UI
│   ├── not-found.tsx                   # 404 fallback
│
│   ├── jobs/
│   │   ├── page.tsx                    # "/jobs" → Dashboard
│   │   └── [jobId]/                    # Dynamic job workspace
│   │       ├── page.tsx                # Job page (main workspace)
│   │       ├── loading.tsx             # Loading state
│   │       └── error.tsx               # Error boundary
│
├── components/
│
│   ├── layout/                         # App shell
│   │   ├── AppShell.tsx
│   │   ├── Header.tsx
│   │   ├── NavTabs.tsx
│   │   └── Footer.tsx
│
│   ├── upload/                         # Upload flow
│   │   ├── UploadDropzone.tsx
│   │   ├── ContractTypeSelect.tsx
│   │   └── UploadHelp.tsx
│
│   ├── dashboard/                      # /jobs page
│   │   ├── MetricsPanel.tsx
│   │   ├── JobList.tsx
│   │   ├── JobRow.tsx
│   │   └── EmptyDashboard.tsx
│
│   ├── jobs/                           # Job status + controls
│   │   ├── JobTimeline.tsx
│   │   ├── JobStatusBadge.tsx
│   │   ├── JobProgress.tsx
│   │   └── JobActions.tsx
│
│   ├── viewer/                         # Main workspace
│   │   ├── ContractViewer.tsx          # Tab orchestrator
│   │   ├── PreviewPane.tsx
│   │   ├── PdfPreview.tsx
│   │   ├── AudioPreview.tsx
│   │   ├── SourcePreview.tsx
│   │   └── JsonViewer.tsx
│
│   ├── summary/                        # Summary tab
│   │   ├── SummarySection.tsx
│   │   ├── SummaryRow.tsx
│   │   ├── MetricCard.tsx
│   │   └── EmptyState.tsx
│
│   ├── conflicts/                      # Conflict resolution
│   │   ├── ConflictList.tsx
│   │   ├── ConflictCard.tsx
│   │   └── ConflictResolver.tsx
│
│   ├── missing/                        # Missing fields (separate domain)
│   │   ├── MissingFieldTree.tsx
│   │   ├── MissingFieldCard.tsx
│   │   └── MissingFieldEditor.tsx
│
│   ├── ui/                             # Design system
│   │   ├── Button.tsx
│   │   ├── Card.tsx
│   │   ├── Input.tsx
│   │   ├── Select.tsx
│   │   ├── Tabs.tsx
│   │   ├── Tooltip.tsx
│   │   ├── Badge.tsx
│   │   ├── Skeleton.tsx
│   │   └── Toast.tsx
│
│   └── shared/                         # Reusable UI blocks
│       ├── PageHero.tsx
│       ├── SectionHeading.tsx
│       ├── ErrorState.tsx
│       └── LoadingOverlay.tsx
│
├── hooks/                              # Business logic layer
│   ├── useUploadJob.ts
│   ├── useJobPolling.ts
│   ├── useJobList.ts
│   ├── useRegenerateJob.ts
│   └── useDownloadUrls.ts
│
├── lib/
│   ├── api/                            # Backend communication
│   │   ├── client.ts                   # fetch wrapper
│   │   ├── jobs.ts                     # API functions
│   │   └── types.ts                    # Shared types
│   │
│   ├── constants.ts
│   ├── env.ts
│   ├── format.ts
│   └── utils.ts
│
├── store/                              # Global state (Zustand)
│   └── useAppStore.ts
│
├── styles/
│   └── theme.css                       # EY design tokens
│
├── public/                             # Static assets
│   ├── logo/
│   └── icons/
│
├── tailwind.config.ts
├── postcss.config.js
├── next.config.js
├── tsconfig.json
├── package.json
└── README.md
