import { Button } from '@comitium/ui/button';
import { EmptyState } from '@comitium/ui/empty-state';
import { FeatureSheetContent } from '@comitium/ui/feature-sheet';
import { Form } from '@comitium/ui/form';
import { SectionHeader } from '@comitium/ui/section-header';
import { Sheet, SheetDescription, SheetTitle } from '@comitium/ui/sheet';
import { Spinner } from '@comitium/ui/spinner';
import { FileXIcon } from '@phosphor-icons/react';
import { useCallback, useState } from 'react';
import { useWatch } from 'react-hook-form';
import { HiringTeamTab } from '@/components/features/hiring-team-editor/hiring-team-tab';
import { CriteriaTab } from '@/components/features/job-criteria';
import { ApplicationFormPicker } from '@/components/features/job-draft/application-form-picker';
import { DraftDescriptionTab } from '@/components/features/job-draft/draft-description-tab';
import { DraftDetailsTab } from '@/components/features/job-draft/draft-details-tab';
import { DraftEditorSkeleton } from '@/components/features/job-draft/states';
import { TemplateInterviewPlan } from '@/components/features/job-interview-plan/template-interview-plan';

import { TemplateHeader } from './header';
import { InterviewPlanTab } from './interview-plan-tab';
import { TemplateMobileSectionTabs, TemplateSectionNav } from './section-nav';
import { useTemplateForm } from './use-template-form';
import { getTemplateSection, type TemplateSection } from './utils';

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
        <FeatureSheetContent side="right" width="full-6xl">
          <SheetTitle className="sr-only">Job template editor</SheetTitle>
          <SheetDescription className="sr-only">Edit reusable job template defaults.</SheetDescription>
        </FeatureSheetContent>
      </Sheet>
    );
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <FeatureSheetContent side="right" width="full-6xl">
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
    formId,
    criteria,
    interviewPlanId,
    hiringTeam,
    handleDescriptionChange,
    handleFormIdChange,
    handleCriteriaChange,
    handleInterviewPlanChange,
    handleHiringTeamChange,
  } = useTemplateForm(orgId, templateId, { onSaved: onClose, onCreated });

  const [activeSection, setActiveSection] = useState<TemplateSection>('details');
  const watchedValues = useWatch({ control: form.control });

  if (!isNew && isLoading) {
    return (
      <>
        <SheetTitle className="sr-only">Loading template</SheetTitle>
        <SheetDescription className="sr-only">Loading reusable job template defaults.</SheetDescription>
        <div className="p-6">
          <DraftEditorSkeleton />
        </div>
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

  const displayTitle = watchedValues.title || (template?.title ?? '');
  const trimmedTitle = (watchedValues.title ?? '').trim();
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
          <div className="mx-auto w-full max-w-5xl px-4 py-7 sm:px-6 lg:px-8">
            <SectionHeader title={getTemplateSection(activeSection).title} description={null} />

            {activeSection === 'details' && (
              <Form {...form}>
                <DraftDetailsTab orgId={orgId} form={form} showPublishRequiredMarkers={false} />
              </Form>
            )}
            {activeSection === 'description' && (
              <DraftDescriptionTab content={description} onChange={handleDescriptionChange} />
            )}
            {activeSection === 'application-form' && (
              <ApplicationFormPicker
                orgId={orgId}
                owner={{ kind: 'job_template' }}
                formId={formId}
                onChange={handleFormIdChange}
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
            {activeSection === 'hiring-team' && (
              <HiringTeamTab orgId={orgId} hiringTeam={hiringTeam} onChangeHiringTeam={handleHiringTeamChange} />
            )}
          </div>
        </div>
      </div>

      <div className="flex shrink-0 items-center justify-end gap-2 border-t px-6 py-4">
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
