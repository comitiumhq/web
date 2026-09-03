import { authSearchSchema } from '@comitium/auth/navigation';
import { createFileRoute } from '@tanstack/react-router';
import { EmployerLoginPage } from '@/components/auth/employer-login-page';

export const Route = createFileRoute('/login')({
  ssr: false,
  validateSearch: authSearchSchema,
  head: () => ({
    meta: [
      { title: 'Sign in | Comitium' },
      { name: 'description', content: 'Sign in to your Comitium account.' },
      { name: 'robots', content: 'noindex,nofollow' },
    ],
  }),
  component: EmployerLoginRoute,
});

function EmployerLoginRoute() {
  const { returnTo } = Route.useSearch();

  return <EmployerLoginPage mode="sign-in" returnTo={returnTo} />;
}
