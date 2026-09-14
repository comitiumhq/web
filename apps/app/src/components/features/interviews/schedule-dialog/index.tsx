import { API_ERROR_CODES } from '@comitium/schemas/api-errors';
import { Button } from '@comitium/ui/button';
import { Combobox, type ComboboxOption } from '@comitium/ui/combobox';
import { BROWSER_TZ, formatInTimezone } from '@comitium/ui/date';
import { FeatureSheetContent, FeatureSheetFooter, FeatureSheetHeader } from '@comitium/ui/feature-sheet';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@comitium/ui/form';
import { Separator } from '@comitium/ui/separator';
import { Sheet, SheetDescription, SheetTitle } from '@comitium/ui/sheet';
import { zodResolver } from '@hookform/resolvers/zod';
import { CalendarBlankIcon, SpinnerGapIcon } from '@phosphor-icons/react';
import { addMinutes, parseISO } from 'date-fns';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { type Control, useForm, useWatch } from 'react-hook-form';
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

interface InterviewTypePickerProps {
  control: Control<FormData>;
  options: readonly ComboboxOption[];
  onValueChange: (value: string | null) => void;
}

function InterviewTypePicker({ control, options, onValueChange }: InterviewTypePickerProps) {
  return (
    <FormField
      control={control}
      name="interviewId"
      render={({ field }) => (
        <FormItem className="calendar-interview-type-picker shrink-0 gap-0">
          <FormLabel className="sr-only">Interview type</FormLabel>
          <FormControl>
            <Combobox
              size="sm"
              ariaLabel="Interview type"
              options={options}
              value={field.value || null}
              onValueChange={onValueChange}
              placeholder="Interview type"
              searchPlaceholder="Search interview types…"
              emptyMessage="No interview types found."
              clearLabel="Clear interview type"
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
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
  const durationMinutes = useWatch({ control: form.control, name: 'durationMinutes' });
  const selectedTimeZone = useWatch({ control: form.control, name: 'timeZone' });

  const interviewTypeOptions = useMemo<ComboboxOption[]>(
    () =>
      templates.map((template) => ({
        value: template.id,
        label: `${template.title} (${template.durationMinutes} min)`,
      })),
    [templates],
  );

  const draftEventTitle = useMemo(() => {
    const template = templates.find((t) => t.id === selectedInterviewId);

    return template?.title ?? 'New interview';
  }, [templates, selectedInterviewId]);

  const slotSummary = useMemo(() => {
    if (!scheduledAt) {
      return null;
    }

    const start = parseISO(scheduledAt);
    const end = addMinutes(start, durationMinutes);
    const interviewerLabel = interviewers.length === 1 ? 'interviewer' : 'interviewers';

    return {
      date: formatInTimezone(start, selectedTimeZone, 'EEE, MMM d'),
      time: `${formatInTimezone(start, selectedTimeZone, 'h:mm')}–${formatInTimezone(end, selectedTimeZone, 'h:mm a')}`,
      interviewers: `${interviewers.length} ${interviewerLabel}`,
    };
  }, [durationMinutes, interviewers.length, scheduledAt, selectedTimeZone]);

  const handleTemplateChange = useCallback(
    (templateId: string | null) => {
      form.setValue('interviewId', templateId ?? '');

      if (!templateId) {
        form.setValue('durationMinutes', DEFAULT_VALUES.durationMinutes);

        return;
      }

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

  const interviewTypeControl = useMemo(
    () => (
      <InterviewTypePicker control={form.control} options={interviewTypeOptions} onValueChange={handleTemplateChange} />
    ),
    [form.control, handleTemplateChange, interviewTypeOptions],
  );
  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <FeatureSheetContent
          side="right"
          size="workspace"
          className="[&>[data-slot=sheet-close]]:top-2 [&>[data-slot=sheet-close]]:right-2"
        >
          <FeatureSheetHeader className="px-4 py-3">
            <SheetTitle>Schedule Interview</SheetTitle>
            <SheetDescription className="sr-only">Set up an interview for this candidate.</SheetDescription>
          </FeatureSheetHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="flex flex-col flex-1 min-h-0">
              <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-4">
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
                          interviewTypeControl={interviewTypeControl}
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

              <FeatureSheetFooter className="flex-wrap px-4 py-3">
                {slotSummary && (
                  <div className="mr-auto flex w-full min-w-0 flex-wrap items-center gap-x-3 gap-y-1.5 text-sm text-muted-foreground sm:w-auto">
                    <span className="inline-flex min-w-0 items-center gap-1.5 whitespace-nowrap text-foreground/80">
                      <CalendarBlankIcon className="size-3.5 opacity-70" />
                      <span className="truncate">
                        {slotSummary.date} <span aria-hidden="true">·</span> {slotSummary.time}
                      </span>
                    </span>
                    <Separator orientation="vertical" className="hidden h-4 sm:block data-vertical:self-center" />
                    <span className="whitespace-nowrap">{slotSummary.interviewers}</span>
                  </div>
                )}
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
              </FeatureSheetFooter>
            </form>
          </Form>
        </FeatureSheetContent>
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
