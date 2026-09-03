import { Badge } from '@comitium/ui/badge';
import { Button } from '@comitium/ui/button';
import { EmptyState } from '@comitium/ui/empty-state';
import { PageHeader } from '@comitium/ui/page-header';
import { Tabs, TabsList, TabsTrigger } from '@comitium/ui/tabs';
import { WarningCircleIcon } from '@phosphor-icons/react';
import { type ReactNode, useCallback } from 'react';

import type { EntityTabValue } from './types';

interface EntitySettingsPageProps {
  title: string;
  tab: EntityTabValue;
  activeCount: number;
  archivedCount: number;
  isError: boolean;
  errorDescription: string;
  onTabChange: (tab: EntityTabValue) => void;
  children: ReactNode;
  createDisabled?: boolean;
  createLabel: string;
  createVisible?: boolean;
  notice?: ReactNode;
  onCreateClick?: () => void;
}

export function EntitySettingsPage({
  title,
  tab,
  activeCount,
  archivedCount,
  isError,
  errorDescription,
  onTabChange,
  children,
  createDisabled = false,
  createLabel,
  createVisible = true,
  notice,
  onCreateClick,
}: EntitySettingsPageProps) {
  const handleTabValueChange = useCallback(
    (value: string) => {
      onTabChange(value as EntityTabValue);
    },
    [onTabChange],
  );

  if (isError) {
    return <EntitySettingsError description={errorDescription} />;
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-8">
      <PageHeader title={title} />

      <section className="flex min-h-0 flex-1 flex-col gap-4">
        {notice}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <Tabs value={tab} onValueChange={handleTabValueChange}>
            <TabsList variant="line">
              <TabsTrigger value="active">
                Active <Badge variant="secondary">{activeCount}</Badge>
              </TabsTrigger>
              <TabsTrigger value="archived">
                Archived <Badge variant="secondary">{archivedCount}</Badge>
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {createVisible && onCreateClick && (
            <Button size="sm" onClick={onCreateClick} disabled={createDisabled}>
              {createLabel}
            </Button>
          )}
        </div>

        <div className="min-h-0 flex-1">{children}</div>
      </section>
    </div>
  );
}

function EntitySettingsError({ description }: { description: string }) {
  return (
    <div className="h-full flex items-center justify-center pb-8">
      <EmptyState icon={WarningCircleIcon} title="Something went wrong" description={description} />
    </div>
  );
}
