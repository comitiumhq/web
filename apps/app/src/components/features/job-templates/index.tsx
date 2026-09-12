import { Badge } from '@comitium/ui/badge';
import { Button } from '@comitium/ui/button';
import { DATA_TABLE_CLASS, DATA_TABLE_SCROLL_AREA_CLASS } from '@comitium/ui/data-table';
import { EmptyState } from '@comitium/ui/empty-state';
import { PageHeader } from '@comitium/ui/page-header';
import { Skeleton } from '@comitium/ui/skeleton';
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

  const activeQuery = useQueryJobTemplates(orgId, { status: 'active', limit: 100 });
  const inactiveQuery = useQueryJobTemplates(orgId, { status: 'inactive', limit: 100 });
  const archivedQuery = useQueryJobTemplates(orgId, { status: 'archived', limit: 100 });
  const queries = { active: activeQuery, inactive: inactiveQuery, archived: archivedQuery };
  const currentQuery = queries[tab];
  const isLoading = currentQuery.isLoading;
  const error = activeQuery.error || inactiveQuery.error || archivedQuery.error;

  const templates = useMemo<JobTemplateListItem[]>(() => currentQuery.data?.data ?? [], [currentQuery.data]);

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
                <TabsTrigger value="active">
                  Active{' '}
                  <TemplateCount
                    isLoading={activeQuery.isLoading}
                    value={activeQuery.data?.pagination.hasMore ? '100+' : (activeQuery.data?.data.length ?? 0)}
                  />
                </TabsTrigger>
                <TabsTrigger value="inactive">
                  Inactive{' '}
                  <TemplateCount
                    isLoading={inactiveQuery.isLoading}
                    value={inactiveQuery.data?.pagination.hasMore ? '100+' : (inactiveQuery.data?.data.length ?? 0)}
                  />
                </TabsTrigger>
                <TabsTrigger value="archived">
                  Archived{' '}
                  <TemplateCount
                    isLoading={archivedQuery.isLoading}
                    value={archivedQuery.data?.pagination.hasMore ? '100+' : (archivedQuery.data?.data.length ?? 0)}
                  />
                </TabsTrigger>
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

function TemplateCount({ isLoading, value }: { isLoading: boolean; value: number | string }) {
  if (isLoading) {
    return <Skeleton className="size-5 rounded-full" aria-label="Loading count" />;
  }

  return <Badge variant="secondary">{value}</Badge>;
}
