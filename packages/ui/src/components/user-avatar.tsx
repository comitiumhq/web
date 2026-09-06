import type { DisplayIdentity } from '@comitium/schemas/common';

import { InitialsAvatar } from './initials-avatar';

interface UserAvatarProps {
  identity: DisplayIdentity | null;
  loading?: boolean;
  imageSrc?: string | null;
  imageAlt?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const FALLBACK_IDENTITY = {};

export function UserAvatar({ identity, loading, imageSrc, imageAlt, size, className }: UserAvatarProps) {
  if (loading || !identity) {
    return <InitialsAvatar identity={FALLBACK_IDENTITY} size={size} className={className} />;
  }

  return (
    <InitialsAvatar identity={identity} imageSrc={imageSrc} imageAlt={imageAlt} size={size} className={className} />
  );
}
