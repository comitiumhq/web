import type { EvaluationCriterion } from '@comitium/schemas/jobs';
import { Button } from '@comitium/ui/button';
import { PageContainer } from '@comitium/ui/page-container';
import { SectionHeader } from '@comitium/ui/section-header';
import { Spinner } from '@comitium/ui/spinner';
import { useCallback, useEffect, useState } from 'react';
import { useSaveJobEditor } from '@/components/features/job-settings/use-save-job-editor';
import { useQueryJobEditor } from '@/hooks/queries/use-query-job-editor';
import { useJobPermissions } from '@/hooks/use-job-permissions';
import { Permission } from '@/lib/schemas/org';
import { DraftSectionSkeleton } from '../job-draft/draft-section-skeleton';
import { CriteriaTab } from '.';
import { prepareEvaluationCriteria } from './utils';

interface OpenJobCriteriaPageProps {
  orgId: string;
  jobId: string;
}

export function OpenJobCriteriaPage({ orgId, jobId }: OpenJobCriteriaPageProps) {
  const { data: job, isLoading, isError } = useQueryJobEditor(orgId, jobId);
  const { mutateAsync: saveCriteria, isPending } = useSaveJobEditor(orgId, jobId);
  const { canOnJob } = useJobPermissions(jobId);
  const [criteria, setCriteria] = useState<EvaluationCriterion[]>([]);
  const [version, setVersion] = useState<number | null>(null);
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    if (!job) {
      return;
    }

    setCriteria(job.criteria ?? []);
    setVersion(job.version);
    setIsDirty(false);
  }, [job]);

  const handleCriteriaChange = useCallback((nextCriteria: EvaluationCriterion[]) => {
    setCriteria(nextCriteria);
    setIsDirty(true);
  }, []);

  const handleSave = useCallback(async () => {
    if (version === null) {
      return;
    }

    const preparedCriteria = prepareEvaluationCriteria(criteria);

    try {
      const result = await saveCriteria({
        expectedVersion: version,
        criteria: preparedCriteria.length > 0 ? preparedCriteria : null,
      });

      setCriteria(preparedCriteria);
      setVersion(result.version);
      setIsDirty(false);
    } catch {
      // The mutation owns user-facing errors.
    }
  }, [criteria, saveCriteria, version]);

  if (isLoading) {
    return <DraftSectionSkeleton tab="criteria" />;
  }

  if (isError || !job) {
    return (
      <PageContainer size="editor" className="py-8 lg:px-10">
        <SectionHeader title="Evaluation criteria" description="Evaluation criteria could not be loaded." />
      </PageContainer>
    );
  }

  const canEdit = job.status === 'open' && canOnJob(Permission.JOB_EDIT);

  return (
    <div className="h-full overflow-y-auto">
      <PageContainer size="editor" className="py-8 lg:px-10">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <SectionHeader title="Evaluation criteria" description={null} />
          {canEdit ? (
            <Button onClick={handleSave} disabled={!isDirty || isPending}>
              {isPending ? <Spinner data-icon="inline-start" /> : null}
              {isPending ? 'Saving...' : 'Save changes'}
            </Button>
          ) : null}
        </div>

        <CriteriaTab criteria={criteria} onChangeCriteria={handleCriteriaChange} readOnly={!canEdit || isPending} />
      </PageContainer>
    </div>
  );
}
