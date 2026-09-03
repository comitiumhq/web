import { Button } from '@comitium/ui/button';
import { PageContainer } from '@comitium/ui/page-container';

export function BulkOperationsUnavailable({ retry }: { retry: () => void }) {
  return (
    <PageContainer className="shrink-0 pb-2">
      <output className="flex items-center justify-between gap-3 rounded-lg border border-warning/30 bg-warning/10 px-3 py-2 text-sm">
        <span>Bulk selection is temporarily unavailable.</span>
        <Button type="button" variant="link" size="sm" className="h-auto shrink-0 p-0 text-current" onClick={retry}>
          Try again
        </Button>
      </output>
    </PageContainer>
  );
}
