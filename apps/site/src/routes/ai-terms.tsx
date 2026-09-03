import { createFileRoute } from '@tanstack/react-router';

import { LegalPage } from '@/components/legal/legal-page';
import aiTermsContent from '@/content/legal/ai-terms.md?raw';
import { LEGAL_EFFECTIVE_DATE } from '@/content/legal/version';
import { buildSeoHead } from '@/lib/seo/public';

export const Route = createFileRoute('/ai-terms')({
  head: () =>
    buildSeoHead({
      title: 'AI Feature Terms | Comitium',
      description: 'Additional terms for organizations that enable or use AI-assisted features in Comitium.',
      path: '/ai-terms',
    }),
  component: AiFeatureTermsPage,
});

function AiFeatureTermsPage() {
  return <LegalPage title="AI Feature Terms" content={aiTermsContent} lastUpdated={LEGAL_EFFECTIVE_DATE} />;
}
