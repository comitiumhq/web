import { PageContainer } from '@comitium/ui/page-container';
import { SectionHeader } from '@comitium/ui/section-header';
import type { ReactNode } from 'react';
import { PublishValidationBanner } from '../job-posting/publish-validation-banner';
import { useDraftFormContext } from './draft-form-context';
import { DraftSectionSkeleton } from './draft-section-skeleton';
import { type DraftTab, getDraftSection } from './sections';
import { DraftNotFound } from './states';

interface DraftSectionFrameProps {
  tab: DraftTab;
  children: ReactNode;
  actions?: ReactNode;
}

export function DraftSectionFrame({ tab, children, actions }: DraftSectionFrameProps) {
  const { orgId, draft, isLoading, error, publishErrors, handleValidationFieldClick, dismissPublishErrors } =
    useDraftFormContext();

  if (isLoading) {
    return <DraftSectionSkeleton tab={tab} />;
  }

  if (error || !draft) {
    return <DraftNotFound orgId={orgId} />;
  }

  const section = getDraftSection(tab);
  const header = <SectionHeader title={section.label} description={null} />;

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
        {actions ? (
          <div className="flex flex-wrap items-start justify-between gap-4">
            {header}
            {actions}
          </div>
        ) : (
          header
        )}
        {children}
      </PageContainer>
    </div>
  );
}
