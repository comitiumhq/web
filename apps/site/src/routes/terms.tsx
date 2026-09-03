import { createFileRoute } from '@tanstack/react-router';

import { LegalPage } from '@/components/legal/legal-page';
import termsContent from '@/content/legal/terms.md?raw';
import { LEGAL_EFFECTIVE_DATE } from '@/content/legal/version';
import { buildSeoHead } from '@/lib/seo/public';

export const Route = createFileRoute('/terms')({
  head: () =>
    buildSeoHead({
      title: 'Terms of Use | Comitium',
      description: 'The terms governing access to and use of Comitium.',
      path: '/terms',
    }),
  component: TermsPage,
});

function TermsPage() {
  return <LegalPage title="Terms of Use" content={termsContent} lastUpdated={LEGAL_EFFECTIVE_DATE} />;
}
