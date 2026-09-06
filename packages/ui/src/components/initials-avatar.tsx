import { UserCircleIcon } from '@phosphor-icons/react';
import { memo } from 'react';
import { cn } from '../lib/cn';
import { getNameInitials } from '../lib/get-name-initials';

import { Avatar, AvatarFallback, AvatarImage } from './avatar';

interface AvatarIdentity {
  walletAddress?: string | null;
  name?: string | null;
  email?: string | null;
}

interface InitialsAvatarProps {
  identity: AvatarIdentity;
  imageSrc?: string | null;
  imageAlt?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeClasses = {
  sm: 'size-6 text-[10px]',
  md: 'size-8 text-xs',
  lg: 'size-10 text-sm',
} as const;

const iconSizes = { sm: 12, md: 16, lg: 20 } as const;

export const InitialsAvatar = memo(function InitialsAvatar({
  identity,
  imageSrc,
  imageAlt = '',
  size = 'md',
  className,
}: InitialsAvatarProps) {
  const name = identity.name || identity.email;
  const initials = name ? getNameInitials(name) : null;

  return (
    <Avatar className={cn(sizeClasses[size], className)}>
      {imageSrc ? <AvatarImage src={imageSrc} alt={imageAlt} /> : null}
      <AvatarFallback>{initials ?? <UserCircleIcon size={iconSizes[size]} />}</AvatarFallback>
    </Avatar>
  );
});
