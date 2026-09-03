import { Badge } from '@comitium/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@comitium/ui/card';
import { BuildingsIcon } from '@phosphor-icons/react';
import type { OrgRole } from '@/lib/schemas/org';
import { formatOrgRole } from '@/lib/utils/org';

interface InviteCardProps {
  invite: { orgName: string | null; orgLogo: string | null; role: OrgRole; email: string };
  title: string;
  description: string;
  children: React.ReactNode;
}

function InvitePageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-[calc(100dvh-7rem)] items-center justify-center px-4 py-10">
      <div className="mx-auto w-full max-w-[480px]">{children}</div>
    </div>
  );
}

export function InviteCard({ invite, title, description, children }: InviteCardProps) {
  const orgName = invite.orgName ?? 'Comitium workspace';

  return (
    <InvitePageShell>
      <Card>
        <CardHeader className="gap-5">
          <div className="flex min-w-0 items-center gap-3">
            <InviteOrgAvatar logo={invite.orgLogo} name={orgName} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-heading-16">{orgName}</p>
              <p className="truncate text-copy-13 text-muted-foreground">Invited via {invite.email}</p>
            </div>
            <Badge variant="outline">{formatOrgRole(invite.role)}</Badge>
          </div>

          <div className="grid gap-2">
            <CardTitle className="text-heading-20">{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
        </CardHeader>
        <CardContent>{children}</CardContent>
      </Card>
    </InvitePageShell>
  );
}

function InviteOrgAvatar({ logo, name }: { logo: string | null; name: string }) {
  if (logo) {
    return <img src={logo} alt={name} className="size-11 shrink-0 rounded-xl object-cover ring-1 ring-border" />;
  }

  return (
    <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground ring-1 ring-border">
      <BuildingsIcon className="size-5" />
    </div>
  );
}

interface InviteStatusCardProps {
  icon: React.ElementType<{ className?: string }>;
  title: string;
  description: string;
  children?: React.ReactNode;
}

export function InviteStatusCard({ icon: Icon, title, description, children }: InviteStatusCardProps) {
  return (
    <InvitePageShell>
      <Card>
        <CardHeader className="items-center justify-items-center text-center">
          <div className="mb-1 flex size-11 items-center justify-center rounded-xl bg-muted text-muted-foreground ring-1 ring-border">
            <Icon className="size-5" />
          </div>
          <CardTitle className="text-heading-20">{title}</CardTitle>
          <CardDescription className="w-full">{description}</CardDescription>
        </CardHeader>
        {children ? <CardContent className="flex flex-col gap-3">{children}</CardContent> : null}
      </Card>
    </InvitePageShell>
  );
}

export function InviteLoadingCard() {
  return (
    <InvitePageShell>
      <Card>
        <CardHeader className="gap-5">
          <div className="flex items-center gap-3">
            <div className="size-11 rounded-xl bg-muted" />
            <div className="grid flex-1 gap-2">
              <div className="h-5 w-40 rounded-xl bg-muted" />
              <div className="h-4 w-52 max-w-full rounded-xl bg-muted" />
            </div>
          </div>
          <div className="grid gap-2">
            <div className="h-6 w-44 rounded-xl bg-muted" />
            <div className="h-4 w-full rounded-xl bg-muted" />
          </div>
        </CardHeader>
        <CardContent className="grid gap-3">
          <div className="h-10 w-full rounded-4xl bg-muted" />
          <div className="mx-auto h-4 w-52 rounded-xl bg-muted" />
        </CardContent>
      </Card>
    </InvitePageShell>
  );
}
