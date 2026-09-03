import { memo } from 'react';

interface SectionHeaderProps {
  title: string;
  description: string | null;
}

export const SectionHeader = memo(function SectionHeader({ title, description }: SectionHeaderProps) {
  return (
    <div className="mb-8">
      <h2 className="text-heading-20">{title}</h2>
      {description ? <p className="mt-1 text-copy-14 text-muted-foreground">{description}</p> : null}
    </div>
  );
});
