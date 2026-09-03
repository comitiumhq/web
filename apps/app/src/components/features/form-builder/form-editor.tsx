import type { FormClass } from '@comitium/schemas/forms';
import {
  APPLICATION_REQUIRED_FIELDS,
  orderApplicationRequiredQuestionsFirst,
} from '@comitium/schemas/forms/application-required-fields';
import type { AdminFormDetail, CreateFormBody, UpdateFormBody } from '@comitium/schemas/forms/form-definitions';
import { Button } from '@comitium/ui/button';
import { ConfirmDialog } from '@comitium/ui/confirm-dialog';
import { EmptyState } from '@comitium/ui/empty-state';
import { Input } from '@comitium/ui/input';
import { Label } from '@comitium/ui/label';
import { Skeleton } from '@comitium/ui/skeleton';
import { type DragDropEventHandlers, DragDropProvider } from '@dnd-kit/react';
import { PlusIcon, WarningCircleIcon } from '@phosphor-icons/react';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { useCreateForm, useUpdateForm } from '@/hooks/mutations/use-form';
import { useQueryForm } from '@/hooks/queries/use-query-form';
import { applyDndReorder } from '@/lib/utils/dnd';

import { type FormBuilderQuestion, optionsToSelectableValues, type QuestionFormData } from './question-form';
import { SectionCard, type SectionCardData, type SectionController } from './section-card';

interface FormEditorProps {
  orgId: string;
  formClass: FormClass;
  formId: string | null;
  onSaved: (formId: string) => void;
  onClose: () => void;
}

interface EditorSection {
  clientId: string;
  serverId: string | null;
  title: string;
  isSeeded: boolean;
  questions: FormBuilderQuestion[];
}

const TITLE_PLACEHOLDER: Partial<Record<FormClass, string>> = {
  application: 'e.g. Default application form',
  feedback: 'e.g. Onsite interview feedback',
};

const OVERALL_RECOMMENDATION_OPTIONS = [
  { label: 'Strong Yes', value: 'strong_yes' },
  { label: 'Yes', value: 'yes' },
  { label: 'No', value: 'no' },
  { label: 'Strong No', value: 'strong_no' },
];

function getSaveLabel(isSaving: boolean, isNew: boolean) {
  if (isSaving) {
    return 'Saving…';
  }

  return isNew ? 'Create form' : 'Save changes';
}

function seedFeedbackSection(): EditorSection {
  return {
    clientId: crypto.randomUUID(),
    serverId: null,
    title: 'Feedback',
    isSeeded: true,
    questions: [
      {
        id: crypto.randomUUID(),
        serverId: null,
        sectionId: 'seed',
        position: 0,
        questionType: 'multiple_choice',
        prompt: 'Overall Recommendation',
        description: null,
        isRequired: true,
        isPrivate: false,
        isLocked: true,
        selectableValues: OVERALL_RECOMMENDATION_OPTIONS,
        config: null,
        reusableFieldId: null,
      },
    ],
  };
}

function seedApplicationSection(): EditorSection {
  return {
    clientId: crypto.randomUUID(),
    serverId: null,
    title: 'Contact',
    isSeeded: true,
    questions: APPLICATION_REQUIRED_FIELDS.map((definition, position) => ({
      id: crypto.randomUUID(),
      serverId: null,
      sectionId: 'seed',
      position,
      questionType: definition.questionType,
      prompt: definition.prompt,
      description: definition.description,
      isRequired: true,
      isPrivate: false,
      isLocked: true,
      selectableValues: null,
      config: definition.config,
      reusableFieldId: null,
    })),
  };
}

function emptyUserSection(): EditorSection {
  return {
    clientId: crypto.randomUUID(),
    serverId: null,
    title: '',
    isSeeded: false,
    questions: [],
  };
}

function seedSectionsForFormClass(formClass: FormClass): EditorSection[] {
  if (formClass === 'application') {
    return [seedApplicationSection(), emptyUserSection()];
  }

  if (formClass === 'feedback') {
    return [seedFeedbackSection(), emptyUserSection()];
  }

  return [emptyUserSection()];
}

export function FormEditor({ orgId, formClass, formId, onSaved, onClose }: FormEditorProps) {
  const isNew = formId === null;
  const { data, isLoading, error } = useQueryForm(orgId, formId);

  const { mutate: createForm, isPending: isCreating } = useCreateForm();
  const { mutate: updateForm, isPending: isUpdating } = useUpdateForm();

  const isSaving = isCreating || isUpdating;

  const [title, setTitle] = useState('');
  const [sections, setSections] = useState<EditorSection[]>([]);
  const [snapshot, setSnapshot] = useState<string>('');
  const [discardDialogOpen, setDiscardDialogOpen] = useState(false);

  const initialize = useCallback(
    (detail?: AdminFormDetail) => {
      if (detail) {
        const nextSections = detail.sections.map((section) => toEditorSection(section, formClass));
        setTitle(detail.form.title);
        setSections(nextSections);
        setSnapshot(serialize(detail.form.title, nextSections));
      } else {
        const nextSections = seedSectionsForFormClass(formClass);
        setTitle('');
        setSections(nextSections);
        setSnapshot(serialize('', nextSections));
      }
    },
    [formClass],
  );

  useEffect(() => {
    if (isNew) {
      initialize(undefined);
    } else if (data) {
      initialize(data);
    }
  }, [isNew, data, initialize]);

  const isDirty = serialize(title, sections) !== snapshot;

  const handleTitleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setTitle(e.target.value);
  }, []);

  const handleAddSection = useCallback(() => {
    setSections((prev) => [...prev, emptyUserSection()]);
  }, []);

  const handleSectionDragEnd = useCallback<DragDropEventHandlers['onDragEnd']>((event) => {
    if (event.canceled) {
      return;
    }

    setSections((prev) => {
      const { source, target } = event.operation;
      return applyDndReorder(prev, (s) => s.clientId, source, target) ?? prev;
    });
  }, []);

  const updateSection = useCallback((clientId: string, updater: (s: EditorSection) => EditorSection) => {
    setSections((prev) => prev.map((s) => (s.clientId === clientId ? updater(s) : s)));
  }, []);

  const deleteSection = useCallback((clientId: string) => {
    setSections((prev) => prev.filter((s) => s.clientId !== clientId));
  }, []);

  const buildController = useCallback(
    (section: EditorSection): SectionController => ({
      onTitleChange: (newTitle) => updateSection(section.clientId, (s) => ({ ...s, title: newTitle })),
      onDelete: () => deleteSection(section.clientId),
      onQuestionCreate: (formData) =>
        updateSection(section.clientId, (s) => ({
          ...s,
          questions: [...s.questions, draftQuestionFromForm(formData, s.clientId, s.questions.length)],
        })),
      onQuestionUpdate: (questionId, formData) =>
        updateSection(section.clientId, (s) => ({
          ...s,
          questions: s.questions.map((q) =>
            q.id === questionId
              ? {
                  ...q,
                  prompt: formData.prompt,
                  description: formData.description.trim().length > 0 ? formData.description.trim() : null,
                  isRequired: formData.isRequired,
                  isPrivate: formData.isPrivate,
                  selectableValues: formData.options.length > 0 ? optionsToSelectableValues(formData.options) : null,
                }
              : q,
          ),
        })),
      onQuestionDelete: (questionId) =>
        updateSection(section.clientId, (s) => ({
          ...s,
          questions: s.questions.filter((q) => q.id !== questionId),
        })),
      onQuestionReorder: (_movedId, reordered) =>
        updateSection(section.clientId, (s) => ({
          ...s,
          questions: reordered.map((q, i) => ({ ...q, position: i })),
        })),
      isQuestionPending: false,
      isSectionUpdating: false,
      isSectionDeleting: false,
      isQuestionDeleting: false,
    }),
    [updateSection, deleteSection],
  );

  const handleSave = useCallback(() => {
    const trimmedTitle = title.trim();

    if (trimmedTitle.length === 0) {
      toast.error('Title is required');
      return;
    }

    if (isNew) {
      const body: CreateFormBody = {
        formClass,
        title: trimmedTitle,
        sections: sections.filter((s) => !s.isSeeded).map((s) => toCreateSectionBody(s)),
      };

      createForm(
        { orgId, body },
        {
          onSuccess: (created) => {
            toast.success('Form created');
            onSaved(created.id);
          },
        },
      );
    } else if (formId) {
      const body: UpdateFormBody = {
        title: trimmedTitle,
        sections: sections.map((s) => toUpdateSectionBody(s)),
      };

      updateForm(
        { orgId, formId, body },
        {
          onSuccess: (updated) => {
            initialize(updated);
            toast.success('Form saved');
            onSaved(formId);
          },
        },
      );
    }
  }, [title, sections, isNew, formClass, formId, orgId, createForm, updateForm, initialize, onSaved]);

  const handleClose = useCallback(() => {
    if (isDirty) {
      setDiscardDialogOpen(true);
      return;
    }
    onClose();
  }, [isDirty, onClose]);

  const handleDiscard = useCallback(() => {
    setDiscardDialogOpen(false);
    onClose();
  }, [onClose]);

  if (error) {
    return (
      <div className="h-full flex items-center justify-center px-4 sm:px-6 pb-8">
        <EmptyState
          icon={WarningCircleIcon}
          title="Something went wrong"
          description="We couldn't load this form. Please try again."
        />
      </div>
    );
  }

  if (!isNew && isLoading) {
    return <FormEditorSkeleton />;
  }

  const canDragSections = sections.length > 1;
  const saveLabel = getSaveLabel(isSaving, isNew);

  const sectionCards = sections.map((s, index) => {
    const card: SectionCardData = {
      id: s.clientId,
      title: s.title,
      questions: s.questions,
    };

    return (
      <SectionCard
        key={s.clientId}
        formClass={formClass}
        section={card}
        index={index}
        canDrag={canDragSections}
        controller={buildController(s)}
        disableTitle={s.isSeeded}
      />
    );
  });

  const titlePlaceholder = TITLE_PLACEHOLDER[formClass] ?? 'Form title';

  return (
    <>
      <div className="flex-1 overflow-y-auto px-6 py-6">
        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="form-title-input">Title</Label>
            <Input
              id="form-title-input"
              value={title}
              onChange={handleTitleChange}
              disabled={isSaving}
              placeholder={titlePlaceholder}
            />
          </div>

          <div className="flex flex-col gap-4">
            {canDragSections ? (
              <DragDropProvider onDragEnd={handleSectionDragEnd}>{sectionCards}</DragDropProvider>
            ) : (
              sectionCards
            )}

            <Button
              type="button"
              variant="outline"
              className="self-start"
              onClick={handleAddSection}
              disabled={isSaving}
            >
              <PlusIcon data-icon="inline-start" />
              Add section
            </Button>
          </div>
        </div>
      </div>

      <div className="border-t border-border px-6 py-4 shrink-0 flex flex-row justify-end gap-2">
        <Button type="button" variant="outline" onClick={handleClose} disabled={isSaving}>
          Cancel
        </Button>
        <Button type="button" onClick={handleSave} disabled={isSaving || (!isNew && !isDirty)}>
          {saveLabel}
        </Button>
      </div>

      <ConfirmDialog
        open={discardDialogOpen}
        onOpenChange={setDiscardDialogOpen}
        title="Discard changes?"
        description="Your unsaved changes will be lost."
        actionLabel="Discard"
        onConfirm={handleDiscard}
      />
    </>
  );
}

function toEditorSection(section: AdminFormDetail['sections'][number], formClass: FormClass): EditorSection {
  const questions =
    formClass === 'application' ? orderApplicationRequiredQuestionsFirst(section.questions) : section.questions;

  return {
    clientId: section.id,
    serverId: section.id,
    title: section.title,
    isSeeded: false,
    questions: questions.map((q) => ({ ...q, serverId: q.id })),
  };
}

function toCreateSectionBody(s: EditorSection) {
  return {
    title: s.title.trim(),
    questions: s.questions
      .filter((q) => !q.isLocked)
      .map((q) => ({
        questionType: q.questionType,
        prompt: q.prompt,
        description: q.description ?? undefined,
        isRequired: q.isRequired,
        isPrivate: q.isPrivate,
        selectableValues: q.selectableValues ?? undefined,
        config: q.config ?? undefined,
      })),
  };
}

function toUpdateSectionBody(s: EditorSection) {
  return {
    id: s.serverId ?? undefined,
    title: s.title.trim(),
    questions: s.questions
      .filter((q) => !q.isLocked)
      .map((q) => ({
        id: q.serverId ?? undefined,
        questionType: q.questionType,
        prompt: q.prompt,
        description: q.description ?? undefined,
        isRequired: q.isRequired,
        isPrivate: q.isPrivate,
        selectableValues: q.selectableValues ?? undefined,
        config: q.config ?? undefined,
        reusableFieldId: q.reusableFieldId,
      })),
  };
}

function draftQuestionFromForm(data: QuestionFormData, sectionId: string, position: number): FormBuilderQuestion {
  const selectableValues = data.options.length > 0 ? optionsToSelectableValues(data.options) : null;
  const description = data.description.trim().length > 0 ? data.description.trim() : null;

  return {
    id: crypto.randomUUID(),
    serverId: null,
    sectionId,
    position,
    questionType: data.questionType,
    prompt: data.prompt,
    description,
    isRequired: data.isRequired,
    isPrivate: data.isPrivate,
    isLocked: false,
    selectableValues,
    config: null,
    reusableFieldId: null,
  };
}

function serialize(title: string, sections: EditorSection[]): string {
  return JSON.stringify({
    title: title.trim(),
    sections: sections.map((s) => ({
      id: s.serverId,
      title: s.title.trim(),
      questions: s.questions.map((q) => ({
        id: q.serverId,
        type: q.questionType,
        prompt: q.prompt,
        description: q.description,
        isRequired: q.isRequired,
        isPrivate: q.isPrivate,
        reusableFieldId: q.reusableFieldId,
        selectableValues: q.selectableValues,
      })),
    })),
  });
}

function FormEditorSkeleton() {
  return (
    <div className="flex-1 overflow-y-auto px-6 py-6">
      <div className="flex flex-col gap-6">
        <Skeleton className="h-8 w-72" />
        <div className="flex flex-col gap-4">
          <Skeleton className="h-32 w-full rounded-lg" />
          <Skeleton className="h-32 w-full rounded-lg" />
        </div>
      </div>
    </div>
  );
}
