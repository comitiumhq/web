import { Button } from '@comitium/ui/button';
import { EmptyState } from '@comitium/ui/empty-state';
import { FeatureSheetContent } from '@comitium/ui/feature-sheet';
import { Form } from '@comitium/ui/form';
import { PageContainer } from '@comitium/ui/page-container';
import { SectionHeader } from '@comitium/ui/section-header';
import { Sheet, SheetDescription, SheetTitle } from '@comitium/ui/sheet';
import { Skeleton } from '@comitium/ui/skeleton';
import { Spinner } from '@comitium/ui/spinner';
import { FileXIcon } from '@phosphor-icons/react';
import { useCallback, useState } from 'react';
import { useWatch } from 'react-hook-form';
import { CriteriaTab } from '@/components/features/job-criteria';
import { DetailsSkeleton } from '@/components/features/job-draft/draft-section-skeleton';
import { JobSettingsEditor } from '@/components/features/job-draft/job-settings-editor';
import { TemplateInterviewPlan } from '@/components/features/job-interview-plan/template-interview-plan';
import { PostingEditor } from '@/components/features/job-posting/posting-editor';

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
  const handleCloseSheet = useCallback(() => onOpenChange(false), [onOpenChange]);

  if (!open || (!templateId && !isNew)) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <FeatureSheetContent side="right" size="workspace">
          <SheetTitle className="sr-only">Job template editor</SheetTitle>
          <SheetDescription className="sr-only">Edit reusable job template defaults.</SheetDescription>
        </FeatureSheetContent>
      </Sheet>
    );
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <FeatureSheetContent side="right" size="workspace">
        <TemplateEditor
          key={templateId ?? 'new'}
          orgId={orgId}
          templateId={templateId}
          onClose={handleCloseSheet}
          onCreated={onCreated}
        />
      </FeatureSheetContent>
    </Sheet>
  );
}

interface TemplateEditorProps {
  orgId: string;
  templateId: string | null;
  onClose: () => void;
  onCreated: (templateId: string) => void;
}

function TemplateEditor({ orgId, templateId, onClose, onCreated }: TemplateEditorProps) {
  const {
    template,
    isLoading,
    error,
    form,
    isDirty,
    isSaving,
    isNew,
    save,
    discard,
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
  } = useTemplateForm(orgId, templateId, { onSaved: onClose, onCreated });

  const [activeSection, setActiveSection] = useState<TemplateSection>('settings');
  const watchedTitle = useWatch({ control: form.control, name: 'title' });

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
  const canSave = trimmedTitle.length > 0 && (isNew || isDirty) && !isSaving;
  const saveLabel = isNew ? 'Create template' : 'Save changes';

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <TemplateHeader
        orgId={orgId}
        templateId={templateId}
        templateTitle={displayTitle}
        status={template?.status ?? 'inactive'}
        isDirty={isDirty}
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
                  showPublishRequiredMarkers={false}
                />
              </Form>
            )}
            {activeSection === 'posting' && (
              <PostingEditor
                orgId={orgId}
                owner={{ kind: 'job_template' }}
                description={description}
                onDescriptionChange={handleDescriptionChange}
                skills={skills}
                onSkillsChange={handleSkillsChange}
                formId={formId}
                onFormIdChange={handleFormIdChange}
              />
            )}
            {activeSection === 'criteria' && (
              <CriteriaTab criteria={criteria} onChangeCriteria={handleCriteriaChange} />
            )}
            {activeSection === 'interview-plan' &&
              (templateId && template ? (
                <TemplateInterviewPlan
                  orgId={orgId}
                  templateId={templateId}
                  selectedPlanId={template.interviewPlanId}
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

      <div className="flex shrink-0 items-center justify-end gap-2 border-t border-separator px-6 py-4">
        {isNew ? (
          <Button type="button" variant="outline" onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>
        ) : (
          <Button type="button" variant="outline" onClick={discard} disabled={!isDirty || isSaving}>
            Discard changes
          </Button>
        )}
        <Button type="button" onClick={save} disabled={!canSave}>
          {isSaving ? <Spinner /> : saveLabel}
        </Button>
      </div>
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

      <div className="flex shrink-0 items-center justify-end gap-2 border-t border-separator px-6 py-4">
        <Skeleton className="h-9 w-20 rounded-full" />
        <Skeleton className="h-9 w-28 rounded-full" />
      </div>
    </div>
  );
}
