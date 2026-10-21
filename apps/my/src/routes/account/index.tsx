import { AuthenticationSettingsPage } from '@comitium/auth/authentication-settings-page';
import { createFileRoute } from '@tanstack/react-router';
import { qk } from '@/hooks/query-keys';

export const Route = createFileRoute('/account/')({
  ssr: false,
  head: () => ({
    meta: [
      { title: 'Authentication | Comitium' },
      { name: 'description', content: 'Manage your Comitium authentication settings.' },
      { name: 'robots', content: 'noindex,nofollow' },
    ],
  }),
  component: () => <AuthenticationSettingsPage queryKey={qk.auth.methods} />,
});
