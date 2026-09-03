import { PageHeader } from '@comitium/ui/page-header';
import { PageLoader } from '@comitium/ui/page-loader';
import { createFileRoute } from '@tanstack/react-router';
import { MyProfileForm } from '@/components/features/my-profile/my-profile-form';
import { useQueryOrgMe } from '@/hooks/use-permissions';

export const Route = createFileRoute('/org/$orgId/settings/')({
  ssr: false,
  component: ProfileIndex,
});

function ProfileIndex() {
  const { orgId } = Route.useParams();
  const { data: meData, isLoading } = useQueryOrgMe(orgId);

  if (isLoading || !meData) {
    return <PageLoader />;
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Profile" />
      <MyProfileForm orgId={orgId} meData={meData} />
    </div>
  );
}
