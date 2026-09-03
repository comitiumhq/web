import { authSearchSchema } from '@comitium/auth/navigation';
import { createFileRoute } from '@tanstack/react-router';
import { CandidateLoginPage } from '@/components/auth/candidate-login-page';

export const Route = createFileRoute('/login')({
  ssr: false,
  validateSearch: authSearchSchema,
  head: () => ({
    meta: [
      { title: 'Sign in | Comitium' },
      { name: 'description', content: 'Sign in to your Comitium account.' },
      { name: 'robots', content: 'noindex,follow' },
    ],
  }),
  component: CandidateLoginRoute,
});

function CandidateLoginRoute() {
  const { returnTo } = Route.useSearch();

  return <CandidateLoginPage mode="sign-in" returnTo={returnTo} />;
}
