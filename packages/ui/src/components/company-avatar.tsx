import { cn } from '../lib/cn';
import { Avatar, AvatarFallback, AvatarImage } from './avatar';

interface CompanyAvatarProps {
  name?: string | null;
  logo?: string | null;
  size?: 'sm' | 'md';
  className?: string;
  decorative?: boolean;
}

export function CompanyAvatar({ name, logo, size = 'md', className, decorative = false }: CompanyAvatarProps) {
  const initials = name?.substring(0, 2).toUpperCase() || 'CO';

  return (
    <Avatar
      key={logo ?? 'empty'}
      aria-hidden={decorative ? true : undefined}
      className={cn(
        'shrink-0 rounded-lg bg-control after:rounded-lg',
        {
          'size-10': size !== 'sm',
          'size-9': size === 'sm',
        },
        className,
      )}
    >
      {logo && <AvatarImage src={logo} alt={decorative ? '' : (name ?? '')} className="rounded-lg" />}
      <AvatarFallback delayMs={logo ? 700 : undefined} className="rounded-lg text-label-12 font-medium">
        {initials}
      </AvatarFallback>
    </Avatar>
  );
}
