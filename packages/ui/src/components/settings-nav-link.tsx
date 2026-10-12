import { Link } from '@tanstack/react-router';
import type { LucideIcon } from 'lucide-react';

import { cn } from '../lib/cn';

interface SettingsNavLinkProps {
  className?: string;
  icon: LucideIcon;
  label: string;
  to: string;
}

function SettingsNavLink({ className, icon: Icon, label, to }: SettingsNavLinkProps) {
  return (
    <Link
      to={to}
      activeOptions={{ exact: true }}
      activeProps={{}}
      className={cn(
        'flex h-9 min-w-0 items-center gap-3 rounded-xl px-3 text-label-14 text-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 data-[status=active]:bg-accent data-[status=active]:text-accent-foreground',
        className,
      )}
    >
      <Icon className="size-4 shrink-0" />
      <span className="min-w-0 truncate">{label}</span>
    </Link>
  );
}

export { SettingsNavLink };
