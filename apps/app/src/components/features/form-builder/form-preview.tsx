import type { FormClass } from '@comitium/schemas/forms';
import type { RenderableFormQuestion } from '@comitium/schemas/forms/form-definitions';
import { EmptyState } from '@comitium/ui/empty-state';
import { FeatureSheetBody, FeatureSheetContent, FeatureSheetHeader } from '@comitium/ui/feature-sheet';
import { Form } from '@comitium/ui/form';
import { Sheet, SheetDescription, SheetTitle } from '@comitium/ui/sheet';
import { Skeleton } from '@comitium/ui/skeleton';
import { zodResolver } from '@hookform/resolvers/zod';
import { CircleAlertIcon, ClipboardListIcon } from 'lucide-react';
import { useRef } from 'react';
import { useForm } from 'react-hook-form';
import { buildDefaultValues, buildFormSchema, FormRenderer } from '@/components/features/form-runtime';
import { useQueryForm } from '@/hooks/queries/use-query-form';

interface FormPreviewProps {
  formClass: FormClass;
  title: string;
  sections: {
    id: string;
    title: string;
    questions: (RenderableFormQuestion & { isPrivate: boolean })[];
  }[];
}

export function FormPreview({ formClass, title, sections }: FormPreviewProps) {
  const isFeedback = formClass === 'feedback';
  const form = {
    sections: sections.map((section, position) => ({
      ...section,
      position,
      questions: section.questions.filter((question) => !isFeedback || !question.isPrivate),
    })),
  };
  const methods = useForm({
    resolver: zodResolver(buildFormSchema(form)),
    defaultValues: buildDefaultValues(form),
    mode: 'onBlur',
  });
  const hasQuestions = form.sections.some((section) => section.questions.length > 0);

  return (
    <div className="flex flex-col gap-6">
      <h3 className="text-heading-20">{title.trim() || 'Untitled form'}</h3>

      {hasQuestions ? (
        <Form {...methods}>
          <FormRenderer form={form} control={methods.control} variant={isFeedback ? 'feedback' : 'application'} />
        </Form>
      ) : (
        <EmptyState
          icon={ClipboardListIcon}
          title="No questions to preview"
          description="This view has no questions yet."
        />
      )}
    </div>
  );
}

interface FormPreviewSheetProps {
  orgId: string;
  formId: string | null;
  onClose: () => void;
}

export function FormPreviewSheet({ orgId, formId, onClose }: FormPreviewSheetProps) {
  const lastFormIdRef = useRef<string | null>(null);

  if (formId !== null) {
    lastFormIdRef.current = formId;
  }

  const displayFormId = formId ?? lastFormIdRef.current;

  if (displayFormId === null) {
    return null;
  }

  return (
    <Sheet
      open={formId !== null}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <FeatureSheetContent size="editor">
        <FeatureSheetHeader>
          <SheetTitle>Form preview</SheetTitle>
          <SheetDescription>Try the form as the person filling it out.</SheetDescription>
        </FeatureSheetHeader>
        <FeatureSheetBody>
          <SavedFormPreview orgId={orgId} formId={displayFormId} />
        </FeatureSheetBody>
      </FeatureSheetContent>
    </Sheet>
  );
}

function SavedFormPreview({ orgId, formId }: { orgId: string; formId: string }) {
  const { data, isLoading, error } = useQueryForm(orgId, formId);

  if (error) {
    return (
      <EmptyState
        icon={CircleAlertIcon}
        title="Something went wrong"
        description="We couldn't load this form. Please try again."
      />
    );
  }

  if (isLoading) {
    return (
      <output className="flex flex-col gap-6" aria-label="Loading form preview">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </output>
    );
  }

  return data ? <FormPreview formClass={data.form.formClass} title={data.form.title} sections={data.sections} /> : null;
}
