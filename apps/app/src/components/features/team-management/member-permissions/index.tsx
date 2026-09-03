import { Badge } from '@comitium/ui/badge';
import { Button } from '@comitium/ui/button';
import { ConfirmDialog } from '@comitium/ui/confirm-dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@comitium/ui/dropdown-menu';
import { EmptyStateCard } from '@comitium/ui/empty-state-card';
import { FeatureSheetBody, FeatureSheetContent, FeatureSheetHeader } from '@comitium/ui/feature-sheet';
import { InitialsAvatar } from '@comitium/ui/initials-avatar';
import { Sheet, SheetDescription, SheetTitle } from '@comitium/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@comitium/ui/tabs';
import { DotsThreeIcon, WarningCircleIcon } from '@phosphor-icons/react';
import type { ReactNode } from 'react';
import type { MyOrg } from '@/hooks/queries/use-query-my-orgs';
import type { OrgRole, OrgTeamMember } from '@/lib/schemas/org';
import { cn } from '@/lib/utils';

import { AccountRoleSection } from './account-role-section';
import { DepartmentAccessSection } from './department-access-section';
import { JobAccessSection } from './job-access-section';
import { SectionCard } from './section-card';
import { useMemberPermissionsModel } from './use-member-permissions-model';

interface MemberPermissionsSheetProps {
  org: MyOrg;
  userId: string | null;
  currentTreasury: string | null;
  onOpenChange: (open: boolean) => void;
}

export function MemberPermissionsSheet({ org, userId, currentTreasury, onOpenChange }: MemberPermissionsSheetProps) {
  return (
    <Sheet open={userId !== null} onOpenChange={onOpenChange}>
      <FeatureSheetContent width="fixed-640">
        {userId !== null && <MemberPermissionsContent org={org} userId={userId} currentTreasury={currentTreasury} />}
      </FeatureSheetContent>
    </Sheet>
  );
}

interface MemberPermissionsContentProps {
  org: MyOrg;
  userId: string;
  currentTreasury: string | null;
}

const EMPTY_PROFILE_VALUE = 'Not set';

const ORG_ROLE_LABELS: Record<OrgRole, string> = {
  org_admin: 'Organization Admin',
  org_member: 'Member',
};

function MemberPermissionsContent({ org, userId, currentTreasury }: MemberPermissionsContentProps) {
  const model = useMemberPermissionsModel({ org, userId, currentTreasury });
  const { member, memberState } = model;

  if (member === null || memberState === null) {
    return (
      <>
        <FeatureSheetHeader>
          <SheetTitle className="text-heading-20">Member</SheetTitle>
          <SheetDescription>Member access and permissions.</SheetDescription>
        </FeatureSheetHeader>
        <FeatureSheetBody>
          <EmptyStateCard
            icon={WarningCircleIcon}
            title="Member not found"
            description="This user is not a member of the organization."
          />
        </FeatureSheetBody>
      </>
    );
  }

  return (
    <>
      <FeatureSheetHeader>
        <div className="flex items-center gap-3 pr-8">
          <InitialsAvatar identity={member} size="lg" />
          <div className="min-w-0 flex-1">
            <SheetTitle className="text-heading-20 truncate">{model.displayName}</SheetTitle>
            <SheetDescription className="truncate">{model.identityLine}</SheetDescription>
          </div>
          {memberState.canDeactivate && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon-sm" disabled={model.pending.lifecycle}>
                  <DotsThreeIcon weight="bold" />
                  <span className="sr-only">Member actions</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-[160px]">
                {member.isActive ? (
                  <DropdownMenuItem
                    className="h-8 text-label-13 text-destructive focus:text-destructive"
                    onClick={model.actions.openDeactivateDialog}
                  >
                    Deactivate member
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem className="h-8 text-label-13" onClick={model.actions.handleReactivate}>
                    Reactivate member
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </FeatureSheetHeader>

      <Tabs defaultValue="overview" className="min-h-0 flex-1 gap-0">
        <div className="shrink-0 px-6 pt-3">
          <TabsList variant="line">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="permissions">Permissions</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="overview" className="mt-0 min-h-0 overflow-y-auto px-6 py-6 data-[state=inactive]:hidden">
          <MemberOverviewTab member={member} />
        </TabsContent>

        <TabsContent
          value="permissions"
          className="mt-0 min-h-0 overflow-y-auto px-6 py-6 data-[state=inactive]:hidden"
        >
          <div className="flex flex-col gap-6">
            <AccountRoleSection
              member={member}
              canManageRole={memberState.canManageRole}
              isSelf={memberState.isSelf}
              isLastActiveAdmin={memberState.isLastActiveAdmin}
              isCurrentTreasuryAdmin={memberState.isCurrentTreasuryAdmin}
              disabled={memberState.editsDisabled || model.pending.changeRole}
              onChange={model.actions.handleRoleChange}
            />

            {memberState.isMemberOrgAdmin ? (
              <SectionCard title="Team Access Roles" description="Organization Admins already have full access." />
            ) : (
              <DepartmentAccessSection
                grants={model.grants}
                departments={model.departments}
                canManage={memberState.canManageAccess}
                isSelf={memberState.isSelf}
                disabled={memberState.editsDisabled}
                memberActive={member.isActive}
                onAdd={model.actions.handleAddGrant}
                onReplaceRole={model.actions.handleReplaceGrantRole}
                onRevoke={model.actions.handleRevokeGrant}
              />
            )}

            <JobAccessSection
              orgId={org.id}
              assignments={model.jobAssignments}
              isOrgAdmin={memberState.isMemberOrgAdmin}
              isError={model.memberAccessState.isError}
              isLoading={model.memberAccessState.isLoading}
            />
          </div>
        </TabsContent>
      </Tabs>

      <ConfirmDialog
        open={model.deactivateDialogOpen}
        onOpenChange={model.actions.handleDeactivateDialogOpenChange}
        title="Deactivate this member?"
        description={
          <>
            This will deactivate <strong>{model.displayName}</strong>. They will lose access to this workspace and
            cannot perform organization actions until reactivated.
          </>
        }
        actionLabel="Deactivate"
        onConfirm={model.actions.handleDeactivate}
        isPending={model.pending.lifecycle}
        pendingLabel="Deactivating..."
      />
    </>
  );
}

interface MemberOverviewTabProps {
  member: OrgTeamMember;
}

function MemberOverviewTab({ member }: MemberOverviewTabProps) {
  const name = getProfileValue(member.name);
  const email = getProfileValue(member.email);
  const jobTitle = getProfileValue(member.jobTitle);
  const timezone = getProfileValue(member.timezone);
  const statusLabel = member.isActive ? 'Active' : 'Deactivated';
  const statusVariant = member.isActive ? 'success' : 'destructive';

  return (
    <div className="flex flex-col gap-6">
      <SectionCard title="Info" contentClassName="pt-3">
        <dl className="divide-y divide-border">
          <OverviewField label="Name" value={name.value} muted={name.muted} />
          <OverviewField label="Email" value={email.value} muted={email.muted} />
          <OverviewField label="Job Title" value={jobTitle.value} muted={jobTitle.muted} />
          <OverviewField label="Time Zone" value={timezone.value} muted={timezone.muted} />
        </dl>
      </SectionCard>

      <SectionCard title="Account" contentClassName="pt-3">
        <dl className="divide-y divide-border">
          <OverviewField label="Organization Role" value={ORG_ROLE_LABELS[member.role]} />
          <OverviewField label="Status" value={<Badge variant={statusVariant}>{statusLabel}</Badge>} />
        </dl>
      </SectionCard>
    </div>
  );
}

interface ProfileValue {
  value: string;
  muted: boolean;
}

function getProfileValue(value: string | null): ProfileValue {
  const trimmed = value?.trim();

  if (trimmed) {
    return { value: trimmed, muted: false };
  }

  return { value: EMPTY_PROFILE_VALUE, muted: true };
}

interface OverviewFieldProps {
  label: string;
  value: ReactNode;
  muted?: boolean;
  title?: string;
  valueClassName?: string;
}

function OverviewField({ label, value, muted = false, title, valueClassName }: OverviewFieldProps) {
  return (
    <div className="grid grid-cols-[8rem_minmax(0,1fr)] items-start gap-4 py-3 first:pt-0 last:pb-0">
      <dt className="text-copy-13 text-muted-foreground">{label}</dt>
      <dd
        className={cn('min-w-0 text-copy-14 text-foreground', muted && 'text-muted-foreground', valueClassName)}
        title={title}
      >
        {value}
      </dd>
    </div>
  );
}
