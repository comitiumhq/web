import { getMemberDisplayName, type MemberDisplayIdentity } from '@comitium/ui/display-name';
import { InitialsAvatar } from '@comitium/ui/initials-avatar';
import { useMemberAvatar } from '@/hooks/queries/use-member-avatar';

interface MemberAvatarProps {
  identity: MemberDisplayIdentity;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function MemberAvatar({ identity, size, className }: MemberAvatarProps) {
  const imageSrc = useMemberAvatar(identity.avatarUrl);

  return (
    <InitialsAvatar
      identity={identity}
      imageSrc={imageSrc}
      imageAlt={imageSrc ? getMemberDisplayName(identity) : ''}
      size={size}
      className={className}
    />
  );
}
