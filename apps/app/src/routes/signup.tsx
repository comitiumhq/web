import { authSearchSchema } from '@comitium/auth/navigation';
import { createFileRoute } from '@tanstack/react-router';
import { EmployerLoginPage } from '@/components/auth/employer-login-page';

export const Route = createFileRoute('/signup')({
  ssr: false,
  validateSearch: authSearchSchema,
  head: () => ({
    meta: [
      { title: 'Sign up | Comitium' },
      { name: 'description', content: 'Sign up to Comitium.' },
      { name: 'robots', content: 'noindex,nofollow' },
    ],
  }),
  component: EmployerSignupRoute,
});

function EmployerSignupRoute() {
  const { returnTo } = Route.useSearch();

  return <EmployerLoginPage mode="sign-up" returnTo={returnTo} />;
}
