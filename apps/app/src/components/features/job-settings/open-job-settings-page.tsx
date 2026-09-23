import { Button } from '@comitium/ui/button';
import { Form } from '@comitium/ui/form';
import { PageContainer } from '@comitium/ui/page-container';
import { SectionHeader } from '@comitium/ui/section-header';
import { Spinner } from '@comitium/ui/spinner';
import { zodResolver } from '@hookform/resolvers/zod';
import { useCallback, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { DetailsSkeleton } from '@/components/features/job-draft/draft-section-skeleton';
import { JobHiringTeam } from '@/components/features/job-hiring-team';
import { JobBasicSettingsCard } from '@/components/features/job-settings/job-basic-settings-card';
import {
  jobToSettingsFormValues,
  prepareJobSettingsUpdate,
} from '@/components/features/job-settings/job-settings-state';
import { JobSettingsTabs } from '@/components/features/job-settings/job-settings-tabs';
import { useSaveJobEditor } from '@/components/features/job-settings/use-save-job-editor';
import { useQueryJobEditor } from '@/hooks/queries/use-query-job-editor';
import type { MyOrg } from '@/hooks/queries/use-query-my-orgs';
import { useJobPermissions } from '@/hooks/use-job-permissions';
import { type JobSettingsFormData, JobSettingsFormSchema } from '@/lib/schemas/job-settings-form';
import { Permission } from '@/lib/schemas/org';

interface OpenJobSettingsPageProps {
  org: MyOrg;
  jobId: string;
}

export function OpenJobSettingsPage({ org, jobId }: OpenJobSettingsPageProps) {
  const { data: job, isLoading, isError } = useQueryJobEditor(org.id, jobId);
  const { mutateAsync: saveSettings, isPending } = useSaveJobEditor(org.id, jobId);
  const { canOnJob } = useJobPermissions(jobId);
  const [version, setVersion] = useState<number | null>(null);
  const form = useForm<JobSettingsFormData>({
    resolver: zodResolver(JobSettingsFormSchema),
    defaultValues: { title: '' },
  });

  useEffect(() => {
    if (!job) {
      return;
    }

    form.reset(jobToSettingsFormValues(job));
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
        <SectionHeader title="Settings" description={null} />
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
          <SectionHeader title="Settings" description={null} />
          {canEdit ? (
            <Button onClick={handleSave} disabled={!form.formState.isDirty || isPending}>
              {isPending ? <Spinner data-icon="inline-start" /> : null}
              {isPending ? 'Saving...' : 'Save changes'}
            </Button>
          ) : null}
        </div>

        <Form {...form}>
          <JobSettingsTabs
            basic={
              <JobBasicSettingsCard
                orgId={org.id}
                form={form}
                editableStructure={false}
                readOnly={!canEdit}
              />
            }
            hiringTeam={<JobHiringTeam org={org} jobId={jobId} />}
          />
        </Form>
      </PageContainer>
    </div>
  );
}
