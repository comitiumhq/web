import { cn } from '@comitium/ui/cn';
import { CalendarPlus, ClipboardList, Mail, MessageSquare } from 'lucide-react';

const ACTIVITY_ICONS = {
  schedule: { Icon: CalendarPlus, tone: 'bg-[#eef3f8] text-[#587ca4]' },
  review: { Icon: ClipboardList, tone: 'bg-[#f3f0f8] text-[#8272a5]' },
  feedback: { Icon: MessageSquare, tone: 'bg-[#edf6f2] text-[#4b8b7b]' },
  email: { Icon: Mail, tone: 'bg-[#faf2ed] text-[#ae785b]' },
};

export function LandingActivityIcon({
  kind,
  compact = false,
  className,
}: {
  kind: keyof typeof ACTIVITY_ICONS;
  compact?: boolean;
  className?: string;
}) {
  const { Icon, tone } = ACTIVITY_ICONS[kind];

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
