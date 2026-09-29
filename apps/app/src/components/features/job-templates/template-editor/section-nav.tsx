import type { Icon as PhosphorIcon } from '@phosphor-icons/react';
import { memo, useCallback } from 'react';

import { cn } from '@/lib/utils';

import { TEMPLATE_SECTION_ITEMS, type TemplateSection } from './utils';

interface SectionItemProps {
  id: TemplateSection;
  label: string;
  icon: PhosphorIcon;
  isActive: boolean;
  onSelect: (id: TemplateSection) => void;
}

const SectionItem = memo(function SectionItem({ id, label, icon: Icon, isActive, onSelect }: SectionItemProps) {
  const handleClick = useCallback(() => {
    onSelect(id);
  }, [onSelect, id]);

  return (
    <button
      type="button"
      onClick={handleClick}
      className={cn(
        'flex h-9 w-full cursor-pointer items-center gap-2.5 rounded-lg px-3 text-left text-label-14 transition-colors focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50',
        {
          'bg-accent text-accent-foreground': isActive,
          'text-muted-foreground hover:bg-accent hover:text-foreground': !isActive,
        },
      )}
    >
      <Icon className="size-4 shrink-0" aria-hidden="true" />
      <span className="min-w-0 flex-1 truncate">{label}</span>
    </button>
  );
});

interface TemplateSectionNavProps {
  activeSection: TemplateSection;
  onSelect: (section: TemplateSection) => void;
}

export const TemplateSectionNav = memo(function TemplateSectionNav({
  activeSection,
  onSelect,
}: TemplateSectionNavProps) {
  return (
    <nav className="hidden w-56 shrink-0 flex-col gap-1 overflow-y-auto border-r border-separator p-3 lg:flex">
      {TEMPLATE_SECTION_ITEMS.map((item) => (
        <SectionItem
          key={item.id}
          id={item.id}
          label={item.label}
          icon={item.icon}
          isActive={item.id === activeSection}
          onSelect={onSelect}
        />
      ))}
    </nav>
  );
});

interface MobileSectionItemProps {
  id: TemplateSection;
  label: string;
  icon: PhosphorIcon;
  isActive: boolean;
  onSelect: (id: TemplateSection) => void;
}

const MobileSectionItem = memo(function MobileSectionItem({
  id,
  label,
  icon: Icon,
  isActive,
  onSelect,
}: MobileSectionItemProps) {
  const handleClick = useCallback(() => {
    onSelect(id);
  }, [onSelect, id]);

  return (
    <button
      type="button"
      onClick={handleClick}
      className={cn(
        'flex h-9 shrink-0 cursor-pointer items-center gap-2.5 rounded-lg px-3 text-label-14 whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50',
        {
          'bg-accent text-accent-foreground': isActive,
          'text-muted-foreground hover:bg-accent hover:text-foreground': !isActive,
        },
      )}
    >
      <Icon className="size-4 shrink-0" aria-hidden="true" />
      <span>{label}</span>
    </button>
  );
});

export const TemplateMobileSectionTabs = memo(function TemplateMobileSectionTabs({
  activeSection,
  onSelect,
}: TemplateSectionNavProps) {
  return (
    <div className="flex shrink-0 items-center gap-1 overflow-x-auto border-b border-separator px-4 py-2 scrollbar-hide lg:hidden">
      {TEMPLATE_SECTION_ITEMS.map((item) => (
        <MobileSectionItem
          key={item.id}
          id={item.id}
          label={item.label}
          icon={item.icon}
          isActive={item.id === activeSection}
          onSelect={onSelect}
        />
      ))}
    </div>
  );
});
