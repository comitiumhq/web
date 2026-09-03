import { Badge } from '@comitium/ui/badge';
import { Button } from '@comitium/ui/button';
import { EmptyState } from '@comitium/ui/empty-state';
import { PageHeader } from '@comitium/ui/page-header';
import { Tabs, TabsList, TabsTrigger } from '@comitium/ui/tabs';
import { WarningCircleIcon } from '@phosphor-icons/react';
import { useCallback, useMemo, useState } from 'react';
import { useQueryInterviewPlans } from '@/hooks/queries/use-query-interview-plans';
import { TemplateEditorSheet } from './template-editor-sheet';
import { TemplateTable } from './template-table';
import { TemplateTableSkeleton } from './template-table-skeleton';

interface InterviewPlansProps {
  orgId: string;
  activeTemplateId: string | null;
  onOpenTemplate: (id: string) => void;
  onClose: () => void;
}

type TabValue = 'active' | 'archived';

export function InterviewPlans({ orgId, activeTemplateId, onOpenTemplate, onClose }: InterviewPlansProps) {
  const [tab, setTab] = useState<TabValue>('active');
  const [isCreating, setIsCreating] = useState(false);
  const { data, isLoading, error } = useQueryInterviewPlans(orgId, true);

  const allTemplates = data?.data ?? [];
  const activeTemplates = useMemo(() => allTemplates.filter((t) => !t.isArchived), [allTemplates]);
  const archivedTemplates = useMemo(() => allTemplates.filter((t) => t.isArchived), [allTemplates]);
  const templates = tab === 'active' ? activeTemplates : archivedTemplates;

  const handleTabChange = useCallback((value: string) => {
    setTab(value as TabValue);
  }, []);

  const handleOpenNew = useCallback(() => {
    if (activeTemplateId !== null) {
      onClose();
    }

    setIsCreating(true);
  }, [activeTemplateId, onClose]);

  const handleSheetClose = useCallback(() => {
    if (isCreating) {
      setIsCreating(false);
    }

    onClose();
  }, [isCreating, onClose]);

  const sheetOpen = isCreating || activeTemplateId !== null;

  if (error) {
    return (
      <div className="h-full flex items-center justify-center px-4 sm:px-6 pb-8">
        <EmptyState
          icon={WarningCircleIcon}
          title="Something went wrong"
          description="We couldn't load interview plans. Please try again."
        />
      </div>
    );
  }

  return (
    <>
      <div className="flex h-full min-h-0 flex-col gap-8">
        <PageHeader title="Interview Plans" />

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

            <Button size="sm" onClick={handleOpenNew}>
              New plan
            </Button>
          </div>

          <div className="min-h-0 flex-1">
            {isLoading ? (
              <TemplateTableSkeleton />
            ) : (
              <TemplateTable orgId={orgId} templates={templates} tab={tab} onEdit={onOpenTemplate} />
            )}
          </div>
        </div>
      </div>

      <TemplateEditorSheet
        orgId={orgId}
        open={sheetOpen}
        mode={isCreating ? 'create' : 'edit'}
        templateId={activeTemplateId}
        onClose={handleSheetClose}
      />
    </>
  );
}
