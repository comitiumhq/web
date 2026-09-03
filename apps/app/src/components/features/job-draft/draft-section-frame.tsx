import { PageContainer } from '@comitium/ui/page-container';
import { SectionHeader } from '@comitium/ui/section-header';
import { Skeleton } from '@comitium/ui/skeleton';
import type { ReactNode } from 'react';
import { useDraftFormContext } from './draft-form-context';
import { PublishValidationBanner } from './publish-validation';
import { type DraftTab, getDraftSection } from './sections';
import { DraftNotFound } from './states';

interface DraftSectionFrameProps {
  tab: DraftTab;
  children: ReactNode;
}

export function DraftSectionFrame({ tab, children }: DraftSectionFrameProps) {
  const { orgId, draft, isLoading, error, publishErrors, handleValidationFieldClick, dismissPublishErrors } =
    useDraftFormContext();

  if (isLoading) {
    return <DraftSectionSkeleton />;
  }

  if (error || !draft) {
    return <DraftNotFound orgId={orgId} />;
  }

  const section = getDraftSection(tab);

  return (
    <div className="h-full overflow-y-auto">
      {publishErrors.length > 0 && (
        <PublishValidationBanner
          errors={publishErrors}
          onClickField={handleValidationFieldClick}
          onDismiss={dismissPublishErrors}
        />
      )}

      <PageContainer size="editor" className="py-8 lg:px-10">
        <SectionHeader title={section.label} description={null} />
        {children}
      </PageContainer>
    </div>
  );
}

function DraftSectionSkeleton() {
  return (
    <div className="h-full overflow-y-auto">
      <PageContainer size="editor" className="py-8 lg:px-10">
        <Skeleton className="mb-8 h-6 w-48" />
        <div className="flex flex-col gap-4">
          <Skeleton className="h-10 w-full rounded-md" />
          <Skeleton className="h-10 w-full rounded-md" />
          <Skeleton className="h-10 w-2/3 rounded-md" />
        </div>
      </PageContainer>
    </div>
  );
}
