import type { ApplicationFormOption } from '@comitium/schemas/forms/form-definitions';
import { Button } from '@comitium/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@comitium/ui/dialog';
import { EmptyState } from '@comitium/ui/empty-state';
import { Form } from '@comitium/ui/form';
import { Skeleton } from '@comitium/ui/skeleton';
import { Tooltip, TooltipContent, TooltipTrigger } from '@comitium/ui/tooltip';
import { CheckIcon, EyeIcon, WarningCircleIcon } from '@phosphor-icons/react';
import { Link } from '@tanstack/react-router';
import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { type FieldValues, useForm } from 'react-hook-form';
import { buildDefaultValues, FormRenderer } from '@/components/features/form-runtime';
import { useQueryApplicationFormOptions } from '@/hooks/queries/use-query-application-form-options';
import { usePermissions } from '@/hooks/use-permissions';
import type { ApplicationFormOptionsOwner } from '@/lib/api/application-form-options';
import { ApplicationFormIcon } from '@/lib/constants/domain-icons';
import { Permission } from '@/lib/schemas/org';
import { cn } from '@/lib/utils';

interface ApplicationFormPickerProps {
  orgId: string;
  owner: ApplicationFormOptionsOwner;
  formId: string | null;
  onChange: (formId: string | null) => void;
}

export function ApplicationFormPicker({ orgId, owner, formId, onChange }: ApplicationFormPickerProps) {
  const { can } = usePermissions();
  const { data, isLoading, isError, isFetching, refetch } = useQueryApplicationFormOptions(orgId, owner);
  const forms = data?.data ?? [];
  const defaultFormId = useMemo(() => forms.find((form) => form.isDefaultForm)?.id ?? null, [forms]);
  const selectedFormId = formId ?? defaultFormId;

  useEffect(() => {
    if (formId !== null) {
      return;
    }

    if (defaultFormId === null) {
      return;
    }

    onChange(defaultFormId);
  }, [defaultFormId, formId, onChange]);

  if (isLoading) {
    return <ApplicationFormListSkeleton />;
  }

  if (isError) {
    return (
      <div className="flex flex-col gap-4">
        <EmptyState
          icon={WarningCircleIcon}
          title="Failed to load application forms"
          description="Try loading the available forms again."
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="self-start"
          disabled={isFetching}
          onClick={() => refetch()}
        >
          Try again
        </Button>
      </div>
    );
  }

  if (forms.length === 0) {
    const canManageForms = can(Permission.FORM_WRITE);

    return (
      <div className="flex flex-col gap-4">
        <EmptyState
          icon={ApplicationFormIcon}
          title="No application forms"
          description={
            canManageForms
              ? 'Create a default form before choosing one here.'
              : 'Ask an organization admin to create an application form.'
          }
        />
        {canManageForms ? (
          <Button asChild variant="outline" size="sm" className="self-start">
            <Link to="/org/$orgId/organization/application-forms" params={{ orgId }}>
              Open Application forms
            </Link>
          </Button>
        ) : null}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {forms.map((form) => (
        <ApplicationFormOptionRow
          key={form.id}
          form={form}
          isSelected={selectedFormId === form.id}
          onSelect={onChange}
        />
      ))}
    </div>
  );
}

function countLabel(count: number, noun: string): string {
  return `${count} ${count === 1 ? noun : `${noun}s`}`;
}

function getNotableFieldLabel(detail: ApplicationFormOption): string | null {
  const types = new Set(
    detail.sections.flatMap((section) => section.questions.map((question) => question.questionType)),
  );

  if (types.has('resume')) {
    return 'resume';
  }

  if (types.has('file')) {
    return 'file upload';
  }

  if (types.has('url')) {
    return 'link';
  }

  return null;
}

function getFormMeta(detail: ApplicationFormOption): string {
  const sectionCount = detail.sections.length;
  const questionCount = detail.sections.reduce((total, section) => total + section.questions.length, 0);
  const parts = [countLabel(questionCount, 'question'), countLabel(sectionCount, 'section')];
  const notable = getNotableFieldLabel(detail);

  if (notable) {
    parts.push(notable);
  }

  return parts.join(' · ');
}

function FormMetaLine({ detail }: { detail: ApplicationFormOption }) {
  return <span className="text-label-12 text-muted-foreground">{getFormMeta(detail)}</span>;
}

interface ApplicationFormOptionRowProps {
  form: ApplicationFormOption;
  isSelected: boolean;
  onSelect: (formId: string | null) => void;
}

const ApplicationFormOptionRow = memo(function ApplicationFormOptionRow({
  form,
  isSelected,
  onSelect,
}: ApplicationFormOptionRowProps) {
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  const handleSelect = useCallback(() => {
    onSelect(form.id);
  }, [form.id, onSelect]);

  const handlePreviewClick = useCallback(() => {
    setIsPreviewOpen(true);
  }, []);

  return (
    <div
      className={cn('relative flex items-center gap-3 rounded-xl border px-4 py-3 transition-colors', {
        'border-border hover:bg-accent': !isSelected,
        'border-primary bg-primary/5': isSelected,
      })}
    >
      <button
        type="button"
        onClick={handleSelect}
        aria-label={`Select ${form.title}`}
        className="absolute inset-0 rounded-xl"
      />

      <span className="pointer-events-none relative flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="flex flex-wrap items-center gap-2">
          <span className="text-label-14 font-medium">{form.title}</span>
          {form.isDefaultForm ? (
            <span className="rounded-full bg-secondary px-2 py-0.5 text-label-12 text-secondary-foreground">
              Default
            </span>
          ) : null}
        </span>
        <FormMetaLine detail={form} />
      </span>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={handlePreviewClick}
            aria-label={`Preview ${form.title}`}
            className="relative text-muted-foreground"
          >
            <EyeIcon />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Preview</TooltipContent>
      </Tooltip>

      <SelectionIndicator isSelected={isSelected} />

      <ApplicationFormPreviewDialog formDetail={form} open={isPreviewOpen} onOpenChange={setIsPreviewOpen} />
    </div>
  );
});

interface SelectionIndicatorProps {
  isSelected: boolean;
}

const SelectionIndicator = memo(function SelectionIndicator({ isSelected }: SelectionIndicatorProps) {
  return (
    <span
      className={cn(
        'pointer-events-none relative flex size-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors',
        {
          'border-muted-foreground/30': !isSelected,
          'border-primary bg-primary text-primary-foreground': isSelected,
        },
      )}
      aria-hidden="true"
    >
      {isSelected ? <CheckIcon className="size-3" /> : null}
    </span>
  );
});

interface ApplicationFormPreviewDialogProps {
  formDetail: ApplicationFormOption;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const ApplicationFormPreviewDialog = memo(function ApplicationFormPreviewDialog({
  formDetail,
  open,
  onOpenChange,
}: ApplicationFormPreviewDialogProps) {
  const formShape = useMemo(() => ({ sections: formDetail.sections }), [formDetail.sections]);
  const defaultValues = useMemo(() => buildDefaultValues(formShape), [formShape]);
  const previewForm = useForm<FieldValues>({ defaultValues });
  const questionCount = useMemo(
    () => formDetail.sections.reduce((count, section) => count + section.questions.length, 0),
    [formDetail.sections],
  );

  useEffect(() => {
    if (!open) {
      return;
    }

    previewForm.reset(defaultValues);
  }, [defaultValues, open, previewForm]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[calc(100dvh-2rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-3xl">
        <DialogHeader className="border-b px-6 py-5 pr-14">
          <DialogTitle className="text-heading-20">Candidate form preview</DialogTitle>
          <DialogDescription>Try the candidate experience. Test responses are not saved.</DialogDescription>
        </DialogHeader>
        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6">
          {questionCount > 0 ? (
            <Form {...previewForm}>
              <FormRenderer form={formShape} control={previewForm.control} variant="application" />
            </Form>
          ) : (
            <EmptyState
              icon={ApplicationFormIcon}
              title="No questions yet"
              description="This form does not have candidate questions yet."
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
});

function ApplicationFormListSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 rounded-xl border px-4 py-3">
          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
            <Skeleton className="h-3.5 w-48" />
            <Skeleton className="h-3 w-40" />
          </div>
          <Skeleton className="h-8 w-20 shrink-0 rounded-md" />
          <Skeleton className="size-5 shrink-0 rounded-full" />
        </div>
      ))}
    </div>
  );
}
