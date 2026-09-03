import { Badge } from '@comitium/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@comitium/ui/select';
import { memo } from 'react';
import type { OrgTeamMember } from '@/hooks/queries/use-query-org-team';
import type { OrgRole } from '@/lib/schemas/org';

import { SectionCard } from './section-card';

const ORG_ROLE_OPTIONS: { value: OrgRole; label: string }[] = [
  { value: 'org_admin', label: 'Organization Admin' },
  { value: 'org_member', label: 'Member' },
];

const ORG_ROLE_LABEL: Record<OrgRole, string> = {
  org_admin: 'Organization Admin',
  org_member: 'Member',
};

const ORG_ROLE_ITEMS = ORG_ROLE_OPTIONS.map((option) => (
  <SelectItem key={option.value} value={option.value}>
    {option.label}
  </SelectItem>
));

interface AccountRoleSectionProps {
  member: OrgTeamMember;
  canManageRole: boolean;
  isSelf: boolean;
  isLastActiveAdmin: boolean;
  isCurrentTreasuryAdmin: boolean;
  disabled: boolean;
  onChange: (role: string) => void;
}

export const AccountRoleSection = memo(function AccountRoleSection({
  member,
  canManageRole,
  isSelf,
  isLastActiveAdmin,
  isCurrentTreasuryAdmin,
  disabled,
  onChange,
}: AccountRoleSectionProps) {
  const locked = !canManageRole || isSelf || isLastActiveAdmin || isCurrentTreasuryAdmin;

  return (
    <SectionCard
      title="Organization Role"
      headerClassName="items-center"
      actionClassName="row-span-1 self-center"
      action={
        locked ? (
          <Badge variant="secondary">{ORG_ROLE_LABEL[member.role]}</Badge>
        ) : (
          <Select value={member.role} onValueChange={onChange} disabled={disabled}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>{ORG_ROLE_ITEMS}</SelectContent>
          </Select>
        )
      }
    >
      <AccountRoleNote
        isSelf={isSelf}
        isLastActiveAdmin={isLastActiveAdmin}
        isCurrentTreasuryAdmin={isCurrentTreasuryAdmin}
      />
    </SectionCard>
  );
});

function AccountRoleNote({
  isSelf,
  isLastActiveAdmin,
  isCurrentTreasuryAdmin,
}: {
  isSelf: boolean;
  isLastActiveAdmin: boolean;
  isCurrentTreasuryAdmin: boolean;
}) {
  if (isSelf) {
    return <p className="text-copy-13 text-muted-foreground mt-3">You cannot change your own role.</p>;
  }

  if (isLastActiveAdmin) {
    return (
      <p className="text-copy-13 text-muted-foreground mt-3">
        This is the last active Organization Admin. Promote another member before changing this role.
      </p>
    );
  }

  if (isCurrentTreasuryAdmin) {
    return (
      <p className="text-copy-13 text-muted-foreground mt-3">
        This admin controls the treasury wallet, so their role cannot be changed.
      </p>
    );
  }

  return null;
}
