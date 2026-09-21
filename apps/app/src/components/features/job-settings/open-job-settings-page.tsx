import { Button } from '@comitium/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@comitium/ui/card';
import { Form } from '@comitium/ui/form';
import { PageContainer } from '@comitium/ui/page-container';
import { SectionHeader } from '@comitium/ui/section-header';
import { Spinner } from '@comitium/ui/spinner';
import { zodResolver } from '@hookform/resolvers/zod';
import { useCallback, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { DraftDetailsTab } from '@/components/features/job-draft/draft-details-tab';
import { draftToEditorState, prepareJobSettingsUpdate } from '@/components/features/job-draft/draft-editor-state';
import { DetailsSkeleton } from '@/components/features/job-draft/draft-section-skeleton';
import { useSaveDraft } from '@/components/features/job-draft/use-save-draft';
import { JobHiringTeam } from '@/components/features/job-hiring-team';
import { useQueryDraft } from '@/hooks/queries/use-query-drafts';
import type { MyOrg } from '@/hooks/queries/use-query-my-orgs';
import { useJobPermissions } from '@/hooks/use-job-permissions';
import { type DraftFormData, DraftFormSchema } from '@/lib/schemas/draft-form';
import { Permission } from '@/lib/schemas/org';

interface OpenJobSettingsPageProps {
  org: MyOrg;
  jobId: string;
}

export function OpenJobSettingsPage({ org, jobId }: OpenJobSettingsPageProps) {
  const { data: job, isLoading, isError } = useQueryDraft(org.id, jobId);
  const { mutateAsync: saveSettings, isPending } = useSaveDraft(org.id, jobId);
  const { canOnJob } = useJobPermissions(jobId);
  const [version, setVersion] = useState<number | null>(null);
  const form = useForm<DraftFormData>({
    resolver: zodResolver(DraftFormSchema),
    defaultValues: { title: '' },
  });

  useEffect(() => {
    if (!job) {
      return;
    }

    form.reset(draftToEditorState(job).values);
    setVersion(job.version);
  }, [form, job]);

  const handleSave = useCallback(async () => {
    if (version === null || !(await form.trigger())) {
      return;
    }

    const values = form.getValues();
    try {
      const result = await saveSettings(prepareJobSettingsUpdate(values, version));

      setVersion(result.version);
      form.reset({ ...values, title: values.title.trim() });
    } catch {
      return;
    }
  }, [form, saveSettings, version]);

  if (isLoading) {
    return (
      <PageContainer size="editor" className="py-8 lg:px-10">
        <SectionHeader title="Settings" description="Configure the role and the people responsible for hiring." />
        <DetailsSkeleton />
      </PageContainer>
    );
  }

  if (isError || !job) {
    return (
      <PageContainer size="editor" className="py-8 lg:px-10">
        <SectionHeader title="Settings" description="Job settings could not be loaded." />
      </PageContainer>
    );
  }

  const canEdit = canOnJob(Permission.JOB_EDIT);

  return (
    <div className="h-full overflow-y-auto">
      <PageContainer size="editor" className="space-y-6 py-8 lg:px-10">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <SectionHeader title="Settings" description="Configure the role and the people responsible for hiring." />
          {canEdit ? (
            <Button onClick={handleSave} disabled={!form.formState.isDirty || isPending}>
              {isPending ? <Spinner data-icon="inline-start" /> : null}
              {isPending ? 'Saving...' : 'Save changes'}
            </Button>
          ) : null}
        </div>

        <Form {...form}>
          <DraftDetailsTab orgId={org.id} form={form} editableStructure={false} readOnly={!canEdit} />
        </Form>

        <Card>
          <CardHeader>
            <CardTitle className="text-heading-16">Hiring team</CardTitle>
            <CardDescription>Choose the people responsible for this Job and their hiring role.</CardDescription>
          </CardHeader>
          <CardContent>
            <JobHiringTeam org={org} jobId={jobId} />
          </CardContent>
        </Card>
      </PageContainer>
    </div>
  );
}
