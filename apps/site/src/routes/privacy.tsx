import { createFileRoute } from '@tanstack/react-router';

import { LegalPage } from '@/components/legal/legal-page';
import privacyContent from '@/content/legal/privacy.md?raw';
import { LEGAL_EFFECTIVE_DATE } from '@/content/legal/version';
import { buildSeoHead } from '@/lib/seo/public';

export const Route = createFileRoute('/privacy')({
  head: () =>
    buildSeoHead({
      title: 'Privacy Notice | Comitium',
      description: 'How Comitium collects, uses, shares, and protects personal data.',
      path: '/privacy',
    }),
  component: PrivacyPage,
});

function PrivacyPage() {
  return <LegalPage title="Privacy Notice" content={privacyContent} lastUpdated={LEGAL_EFFECTIVE_DATE} />;
}
