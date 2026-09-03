import { Button } from '@comitium/ui/button';
import { DATA_TABLE_CLASS, DATA_TABLE_SCROLL_AREA_CLASS } from '@comitium/ui/data-table';
import { EmptyState } from '@comitium/ui/empty-state';
import { PageHeader } from '@comitium/ui/page-header';
import { TableSkeleton, type TableSkeletonColumn } from '@comitium/ui/table-skeleton';
import { Tabs, TabsList, TabsTrigger } from '@comitium/ui/tabs';
import { WarningCircleIcon } from '@phosphor-icons/react';
import { useCallback, useMemo, useState } from 'react';
import { useQueryJobTemplates } from '@/hooks/queries/use-query-job-templates';
import type { JobTemplateListItem, JobTemplateStatus } from '@/lib/schemas/job-templates';

import { TemplateSheet } from './template-editor/template-sheet';
import { TemplateTable } from './template-table';

const SKELETON_COLUMNS: TableSkeletonColumn[] = [
  { header: 'Title', cellWidth: 'w-44' },
  { header: 'Team', cellWidth: 'w-28', hideOnMobile: true },
  { header: 'Status', cellWidth: 'w-16' },
  { header: 'Updated', cellWidth: 'w-24', hideOnMobile: true },
  { header: 'Actions', align: 'right', isAction: true },
];

interface JobTemplateSettingsProps {
  orgId: string;
  activeTemplateId: string | null;
  onOpenTemplate: (id: string) => void;
  onClose: () => void;
}

export function JobTemplateSettings({ orgId, activeTemplateId, onOpenTemplate, onClose }: JobTemplateSettingsProps) {
  const [tab, setTab] = useState<JobTemplateStatus>('active');
  const [isCreating, setIsCreating] = useState(false);

  const { data, isLoading, error } = useQueryJobTemplates(orgId, { status: tab, limit: 100 });

  const templates = useMemo<JobTemplateListItem[]>(() => data?.data ?? [], [data]);

  const handleTabChange = useCallback((value: string) => {
    setTab(value as JobTemplateStatus);
  }, []);

  const handleEdit = useCallback(
    (template: JobTemplateListItem) => {
      onOpenTemplate(template.id);
    },
    [onOpenTemplate],
  );

  const handleOpenNew = useCallback(() => {
    setIsCreating(true);
  }, []);

  const handleTemplateCreated = useCallback(
    (templateId: string) => {
      setIsCreating(false);
      onOpenTemplate(templateId);
    },
    [onOpenTemplate],
  );

  const handleSheetOpenChange = useCallback(
    (open: boolean) => {
      if (!open) {
        setIsCreating(false);
        onClose();
      }
    },
    [onClose],
  );

  const sheetOpen = isCreating || activeTemplateId !== null;

  if (error) {
    return (
      <div className="h-full flex items-center justify-center px-4 sm:px-6 pb-8">
        <EmptyState
          icon={WarningCircleIcon}
          title="Something went wrong"
          description="We couldn't load job templates. Please try again."
        />
      </div>
    );
  }

  return (
    <>
      <div className="flex h-full min-h-0 flex-col gap-8">
        <PageHeader title="Job Templates" />

        <section className="flex min-h-0 flex-1 flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Tabs value={tab} onValueChange={handleTabChange}>
              <TabsList variant="line">
                <TabsTrigger value="active">Active</TabsTrigger>
                <TabsTrigger value="inactive">Inactive</TabsTrigger>
                <TabsTrigger value="archived">Archived</TabsTrigger>
              </TabsList>
            </Tabs>

            <Button size="sm" onClick={handleOpenNew}>
              New template
            </Button>
          </div>

          <div className="min-h-0 flex-1">
            {isLoading ? (
              <TableSkeleton
                columns={SKELETON_COLUMNS}
                className={DATA_TABLE_CLASS}
                scrollAreaClassName={DATA_TABLE_SCROLL_AREA_CLASS}
              />
            ) : (
              <TemplateTable
                orgId={orgId}
                templates={templates}
                tab={tab}
                onEdit={handleEdit}
                className={DATA_TABLE_CLASS}
                scrollAreaClassName={DATA_TABLE_SCROLL_AREA_CLASS}
              />
            )}
          </div>
        </section>
      </div>

      <TemplateSheet
        orgId={orgId}
        templateId={activeTemplateId}
        isNew={isCreating}
        open={sheetOpen}
        onOpenChange={handleSheetOpenChange}
        onCreated={handleTemplateCreated}
      />
    </>
  );
}
