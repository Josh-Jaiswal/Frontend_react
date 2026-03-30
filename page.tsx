'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import { PageHero } from '@/components/shared/PageHero';
import { AppShell } from '@/components/layout/AppShell';
import { NavTabs } from '@/components/layout/NavTabs';
import { UploadDropzone } from '@/components/upload/UploadDropzone';
import { ContractTypeSelect } from '@/components/upload/ContractTypeSelect';
import { UploadHelp } from '@/components/upload/UploadHelp';
import { Button } from '@/components/ui/button';
import { Card, CardBody } from '@/components/ui/card';
import { useUploadJob } from '@/hooks/useUploadJob';
import { useAppStore } from '@/store/useAppStore';
import type { ContractType } from '@/lib/api/types';

export default function HomePage() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [contractType, setContractType] = useState<ContractType>('auto');
  const { submit, loading } = useUploadJob();
  const setJobId = useAppStore((s) => s.setJobId);
  const canSubmit = useMemo(() => Boolean(file) && !loading, [file, loading]);

  const onSubmit = async () => {
    if (!file) return;

    try {
      const result = await submit(file, contractType);
      setJobId(result.job_id);
      toast.success('Analysis started');
      router.push(`/jobs/${result.job_id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Upload failed');
    }
  };

  return (
    <AppShell>
      <NavTabs current="home" />
      <PageHero
        eyebrow="Contract intelligence"
        title="Analyze contracts and generate NDA or SOW outputs"
        subtitle="Upload a document, run extraction, inspect conflicts, fill gaps, and regenerate polished contract outputs in a single workspace."
      />
      <div className="mt-6 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-6">
          <UploadDropzone file={file} onFile={setFile} loading={loading} />
          <Card>
            <CardBody className="grid gap-4 md:grid-cols-2">
              <ContractTypeSelect value={contractType} onChange={setContractType} />
              <div className="flex items-end justify-end">
                <Button variant="primary" onClick={() => void onSubmit()} disabled={!canSubmit}>
                  {loading ? 'Starting analysis…' : 'Start analysis'}
                </Button>
              </div>
            </CardBody>
          </Card>
        </div>

        <div className="space-y-6">
          <UploadHelp />
          <Card>
            <CardBody>
              <h3 className="text-base font-semibold text-zinc-900">What happens next</h3>
              <ol className="mt-3 space-y-3 text-sm leading-6 text-zinc-600">
                <li>1. File uploads to the backend analyzer.</li>
                <li>2. A job is created and polled automatically.</li>
                <li>3. The workspace opens with summary, conflicts, missing fields, source preview and downloads.</li>
              </ol>
            </CardBody>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
