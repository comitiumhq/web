import { Button } from '@comitium/ui/button';
import { Card, CardContent } from '@comitium/ui/card';
import { PageContainer } from '@comitium/ui/page-container';
import { UserIcon } from '@phosphor-icons/react';
import { Link } from '@tanstack/react-router';
import { memo } from 'react';
import { useQueryOrgMe } from '@/hooks/use-permissions';

interface ProfileBannerProps {
  orgId: string;
}

export const ProfileBanner = memo(function ProfileBanner({ orgId }: ProfileBannerProps) {
  const { data: meData } = useQueryOrgMe(orgId);

  if (!meData || meData.name) {
    return null;
  }

  return (
    <PageContainer className="shrink-0 pt-4">
      <Card size="sm" className="ring-inset">
        <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground">
              <UserIcon className="size-4" />
            </span>
            <span className="truncate text-heading-16">Complete your profile</span>
          </div>

          <Button asChild variant="outline" size="sm" className="w-full sm:w-auto">
            <Link to="/org/$orgId/settings" params={{ orgId }}>
              Complete Profile
            </Link>
          </Button>
        </CardContent>
      </Card>
    </PageContainer>
  );
});
