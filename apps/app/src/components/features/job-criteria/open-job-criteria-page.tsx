import { PageContainer } from '@comitium/ui/page-container';
import { SectionHeader } from '@comitium/ui/section-header';
import { useJobPermissions } from '@/hooks/use-job-permissions';
import { Permission } from '@/lib/schemas/org';
import { AutosaveNavigationGuard } from '../editor-autosave/autosave-navigation-guard';
import { AutosaveStatus } from '../editor-autosave/autosave-status';
import { DraftSectionSkeleton } from '../job-draft/draft-section-skeleton';
import { useDraftForm } from '../job-draft/use-draft-form';
import { CriteriaTab } from '.';

interface OpenJobCriteriaPageProps {
  orgId: string;
  jobId: string;
}

export function OpenJobCriteriaPage({ orgId, jobId }: OpenJobCriteriaPageProps) {
  const { draft: job, criteria, handleCriteriaChange, isLoading, error, autosave } = useDraftForm(orgId, jobId);
  const { canOnJob } = useJobPermissions(jobId);

  if (isLoading) {
    return <DraftSectionSkeleton tab="criteria" />;
  }

  if (error || !job) {
    return (
      <PageContainer size="editor" className="py-8 lg:px-10">
        <SectionHeader title="Evaluation criteria" description="Evaluation criteria could not be loaded." />
      </PageContainer>
    );
  }

  const canEdit = job.status === 'open' && canOnJob(Permission.JOB_EDIT);

  return (
    <div className="h-full overflow-y-auto" onBlurCapture={() => void autosave.flush()}>
      <AutosaveNavigationGuard autosave={autosave} />
      <PageContainer size="editor" className="py-8 lg:px-10">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <SectionHeader title="Evaluation criteria" description={null} />
          {canEdit && <AutosaveStatus autosave={autosave} />}
        </div>
        <CriteriaTab criteria={criteria} onChangeCriteria={handleCriteriaChange} readOnly={!canEdit} />
      </PageContainer>
    </div>
  );
}
