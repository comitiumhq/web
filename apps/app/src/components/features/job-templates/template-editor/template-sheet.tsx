import { Button } from '@comitium/ui/button';
import { ConfirmDialog } from '@comitium/ui/confirm-dialog';
import { EmptyState } from '@comitium/ui/empty-state';
import { FeatureSheetContent } from '@comitium/ui/feature-sheet';
import { Form } from '@comitium/ui/form';
import { PageContainer } from '@comitium/ui/page-container';
import { SectionHeader } from '@comitium/ui/section-header';
import { Sheet, SheetDescription, SheetTitle } from '@comitium/ui/sheet';
import { Skeleton } from '@comitium/ui/skeleton';
import { Spinner } from '@comitium/ui/spinner';
import { FileXIcon } from 'lucide-react';
import { type RefObject, useCallback, useEffect, useRef, useState } from 'react';
import { useWatch } from 'react-hook-form';
import { CriteriaTab } from '@/components/features/job-criteria';
import { DetailsSkeleton } from '@/components/features/job-draft/draft-section-skeleton';
import { JobSettingsEditor } from '@/components/features/job-draft/job-settings-editor';
import { TemplateInterviewPlan } from '@/components/features/job-interview-plan/template-interview-plan';
import { PostingEditor } from '@/components/features/job-posting/posting-editor';
import { AutosaveNavigationGuard } from '../../editor-autosave/autosave-navigation-guard';
import { AutosaveStatus } from '../../editor-autosave/autosave-status';

import { TemplateHeader } from './header';
import { InterviewPlanTab } from './interview-plan-tab';
import { TemplateMobileSectionTabs, TemplateSectionNav } from './section-nav';
import { useTemplateForm } from './use-template-form';
import { getTemplateSection, TEMPLATE_SECTION_ITEMS, type TemplateSection } from './utils';

interface TemplateSheetProps {
  orgId: string;
  templateId: string | null;
  isNew: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (templateId: string) => void;
}

export function TemplateSheet({ orgId, templateId, isNew, open, onOpenChange, onCreated }: TemplateSheetProps) {
  const selection = useRef({ templateId, isNew });
  const allowLeave = useRef(false);
  const beforeClose = useRef<() => Promise<boolean>>(async () => true);
  const [discardOpen, setDiscardOpen] = useState(false);

  if (open && (templateId || isNew)) {
    selection.current = { templateId, isNew };
  }

  const handleCloseSheet = useCallback(async () => {
    if (await beforeClose.current()) {
      onOpenChange(false);
    } else {
      setDiscardOpen(true);
    }
  }, [onOpenChange]);

  return (
    <>
      <Sheet open={open} onOpenChange={(next) => (next ? onOpenChange(true) : void handleCloseSheet())}>
        <FeatureSheetContent side="right" size="workspace">
          {selection.current.templateId || selection.current.isNew ? (
            <TemplateEditor
              key={selection.current.templateId ?? 'new'}
              orgId={orgId}
              templateId={selection.current.templateId}
              beforeClose={beforeClose}
              allowLeave={allowLeave}
              onClose={handleCloseSheet}
              onCreated={onCreated}
            />
          ) : (
            <>
              <SheetTitle className="sr-only">Job template editor</SheetTitle>
              <SheetDescription className="sr-only">Edit reusable job template defaults.</SheetDescription>
            </>
          )}
        </FeatureSheetContent>
      </Sheet>
      <ConfirmDialog
        open={discardOpen}
        onOpenChange={setDiscardOpen}
        title="Leave without saving?"
        description="Some changes have not been saved. Stay to complete the fields or retry saving."
        actionLabel="Discard changes"
        cancelLabel="Keep editing"
        onConfirm={() => {
          allowLeave.current = true;
          setDiscardOpen(false);
          onOpenChange(false);
        }}
      />
    </>
  );
}

interface TemplateEditorProps {
  orgId: string;
  templateId: string | null;
  onClose: () => void;
  beforeClose: RefObject<() => Promise<boolean>>;
  allowLeave: RefObject<boolean>;
  onCreated: (templateId: string) => void;
}

function TemplateEditor({ orgId, templateId, onClose, onCreated, beforeClose, allowLeave }: TemplateEditorProps) {
  const {
    template,
    isLoading,
    error,
    form,
    isDirty,
    isSaving,
    isNew,
    readOnly,
    create,
    autosave,
    description,
    skills,
    formId,
    criteria,
    interviewPlanId,
    hiringTeam,
    handleDescriptionChange,
    handleSkillsChange,
    handleFormIdChange,
    handleCriteriaChange,
    handleInterviewPlanChange,
    handleHiringTeamChange,
  } = useTemplateForm(orgId, templateId, {
    onCreated: (id) => {
      allowLeave.current = true;
      onCreated(id);
    },
  });

  useEffect(() => {
    allowLeave.current = false;
  }, [allowLeave]);

  const [activeSection, setActiveSection] = useState<TemplateSection>('settings');
  const watchedTitle = useWatch({ control: form.control, name: 'title' });

  beforeClose.current = async () => (isNew ? !isDirty : autosave.flush());

  if (!isNew && isLoading) {
    return (
      <>
        <SheetTitle className="sr-only">Loading template</SheetTitle>
        <SheetDescription className="sr-only">Loading reusable job template defaults.</SheetDescription>
        <TemplateEditorSkeleton />
      </>
    );
  }

  if (!isNew && (error || !template)) {
    return (
      <>
        <SheetTitle className="sr-only">Template not found</SheetTitle>
        <SheetDescription className="sr-only">This job template could not be loaded.</SheetDescription>
        <div className="h-full flex items-center justify-center px-6">
          <EmptyState
            icon={FileXIcon}
            title="Template not found"
            description="This template doesn't exist or you don't have access."
          />
        </div>
      </>
    );
  }

  const currentTitle = watchedTitle || form.getValues('title') || '';
  const displayTitle = currentTitle || (template?.title ?? '');
  const trimmedTitle = currentTitle.trim();
  const canCreate = isNew && !readOnly && trimmedTitle.length > 0 && !isSaving;

  return (
    <div
      className="flex flex-col h-full overflow-hidden"
      onBlurCapture={() => {
        if (!isNew) {
          void autosave.flush();
        }
      }}
    >
      <AutosaveNavigationGuard
        containsPath={() => allowLeave.current}
        autosave={{ ...autosave, isDirty, flush: async () => beforeClose.current() }}
      />
      <TemplateHeader
        orgId={orgId}
        templateId={templateId}
        templateTitle={displayTitle}
        status={template?.status ?? 'inactive'}
        isDirty={isDirty || isSaving}
        saveStatus={!isNew && !readOnly ? <AutosaveStatus autosave={autosave} /> : null}
        isNew={isNew}
        onArchived={onClose}
      />

      <TemplateMobileSectionTabs activeSection={activeSection} onSelect={setActiveSection} />

      <div className="flex-1 flex overflow-hidden">
        <TemplateSectionNav activeSection={activeSection} onSelect={setActiveSection} />

        <div className="flex-1 overflow-y-auto">
          <PageContainer size="editor" className="py-8 lg:px-10">
            <SectionHeader title={getTemplateSection(activeSection).title} description={null} />

            {activeSection === 'settings' && (
              <Form {...form}>
                <JobSettingsEditor
                  orgId={orgId}
                  form={form}
                  hiringTeam={hiringTeam}
                  onChangeHiringTeam={handleHiringTeamChange}
                  readOnly={readOnly}
                  showPublishRequiredMarkers={false}
                  showCompensationDisclosure={false}
                />
              </Form>
            )}
            {activeSection === 'posting' && (
              <PostingEditor
                orgId={orgId}
                owner={{ kind: 'job_template' }}
                readOnly={readOnly}
                description={description}
                onDescriptionChange={handleDescriptionChange}
                skills={skills}
                onSkillsChange={handleSkillsChange}
                formId={formId}
                onFormIdChange={handleFormIdChange}
              />
            )}
            {activeSection === 'criteria' && (
              <CriteriaTab criteria={criteria} onChangeCriteria={handleCriteriaChange} readOnly={readOnly} />
            )}
            {activeSection === 'interview-plan' &&
              (templateId && template ? (
                <TemplateInterviewPlan
                  orgId={orgId}
                  templateId={templateId}
                  selectedPlanId={interviewPlanId}
                  savedPlanId={template.interviewPlanId}
                  isSaving={autosave.isSaving}
                  onSelectPlan={handleInterviewPlanChange}
                  isArchived={template.status === 'archived'}
                />
              ) : (
                <InterviewPlanTab
                  orgId={orgId}
                  selectedTemplateId={interviewPlanId}
                  onSelectTemplate={handleInterviewPlanChange}
                />
              ))}
          </PageContainer>
        </div>
      </div>

      {isNew && (
        <div className="flex shrink-0 items-center justify-end gap-2 border-t border-separator px-6 py-4">
          <Button type="button" variant="outline" onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button type="button" onClick={create} disabled={!canCreate}>
            {isSaving ? <Spinner /> : 'Create template'}
          </Button>
        </div>
      )}
    </div>
  );
}

function TemplateEditorSkeleton() {
  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="flex shrink-0 items-center border-b border-separator px-6 py-5">
        <Skeleton className="h-6 w-48 rounded-md" />
      </div>

      <div className="flex min-h-0 flex-1 overflow-hidden">
        <aside className="hidden w-56 shrink-0 flex-col gap-1 border-r border-separator p-3 lg:flex">
          {TEMPLATE_SECTION_ITEMS.map((item) => (
            <div key={item.id} className="flex h-9 items-center gap-2.5 px-3">
              <Skeleton className="size-4 shrink-0 rounded-md" />
              <Skeleton className="h-3.5 w-28 rounded-md" />
            </div>
          ))}
        </aside>

        <div className="min-w-0 flex-1 overflow-y-auto">
          <PageContainer size="editor" className="py-8 lg:px-10">
            <SectionHeader title="Settings" description={null} />
            <DetailsSkeleton />
          </PageContainer>
        </div>
      </div>
    </div>
  );
}
