import { PageContainer } from '@comitium/ui/page-container';
import type { ReactNode } from 'react';

const PUBLIC_SCHEDULE_FRAME_SIZE = {
  compact: 'editor',
  wide: 'settings',
} as const;

interface PublicScheduleFrameProps {
  children: ReactNode;
  size: keyof typeof PUBLIC_SCHEDULE_FRAME_SIZE;
}

function PublicScheduleFrame({ children, size }: PublicScheduleFrameProps) {
  return (
    <PageContainer
      size={PUBLIC_SCHEDULE_FRAME_SIZE[size]}
      className="flex min-h-full items-center py-8 sm:px-6 lg:px-6 lg:py-12"
    >
      {children}
    </PageContainer>
  );
}

export { PublicScheduleFrame };
