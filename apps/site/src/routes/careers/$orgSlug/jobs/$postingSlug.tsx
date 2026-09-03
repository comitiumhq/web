import { createFileRoute, Outlet } from '@tanstack/react-router';

export const Route = createFileRoute('/careers/$orgSlug/jobs/$postingSlug')({
  component: () => <Outlet />,
});
