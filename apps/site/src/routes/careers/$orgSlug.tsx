import { createFileRoute, Outlet } from '@tanstack/react-router';

export const Route = createFileRoute('/careers/$orgSlug')({
  component: () => <Outlet />,
});
