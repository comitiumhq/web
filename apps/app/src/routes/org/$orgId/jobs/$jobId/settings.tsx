import { Form } from '@comitium/ui/form';
import { createFileRoute } from '@tanstack/react-router';
import { useJobDetailRouteOrg } from '@/components/features/job-detail/job-detail-route-context';
import { useOptionalDraftFormContext } from '@/components/features/job-draft/draft-form-context';
import { DraftSectionFrame } from '@/components/features/job-draft/draft-section-frame';
import { JobSettingsEditor } from '@/components/features/job-draft/job-settings-editor';
import { OpenJobSettingsPage } from '@/components/features/job-settings/open-job-settings-page';

export const Route = createFileRoute('/org/$orgId/jobs/$jobId/settings')({
  ssr: false,
  component: JobSettingsPage,
});

function JobSettingsPage() {
  const { jobId } = Route.useParams();
  const org = useJobDetailRouteOrg();
  const draftForm = useOptionalDraftFormContext();

  if (!draftForm) {
    return <OpenJobSettingsPage org={org} jobId={jobId} />;
  }

  return (
    <DraftSectionFrame tab="settings">
      <Form {...draftForm.form}>
        <JobSettingsEditor
          orgId={draftForm.orgId}
          form={draftForm.form}
          hiringTeam={draftForm.hiringTeam}
          onChangeHiringTeam={draftForm.handleHiringTeamChange}
          editableStructure={!draftForm.draft?.departmentId || !draftForm.draft?.locationId}
        />
      </Form>
    </DraftSectionFrame>
  );
}
