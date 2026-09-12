import { PageContainer } from '@comitium/ui/page-container';
import { SectionHeader } from '@comitium/ui/section-header';
import type { ReactNode } from 'react';
import { useDraftFormContext } from './draft-form-context';
import { DraftSectionSkeleton } from './draft-section-skeleton';
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
    return <DraftSectionSkeleton tab={tab} />;
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
