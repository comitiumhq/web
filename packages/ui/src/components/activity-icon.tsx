import { CalendarPlus, ClipboardList, type LucideIcon, Mail, MessageSquare } from 'lucide-react';
import { cn } from '../lib/cn';

const ACTIVITY_ICONS = {
  schedule: { Icon: CalendarPlus, tone: 'bg-activity-schedule text-activity-schedule-foreground' },
  review: { Icon: ClipboardList, tone: 'bg-activity-review text-activity-review-foreground' },
  feedback: { Icon: MessageSquare, tone: 'bg-activity-feedback text-activity-feedback-foreground' },
  email: { Icon: Mail, tone: 'bg-activity-email text-activity-email-foreground' },
};

export type ActivityIconKind = keyof typeof ACTIVITY_ICONS;

export function ActivityIcon({
  kind,
  compact = false,
  icon,
  className,
}: {
  kind: ActivityIconKind;
  compact?: boolean;
  icon?: LucideIcon;
  className?: string;
}) {
  const { Icon: DefaultIcon, tone } = ACTIVITY_ICONS[kind];
  const Icon = icon ?? DefaultIcon;

  return (
    <span
      aria-hidden="true"
      className={cn(
        'inline-flex shrink-0 items-center justify-center',
        compact ? 'size-6 rounded-[7px]' : 'size-7 rounded-lg',
        tone,
        className,
      )}
    >
      <Icon strokeWidth={2} className={compact ? 'size-3.5' : 'size-4'} />
    </span>
  );
}
