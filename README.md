Two issues visible, one in the file and one from the error.

**Problem 1 — AppShell.tsx is a `.jsx` file saved without a type declaration**

The error says `AppShell.jsx implicitly has an 'any' type`. Your file is `.jsx` but TypeScript can't find its types. Rename it to `.tsx` and replace the content with this properly typed version:

```tsx
// components/layout/AppShell.tsx
import type { ReactNode } from 'react';
import { Header } from './Header';
import { Footer } from './Footer';

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="min-h-screen bg-white text-zinc-900">
      <Header />
      <main className="mx-auto w-full max-w-7xl px-4 py-6 md:px-6 md:py-8">
        {children}
      </main>
      <Footer />
    </div>
  );
}
```

**Problem 2 — `useRouter` doesn't exist in App Router**

On line 4 of your `page.tsx` you have `import { useRouter } from ...` but in Next.js App Router, page components receive `params` directly as props — you don't need `useRouter` for reading the jobId. You already have the correct pattern on line 23 (`const { jobId } = params`), so just remove the `useRouter` import and any `useRouter()` call entirely.

Also check that `tsconfig.json` has this — it's what enables the `@/` path alias:

```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./*"]
    }
  }
}
```

After renaming `AppShell.jsx` → `AppShell.tsx` and removing `useRouter`, the red underlines should clear.
