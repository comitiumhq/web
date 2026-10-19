import { SecuritySettingsPage } from '@comitium/auth/security-settings-page';
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/account/security')({
  ssr: false,
  head: () => ({ meta: [{ title: 'Security | Comitium' }, { name: 'robots', content: 'noindex,nofollow' }] }),
  component: SecuritySettingsPage,
});
