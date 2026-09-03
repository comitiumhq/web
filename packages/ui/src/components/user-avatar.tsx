import type { DisplayIdentity } from '@comitium/schemas/common';

import { InitialsAvatar } from './initials-avatar';

interface UserAvatarProps {
  identity: DisplayIdentity | null;
  loading?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const FALLBACK_IDENTITY = {};

export function UserAvatar({ identity, loading, size, className }: UserAvatarProps) {
  if (loading || !identity) {
    return <InitialsAvatar identity={FALLBACK_IDENTITY} size={size} className={className} />;
  }

  return <InitialsAvatar identity={identity} size={size} className={className} />;
}
