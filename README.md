The problem is a type mismatch. Your `SummarySection.tsx` expects `{ title, items: [{ key, value }] }` but the new `format.ts` returns `{ title, icon, fields: [{ label, value, path }] }`.

Two options — pick the easier one:

**Option A — fix `SummarySection.tsx` to match the new format (recommended):**

```tsx
import { Card, CardBody } from '@/components/ui/card';
import { SummaryRow } from './SummaryRow';
import type { SummarySection as SummarySectionType } from '@/lib/format';

export function SummarySection({
  sections,
}: {
  sections: SummarySectionType[];
}) {
  if (!sections || !sections.length) {
    return (
      <div className="rounded-2xl border border-dashed border-zinc-200 p-6 text-sm text-zinc-500">
        No summary data detected yet.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {sections.map((section) => (
        <Card key={section.title}>
          <CardBody>
            <h3 className="mb-3 flex items-center gap-2 font-semibold text-zinc-900">
              <span>{section.icon}</span>
              <span>{section.title}</span>
            </h3>
            {section.fields.map((field) => (
              <SummaryRow
                key={field.path}
                label={field.label}
                value={field.value}
              />
            ))}
          </CardBody>
        </Card>
      ))}
    </div>
  );
}
```

Then make sure `SummaryRow.tsx` accepts `label: string` and `value: string | string[]`:

```tsx
export function SummaryRow({
  label,
  value,
}: {
  label: string;
  value: string | string[];
}) {
  return (
    <div className="flex gap-3 border-b border-zinc-100 py-2.5 last:border-0">
      <div className="w-44 flex-shrink-0 text-xs font-mono uppercase tracking-wide text-zinc-400 pt-0.5">
        {label}
      </div>
      <div className="flex-1 text-sm text-zinc-800">
        {Array.isArray(value) ? (
          <ul className="space-y-1">
            {value.map((v, i) => (
              <li key={i} className="flex gap-2">
                <span className="text-yellow-500 mt-0.5">▸</span>
                <span>{v}</span>
              </li>
            ))}
          </ul>
        ) : (
          value
        )}
      </div>
    </div>
  );
}
```

Also remove the `cnKeyToLabel` import from `SummarySection.tsx` — it's no longer needed since labels come directly from `format.ts` now.
