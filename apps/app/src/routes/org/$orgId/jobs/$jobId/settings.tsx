import { Form } from '@comitium/ui/form';
import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';
import { useJobDetailRouteOrg } from '@/components/features/job-detail/job-detail-route-context';
import { useOptionalDraftFormContext } from '@/components/features/job-draft/draft-form-context';
import { DraftSectionFrame } from '@/components/features/job-draft/draft-section-frame';
import { JobSettingsEditor } from '@/components/features/job-draft/job-settings-editor';
import { OpenJobSettingsPage } from '@/components/features/job-settings/open-job-settings-page';

const searchSchema = z.object({
  tab: z.enum(['basic', 'hiring-team']).optional().catch('basic'),
});

export const Route = createFileRoute('/org/$orgId/jobs/$jobId/settings')({
  ssr: false,
  validateSearch: (search) => searchSchema.parse(search),
  component: JobSettingsPage,
});

function JobSettingsPage() {
  const { jobId } = Route.useParams();
  const { tab } = Route.useSearch();
  const org = useJobDetailRouteOrg();
  const draftForm = useOptionalDraftFormContext();

  if (!draftForm) {
    return <OpenJobSettingsPage org={org} jobId={jobId} initialTab={tab} />;
  }

  return (
    <DraftSectionFrame tab="settings">
      <Form {...draftForm.form}>
        <JobSettingsEditor
          orgId={draftForm.orgId}
          form={draftForm.form}
          hiringTeam={draftForm.hiringTeam}
          onChangeHiringTeam={draftForm.handleHiringTeamChange}
          initialTab={tab}
        />
      </Form>
    </DraftSectionFrame>
  );
}
