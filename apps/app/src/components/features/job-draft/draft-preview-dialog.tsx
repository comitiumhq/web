import type { JobDraft } from '@comitium/schemas/jobs';
import { Badge } from '@comitium/ui/badge';
import { CompanyAvatar } from '@comitium/ui/company-avatar';
import { EmptyState } from '@comitium/ui/empty-state';
import { MarkdownRenderer } from '@comitium/ui/markdown-renderer';
import { ScrollArea } from '@comitium/ui/scroll-area';
import { Sheet, SheetContent, SheetTitle } from '@comitium/ui/sheet';
import { Skeleton } from '@comitium/ui/skeleton';
import { FileTextIcon } from '@phosphor-icons/react';
import { useQueryOrg } from '@/hooks/queries/use-query-org';
import {
  formatCompensationSalary,
  formatEmploymentType,
  formatLocation,
  formatLocationType,
  hasCompensation,
} from '@/lib/utils';

interface DraftPreviewDialogProps {
  orgId: string;
  draft: JobDraft;
  descriptionMarkdown: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DraftPreviewDialog({ orgId, draft, descriptionMarkdown, open, onOpenChange }: DraftPreviewDialogProps) {
  const { data: org, isLoading: isOrgLoading } = useQueryOrg(orgId);
  const locationTypeText = formatLocationType(draft.locationType);
  const locationText = formatLocation(draft.location);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full data-[side=right]:sm:max-w-[56rem] p-0 flex flex-col overflow-hidden"
      >
        <div className="shrink-0 px-6 pt-6 pb-4 border-b border-border">
          <div className="mb-3">
            <Badge variant="secondary">Draft preview</Badge>
          </div>

          <SheetTitle className="text-heading-24 mb-3 line-clamp-2">{draft.title || 'Untitled position'}</SheetTitle>

          <div className="mb-3">
            {isOrgLoading ? (
              <div className="flex items-center gap-2.5">
                <Skeleton className="size-9 shrink-0 rounded-lg" />
                <Skeleton className="h-4 w-32" />
              </div>
            ) : (
              <div className="flex items-center gap-2.5">
                <CompanyAvatar name={org?.name} logo={org?.logo} />
                <span className="text-label-14">{org?.name ?? 'Your company'}</span>
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-label-14 text-muted-foreground">
            {hasCompensation(draft.compensation) && (
              <span className="tabular-nums text-foreground font-semibold">
                {formatCompensationSalary(draft.compensation)}
              </span>
            )}
            {locationTypeText && (
              <>
                <span>•</span>
                <span>{locationTypeText}</span>
              </>
            )}
            {locationText && (
              <>
                <span>•</span>
                <span>{locationText}</span>
              </>
            )}
            {draft.employmentType && (
              <>
                <span>•</span>
                <span>{formatEmploymentType(draft.employmentType)}</span>
              </>
            )}
          </div>
        </div>

        <ScrollArea className="flex-1 h-0">
          <div className="px-6 py-5">
            {descriptionMarkdown ? (
              <MarkdownRenderer content={descriptionMarkdown} className="text-copy-14" />
            ) : (
              <EmptyState
                icon={FileTextIcon}
                title="No description yet"
                description="Add content in the Description step."
              />
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
