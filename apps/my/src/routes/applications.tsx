import { createFileRoute } from '@tanstack/react-router';
import { AuthGuard } from '@/components/auth/auth-guard';
import { MyApplicationsDashboard } from '@/components/features/my-applications';

export const Route = createFileRoute('/applications')({
  ssr: false,
  component: ApplicationsPage,
});

function ApplicationsPage() {
  return (
    <AuthGuard>
      <ApplicationsContent />
    </AuthGuard>
  );
}

function ApplicationsContent() {
  return (
    <div className="h-full flex flex-col overflow-auto bg-background">
      <div className="flex-1 min-h-0">
        <MyApplicationsDashboard />
      </div>
    </div>
  );
}
