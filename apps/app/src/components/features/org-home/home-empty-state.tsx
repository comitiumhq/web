import type { Icon as PhosphorIcon } from '@phosphor-icons/react';

interface HomeEmptyStateProps {
  icon: PhosphorIcon;
  title: string;
  description: string;
}

export function HomeEmptyState({ icon: Icon, title, description }: HomeEmptyStateProps) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 px-4 py-8 text-center">
      <span className="flex size-12 items-center justify-center rounded-full bg-muted">
        <Icon className="size-6 text-muted-foreground" />
      </span>
      <span className="max-w-xs">
        <span className="block text-label-14 text-foreground">{title}</span>
        <span className="mt-0.5 block text-copy-14 text-muted-foreground">{description}</span>
      </span>
    </div>
  );
}
