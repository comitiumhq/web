import { RecoverySettingsPage } from '@comitium/auth/recovery-settings-page';
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/account/recovery')({
  ssr: false,
  head: () => ({ meta: [{ title: 'Recovery | Comitium' }, { name: 'robots', content: 'noindex,nofollow' }] }),
  component: RecoverySettingsPage,
});
