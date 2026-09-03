import { API_ERROR_CODES } from '@comitium/schemas/api-errors';
import { Button } from '@comitium/ui/button';
import { BROWSER_TZ } from '@comitium/ui/date';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@comitium/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@comitium/ui/select';
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from '@comitium/ui/sheet';
import { zodResolver } from '@hookform/resolvers/zod';
import { SpinnerGapIcon } from '@phosphor-icons/react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { toast } from 'sonner';
import { useScheduleInterview } from '@/hooks/mutations/use-interview-mutations';
import { useQueryInterviewTemplates } from '@/hooks/queries/use-query-interview-templates';
import { useQueryOrgMe } from '@/hooks/use-permissions';
import { hasApiErrorCode } from '@/lib/api/client';
import type { ScheduleInterviewBody } from '@/lib/schemas/interviews';
import type { DefaultInterviewer } from '@/lib/schemas/stage-activities';
import { AvailabilityConflictDialog, getAvailabilityConflictDescription } from '../availability-conflict-dialog';
import type { SelectedInterviewer } from '../types';
import { DEFAULT_VALUES, type FormData, formSchema } from './schema';
import { SlotPickerField } from './slot-picker-field';
import { usePrefilledInterviewers } from './use-prefilled-interviewers';

interface ScheduleInterviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  applicationId: string;
  orgId: string;
  currentStageId?: string | null;
  candidateEmail?: string | null;
  prefillInterviewId?: string | null;
  prefillDefaultInterviewers?: DefaultInterviewer[] | null;
}

export function ScheduleInterviewDialog({
  open,
  onOpenChange,
  applicationId,
  orgId,
  currentStageId,
  candidateEmail,
  prefillInterviewId,
  prefillDefaultInterviewers,
}: ScheduleInterviewDialogProps) {
  const { mutate: schedule, isPending } = useScheduleInterview();
  const [interviewers, setInterviewers] = useState<SelectedInterviewer[]>([]);
  const [conflictingBody, setConflictingBody] = useState<ScheduleInterviewBody | null>(null);
  const [conflictDescription, setConflictDescription] = useState('');
  const { data: templatesData } = useQueryInterviewTemplates(orgId);
  const templates = useMemo(() => templatesData?.data ?? [], [templatesData]);
  const { data: meData } = useQueryOrgMe(orgId);
  const initialTimeZone = meData?.timezone ?? BROWSER_TZ;

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: { ...DEFAULT_VALUES, stageId: currentStageId ?? '', timeZone: initialTimeZone },
  });

  const selectedInterviewId = useWatch({ control: form.control, name: 'interviewId' });
  const scheduledAt = useWatch({ control: form.control, name: 'scheduledAt' });

  const draftEventTitle = useMemo(() => {
    const template = templates.find((t) => t.id === selectedInterviewId);

    return template?.title ?? 'New interview';
  }, [templates, selectedInterviewId]);

  const handleTemplateChange = useCallback(
    (templateId: string) => {
      form.setValue('interviewId', templateId);

      const template = templates.find((t) => t.id === templateId);

      if (template) {
        form.setValue('durationMinutes', template.durationMinutes);
      }
    },
    [form, templates],
  );

  useEffect(() => {
    if (!open) {
      return;
    }

    if (!currentStageId) {
      toast.error('Cannot schedule — application has no active stage');
      onOpenChange(false);

      return;
    }

    form.reset({ ...DEFAULT_VALUES, stageId: currentStageId, timeZone: initialTimeZone });
    setInterviewers([]);
    setConflictingBody(null);
    setConflictDescription('');

    if (prefillInterviewId) {
      handleTemplateChange(prefillInterviewId);
    }
  }, [open]);

  usePrefilledInterviewers({
    open,
    orgId,
    prefillDefaults: prefillDefaultInterviewers,
    setInterviewers,
  });

  const handleSubmit = useCallback(
    (data: FormData) => {
      if (!candidateEmail) {
        toast.error('Candidate email is required');

        return;
      }

      const body: ScheduleInterviewBody = {
        interviewId: data.interviewId,
        durationMinutes: data.durationMinutes,
        mode: 'manual',
        stageId: data.stageId,
        scheduledAt: data.scheduledAt,
        candidateEmail,
        timeZone: data.timeZone,
        interviewers: interviewers.map((interviewer) => ({
          userId: interviewer.userId,
          role: interviewer.role,
        })),
      };
      schedule(
        { applicationId, body },
        {
          onSuccess: () => {
            onOpenChange(false);
          },
          onError: (error) => {
            if (hasApiErrorCode(error, API_ERROR_CODES.availabilityConflict)) {
              setConflictingBody(body);
              setConflictDescription(getAvailabilityConflictDescription(error, interviewers));
            }
          },
        },
      );
    },
    [interviewers, applicationId, schedule, onOpenChange, candidateEmail],
  );

  const handleCancel = useCallback(() => onOpenChange(false), [onOpenChange]);

  const handleConflictOpenChange = useCallback((nextOpen: boolean) => {
    if (!nextOpen) {
      setConflictingBody(null);
      setConflictDescription('');
    }
  }, []);

  const handleOverride = useCallback(() => {
    if (!conflictingBody) {
      return;
    }

    schedule(
      { applicationId, body: { ...conflictingBody, availabilityOverride: true } },
      {
        onSuccess: () => {
          setConflictingBody(null);
          setConflictDescription('');
          onOpenChange(false);
        },
      },
    );
  }, [applicationId, conflictingBody, onOpenChange, schedule]);

  const handleSetTimeZone = useCallback(
    (tz: string) => {
      form.setValue('timeZone', tz);
    },
    [form],
  );

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="right"
          className="flex flex-col p-0 [&>[data-slot=sheet-close]]:top-2 [&>[data-slot=sheet-close]]:right-2 data-[side=right]:w-full data-[side=right]:sm:w-[calc(100vw-5rem)] data-[side=right]:sm:max-w-[1800px]"
        >
          <SheetHeader className="shrink-0 border-b px-4 py-3">
            <SheetTitle>Schedule Interview</SheetTitle>
            <SheetDescription className="sr-only">Set up an interview for this candidate.</SheetDescription>
          </SheetHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="flex flex-col flex-1 min-h-0">
              <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden p-4">
                <FormField
                  control={form.control}
                  name="interviewId"
                  render={({ field }) => (
                    <FormItem className="shrink-0">
                      <FormLabel>Interview type</FormLabel>
                      <Select value={field.value} onValueChange={handleTemplateChange}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select interview type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {templates.map((t) => (
                            <SelectItem key={t.id} value={t.id}>
                              {t.title} ({t.durationMinutes} min)
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="scheduledAt"
                  render={({ field }) => (
                    <FormItem className="min-h-0 flex-1">
                      <FormControl>
                        <SlotPickerField
                          control={form.control}
                          applicationId={applicationId}
                          orgId={orgId}
                          interviewers={interviewers}
                          onInterviewersChange={setInterviewers}
                          value={field.value || null}
                          onChange={field.onChange}
                          onTimeZoneChange={handleSetTimeZone}
                          draftEventTitle={draftEventTitle}
                          hasInterviewType={Boolean(selectedInterviewId)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <SheetFooter className="shrink-0 flex-row justify-end gap-2 border-t px-4 py-3">
                <Button type="button" variant="outline" onClick={handleCancel}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isPending || interviewers.length === 0 || !selectedInterviewId || !scheduledAt}
                >
                  {isPending && <SpinnerGapIcon data-icon="inline-start" className="animate-spin" />}
                  Schedule
                </Button>
              </SheetFooter>
            </form>
          </Form>
        </SheetContent>
      </Sheet>
      <AvailabilityConflictDialog
        open={conflictingBody !== null}
        onOpenChange={handleConflictOpenChange}
        onConfirm={handleOverride}
        actionLabel="Schedule anyway"
        description={conflictDescription}
      />
    </>
  );
}
