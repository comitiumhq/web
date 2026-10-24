import { Form } from '@comitium/ui/form';
import { PageContainer } from '@comitium/ui/page-container';
import { SectionHeader } from '@comitium/ui/section-header';
import type { MyOrg } from '@/hooks/queries/use-query-my-orgs';
import { useJobPermissions } from '@/hooks/use-job-permissions';
import { Permission } from '@/lib/schemas/org';
import { AutosaveNavigationGuard } from '../editor-autosave/autosave-navigation-guard';
import { AutosaveStatus } from '../editor-autosave/autosave-status';
import { DraftSectionSkeleton } from '../job-draft/draft-section-skeleton';
import { useDraftForm } from '../job-draft/use-draft-form';
import { JobHiringTeam } from '../job-hiring-team';
import { JobBasicSettingsCard } from './job-basic-settings-card';
import { type JobSettingsTab, JobSettingsTabs } from './job-settings-tabs';

interface OpenJobSettingsPageProps {
  org: MyOrg;
  jobId: string;
  initialTab?: JobSettingsTab;
}

export function OpenJobSettingsPage({ org, jobId, initialTab }: OpenJobSettingsPageProps) {
  const { draft: job, form, isLoading, error, autosave } = useDraftForm(org.id, jobId);
  const { canOnJob } = useJobPermissions(jobId);

  if (isLoading) {
    return <DraftSectionSkeleton tab="settings" />;
  }

  if (error || !job) {
    return (
      <PageContainer size="editor" className="py-8 lg:px-10">
        <SectionHeader title="Settings" description="Job settings could not be loaded." />
      </PageContainer>
    );
  }

  const canEdit = job.status === 'open' && canOnJob(Permission.JOB_EDIT);

  return (
    <div className="h-full overflow-y-auto" onBlurCapture={() => void autosave.flush()}>
      <AutosaveNavigationGuard autosave={autosave} />
      <PageContainer size="editor" className="py-8 lg:px-10">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <SectionHeader title="Settings" description={null} />
          {canEdit && <AutosaveStatus autosave={autosave} />}
        </div>
        <Form {...form}>
          <JobSettingsTabs
            initialTab={initialTab}
            basic={<JobBasicSettingsCard orgId={org.id} form={form} readOnly={!canEdit} />}
            hiringTeam={<JobHiringTeam org={org} jobId={jobId} />}
          />
        </Form>
      </PageContainer>
    </div>
  );
}
