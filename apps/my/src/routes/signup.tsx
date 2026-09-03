import { authSearchSchema } from '@comitium/auth/navigation';
import { createFileRoute } from '@tanstack/react-router';
import { CandidateLoginPage } from '@/components/auth/candidate-login-page';

export const Route = createFileRoute('/signup')({
  ssr: false,
  validateSearch: authSearchSchema,
  head: () => ({
    meta: [
      { title: 'Sign up | Comitium' },
      { name: 'description', content: 'Sign up to Comitium.' },
      { name: 'robots', content: 'noindex,follow' },
    ],
  }),
  component: CandidateSignupRoute,
});

function CandidateSignupRoute() {
  const { returnTo } = Route.useSearch();

  return <CandidateLoginPage mode="sign-up" returnTo={returnTo} />;
}
