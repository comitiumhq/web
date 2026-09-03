import { createFileRoute } from '@tanstack/react-router';

import { LegalPage } from '@/components/legal/legal-page';
import dpaContent from '@/content/legal/dpa.md?raw';
import { LEGAL_EFFECTIVE_DATE } from '@/content/legal/version';
import { buildSeoHead } from '@/lib/seo/public';

export const Route = createFileRoute('/dpa')({
  head: () =>
    buildSeoHead({
      title: 'Data Processing Agreement | Comitium',
      description: 'The data processing terms for organizations using Comitium to manage recruitment data.',
      path: '/dpa',
    }),
  component: DpaPage,
});

function DpaPage() {
  return <LegalPage title="Data Processing Agreement" content={dpaContent} lastUpdated={LEGAL_EFFECTIVE_DATE} />;
}
