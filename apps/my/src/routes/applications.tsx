import { createFileRoute, notFound } from '@tanstack/react-router';

export const Route = createFileRoute('/applications')({
  beforeLoad: () => {
    throw notFound();
  },
});
