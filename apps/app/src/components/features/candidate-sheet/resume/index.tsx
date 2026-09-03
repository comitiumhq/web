import { ScrollArea } from '@comitium/ui/scroll-area';
import { ResumePreview } from '@/components/features/resume/resume-preview';

interface CandidateResumeProps {
  orgId: string;
  hasResume: boolean;
  pdfData: Uint8Array | null;
  isLoading: boolean;
  error: string | null;
  onDownload: () => void;
}

export function CandidateResume({ orgId, hasResume, pdfData, isLoading, error, onDownload }: CandidateResumeProps) {
  return (
    <ScrollArea className="h-full">
      <ResumePreview
        className="px-4 pb-4 pt-20"
        orgId={orgId}
        hasResume={hasResume}
        pdfData={pdfData}
        isLoading={isLoading}
        error={error}
        onDownload={onDownload}
      />
    </ScrollArea>
  );
}
