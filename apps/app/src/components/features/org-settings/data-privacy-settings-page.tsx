import { Alert, AlertDescription, AlertTitle } from '@comitium/ui/alert';
import { Button } from '@comitium/ui/button';
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@comitium/ui/card';
import { ConfirmDialog } from '@comitium/ui/confirm-dialog';
import { FeatureErrorFallback } from '@comitium/ui/error-fallbacks';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@comitium/ui/form';
import { Input } from '@comitium/ui/input';
import { PageHeader } from '@comitium/ui/page-header';
import { Skeleton } from '@comitium/ui/skeleton';
import { Spinner } from '@comitium/ui/spinner';
import { Switch } from '@comitium/ui/switch';
import { Textarea } from '@comitium/ui/textarea';
import { Tooltip, TooltipContent, TooltipTrigger } from '@comitium/ui/tooltip';
import { zodResolver } from '@hookform/resolvers/zod';
import { InfoIcon, WarningIcon } from '@phosphor-icons/react';
import { type ReactNode, useCallback, useEffect, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';

import { useUpdateDataPrivacy } from '@/hooks/mutations/use-update-data-privacy';
import { useQueryDataPrivacy } from '@/hooks/queries/use-query-data-privacy';
import {
  type DataPrivacySettings,
  type DataPrivacySettingsFormData,
  dataPrivacySettingsFormSchema,
  toDataPrivacySettingsFormData,
  toUpdateDataPrivacySettingsInput,
} from '@/lib/schemas/data-privacy';

interface DataPrivacySettingsPageProps {
  orgId: string;
}

export function DataPrivacySettingsPage({ orgId }: DataPrivacySettingsPageProps) {
  const query = useQueryDataPrivacy(orgId);

  const handleRetry = useCallback(() => {
    void query.refetch();
  }, [query.refetch]);

  let content: ReactNode = null;

  if (query.isLoading) {
    content = <DataPrivacySettingsSkeleton />;
  } else if (query.data) {
    content = <DataPrivacySettingsForm key={orgId} orgId={orgId} settings={query.data.settings} />;
  } else if (query.error) {
    content = (
      <Card className="ring-inset">
        <FeatureErrorFallback
          error={query.error}
          resetErrorBoundary={handleRetry}
          title="Couldn't load data and privacy settings"
        />
      </Card>
    );
  }

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <PageHeader title="Data & Privacy" />
      {content}
    </div>
  );
}

interface DataPrivacySettingsFormProps {
  orgId: string;
  settings: DataPrivacySettings;
}

function DataPrivacySettingsForm({ orgId, settings }: DataPrivacySettingsFormProps) {
  const mutation = useUpdateDataPrivacy(orgId);
  const [confirmClearOpen, setConfirmClearOpen] = useState(false);
  const [pendingData, setPendingData] = useState<DataPrivacySettingsFormData | null>(null);
  const form = useForm<DataPrivacySettingsFormData>({
    resolver: zodResolver(dataPrivacySettingsFormSchema),
    defaultValues: toDataPrivacySettingsFormData(settings),
  });

  const isDirty = form.formState.isDirty;
  const criteriaEvaluationEnabled = useWatch({ control: form.control, name: 'aiCriteriaEvaluationEnabled' });
  const privacyPolicyUrl = useWatch({ control: form.control, name: 'recruitingPrivacyPolicyUrl' });
  const isPrivacyPolicyMissing = privacyPolicyUrl.trim().length === 0;

  useEffect(() => {
    if (!isDirty) {
      form.reset(toDataPrivacySettingsFormData(settings));
    }
  }, [form, isDirty, settings]);

  const save = useCallback(
    (data: DataPrivacySettingsFormData) => {
      mutation.mutate(toUpdateDataPrivacySettingsInput(data), {
        onSuccess: (response) => {
          form.reset(toDataPrivacySettingsFormData(response.settings));
          setConfirmClearOpen(false);
          setPendingData(null);
        },
      });
    },
    [form, mutation.mutate],
  );

  const handleSubmit = useCallback(
    (data: DataPrivacySettingsFormData) => {
      if (settings.recruitingPrivacyPolicyUrl && !data.recruitingPrivacyPolicyUrl) {
        setPendingData(data);
        setConfirmClearOpen(true);

        return;
      }

      save(data);
    },
    [save, settings.recruitingPrivacyPolicyUrl],
  );

  const handleConfirmClear = useCallback(() => {
    if (pendingData) {
      save(pendingData);
    }
  }, [pendingData, save]);

  const handleConfirmOpenChange = useCallback((open: boolean) => {
    setConfirmClearOpen(open);

    if (!open) {
      setPendingData(null);
    }
  }, []);

  return (
    <>
      <Form {...form}>
        <form className="flex flex-col gap-4" onSubmit={form.handleSubmit(handleSubmit)}>
          <Card size="sm" className="ring-inset">
            <CardHeader>
              <CardTitle>Privacy notice</CardTitle>
              <CardDescription>Shown to candidates before they submit an application.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-5">
              <FormField
                control={form.control}
                name="recruitingLegalEntityName"
                render={({ field }) => (
                  <FormItem>
                    <FieldLabelWithTooltip
                      label="Legal entity name"
                      helpText="Identifies the data controller. Uses your organization name when empty."
                    />
                    <FormControl>
                      <Input
                        placeholder="Example Company Ltd"
                        className="h-10"
                        disabled={mutation.isPending}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="recruitingPrivacyPolicyUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Privacy notice URL</FormLabel>
                    <FormControl>
                      <Input
                        type="text"
                        inputMode="url"
                        placeholder="https://company.com/recruiting-privacy"
                        className="h-10"
                        disabled={mutation.isPending}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {isPrivacyPolicyMissing && (
                <Alert variant="warning">
                  <WarningIcon />
                  <AlertTitle>Privacy notice required before publishing</AlertTitle>
                  <AlertDescription>Required before publishing a job that accepts applications.</AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          <Card size="sm" className="ring-inset">
            <CardHeader>
              <CardTitle>AI-assisted evaluation</CardTitle>
              <CardDescription>
                Compare resumes with job criteria. Candidates can opt out. Changes apply to new applications only.
              </CardDescription>
              <CardAction>
                <FormField
                  control={form.control}
                  name="aiCriteriaEvaluationEnabled"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          disabled={mutation.isPending}
                          aria-label="Enable AI-assisted evaluation"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </CardAction>
            </CardHeader>
            {criteriaEvaluationEnabled && (
              <CardContent className="flex flex-col gap-5">
                <FormField
                  control={form.control}
                  name="aiCriteriaEvaluationAdditionalNotice"
                  render={({ field }) => (
                    <FormItem>
                      <FieldLabelWithTooltip
                        label="Organization notice"
                        helpText="Optional. Shown with Comitium's standard AI disclosure."
                      />
                      <FormControl>
                        <Textarea
                          placeholder="Add context specific to your hiring process."
                          rows={4}
                          disabled={mutation.isPending}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="aiCriteriaEvaluationAdditionalNoticeUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FieldLabelWithTooltip
                        label="Learn more URL"
                        helpText="Optional. Links to your organization's AI notice."
                      />
                      <FormControl>
                        <Input
                          type="text"
                          inputMode="url"
                          placeholder="https://company.com/ai-in-recruiting"
                          className="h-10"
                          disabled={mutation.isPending}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            )}
          </Card>

          <div className="flex justify-end">
            <Button type="submit" className="w-full sm:w-auto" disabled={!isDirty || mutation.isPending}>
              {mutation.isPending && <Spinner data-icon="inline-start" />}
              {mutation.isPending ? 'Saving...' : 'Save changes'}
            </Button>
          </div>
        </form>
      </Form>

      <ConfirmDialog
        open={confirmClearOpen}
        onOpenChange={handleConfirmOpenChange}
        title="Remove the recruiting privacy notice?"
        description="Published job pages will stay visible, but candidates won't be able to apply until you add a privacy notice URL. New job publications will also be blocked."
        actionLabel="Remove and save"
        pendingLabel="Saving..."
        onConfirm={handleConfirmClear}
        isPending={mutation.isPending}
      />
    </>
  );
}

interface FieldLabelWithTooltipProps {
  label: string;
  helpText: string;
}

function FieldLabelWithTooltip({ label, helpText }: FieldLabelWithTooltipProps) {
  return (
    <div className="flex items-center gap-1.5">
      <FormLabel>{label}</FormLabel>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            aria-label={`About ${label}`}
            className="inline-flex size-4 shrink-0 items-center justify-center rounded-full text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-1 focus-visible:ring-ring/50"
          >
            <InfoIcon className="size-3.5" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="right">{helpText}</TooltipContent>
      </Tooltip>
    </div>
  );
}

function DataPrivacySettingsSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      {[0, 1].map((index) => (
        <Card key={index} size="sm" className="ring-inset">
          <CardHeader>
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-4 w-full max-w-xl" />
          </CardHeader>
          <CardContent className="flex flex-col gap-5">
            <Skeleton className="h-20 w-full rounded-xl" />
            <Skeleton className="h-20 w-full rounded-xl" />
          </CardContent>
        </Card>
      ))}
      <div className="flex justify-end">
        <Skeleton className="h-9 w-full rounded-full sm:w-32" />
      </div>
    </div>
  );
}
