import { PageHeader } from '@comitium/ui/page-header';
import { createFileRoute } from '@tanstack/react-router';
import { CalendarCard } from '@/components/features/integrations/calendar-card';

export const Route = createFileRoute('/org/$orgId/settings/calendar')({
  ssr: false,
  component: ProfileCalendar,
});

function ProfileCalendar() {
  const { orgId } = Route.useParams();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Calendar" />
      <CalendarCard orgId={orgId} />
    </div>
  );
}
