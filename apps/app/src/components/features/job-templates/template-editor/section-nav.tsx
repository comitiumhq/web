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
        'flex w-full cursor-pointer items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left transition-colors duration-150',
        {
          'bg-accent text-foreground font-medium': isActive,
          'text-muted-foreground hover:bg-accent hover:text-foreground': !isActive,
        },
      )}
    >
      <Icon className="size-4 shrink-0" aria-hidden="true" />
      <span className="min-w-0 flex-1 truncate text-label-14">{label}</span>
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
    <nav className="hidden w-56 shrink-0 flex-col gap-1 overflow-y-auto border-r p-3 md:flex">
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
        'flex items-center gap-2 px-3 py-2.5 whitespace-nowrap border-b-2 transition-colors shrink-0 cursor-pointer text-label-13',
        {
          'border-foreground text-foreground font-medium': isActive,
          'border-transparent text-muted-foreground hover:text-foreground': !isActive,
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
    <div className="flex md:hidden border-b bg-card overflow-x-auto shrink-0">
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
