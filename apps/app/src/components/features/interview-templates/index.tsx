import { Badge } from '@comitium/ui/badge';
import { Button } from '@comitium/ui/button';
import { EmptyState } from '@comitium/ui/empty-state';
import { PageHeader } from '@comitium/ui/page-header';
import { Tabs, TabsList, TabsTrigger } from '@comitium/ui/tabs';
import { WarningCircleIcon } from '@phosphor-icons/react';
import { useCallback, useMemo, useState } from 'react';
import { useQueryInterviewTemplates } from '@/hooks/queries/use-query-interview-templates';
import type { InterviewTemplate } from '@/lib/schemas/interview-templates';

import { TemplateEditorSheet } from './template-editor-sheet';
import { TemplateTable } from './template-table';
import { TemplateTableSkeleton } from './template-table-skeleton';

interface InterviewTemplateSettingsProps {
  orgId: string;
  selectedTemplateId: string | null;
  onSelectedTemplateChange: (templateId: string | null) => void;
}

type DialogMode = 'create' | 'edit';
type TabValue = 'active' | 'archived';

export function InterviewTemplateSettings({
  orgId,
  selectedTemplateId,
  onSelectedTemplateChange,
}: InterviewTemplateSettingsProps) {
  const [tab, setTab] = useState<TabValue>('active');
  const { data, isLoading, error } = useQueryInterviewTemplates(orgId, true);

  const [isCreating, setIsCreating] = useState(false);

  const allTemplates = data?.data ?? [];
  const activeTemplates = useMemo(() => allTemplates.filter((t) => !t.isArchived), [allTemplates]);
  const archivedTemplates = useMemo(() => allTemplates.filter((t) => t.isArchived), [allTemplates]);
  const templates = tab === 'active' ? activeTemplates : archivedTemplates;
  const editingTemplate = useMemo(
    () => allTemplates.find((template) => template.id === selectedTemplateId) ?? null,
    [allTemplates, selectedTemplateId],
  );
  const dialogOpen = isCreating || editingTemplate !== null;
  const dialogMode: DialogMode = isCreating ? 'create' : 'edit';

  const handleTabChange = useCallback((value: string) => {
    setTab(value as TabValue);
  }, []);

  const openCreate = useCallback(() => {
    onSelectedTemplateChange(null);
    setIsCreating(true);
  }, [onSelectedTemplateChange]);

  const openEdit = useCallback(
    (template: InterviewTemplate) => {
      setIsCreating(false);
      onSelectedTemplateChange(template.id);
    },
    [onSelectedTemplateChange],
  );

  const handleDialogOpenChange = useCallback(
    (open: boolean) => {
      if (open) {
        return;
      }

      setIsCreating(false);
      onSelectedTemplateChange(null);
    },
    [onSelectedTemplateChange],
  );

  if (error) {
    return (
      <div className="h-full flex items-center justify-center px-4 sm:px-6 pb-8">
        <EmptyState
          icon={WarningCircleIcon}
          title="Something went wrong"
          description="We couldn't load interview templates. Please try again."
        />
      </div>
    );
  }

  return (
    <>
      <div className="flex h-full min-h-0 flex-col gap-8">
        <PageHeader title="Interview Templates" />

        <div className="flex min-h-0 flex-1 flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Tabs value={tab} onValueChange={handleTabChange}>
              <TabsList variant="line">
                <TabsTrigger value="active">
                  Active <Badge variant="secondary">{activeTemplates.length}</Badge>
                </TabsTrigger>
                <TabsTrigger value="archived">
                  Archived <Badge variant="secondary">{archivedTemplates.length}</Badge>
                </TabsTrigger>
              </TabsList>
            </Tabs>

            <Button size="sm" onClick={openCreate}>
              New template
            </Button>
          </div>

          <div className="min-h-0 flex-1">
            {isLoading ? (
              <TemplateTableSkeleton />
            ) : (
              <TemplateTable orgId={orgId} templates={templates} tab={tab} onEdit={openEdit} />
            )}
          </div>
        </div>
      </div>

      <TemplateEditorSheet
        orgId={orgId}
        open={dialogOpen}
        onOpenChange={handleDialogOpenChange}
        mode={dialogMode}
        template={editingTemplate}
      />
    </>
  );
}
