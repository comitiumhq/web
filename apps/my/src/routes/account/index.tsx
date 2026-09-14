import { AuthenticationSettingsPage } from '@comitium/auth/authentication-settings-page';
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/account/')({
  ssr: false,
  head: () => ({
    meta: [
      { title: 'Authentication | Comitium' },
      { name: 'description', content: 'Manage your Comitium sign-in methods.' },
      { name: 'robots', content: 'noindex,nofollow' },
    ],
  }),
  component: AuthenticationSettingsPage,
});
