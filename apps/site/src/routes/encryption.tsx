import { createFileRoute } from '@tanstack/react-router';

import { DocumentPage } from '@/components/document/document-page';
import encryptionContent from '@/content/encryption.md?raw';
import { buildSeoHead } from '@/lib/seo/public';

export const Route = createFileRoute('/encryption')({
  head: () =>
    buildSeoHead({
      title: 'Encryption | Comitium',
      description: 'How Comitium protects sensitive recruitment records while keeping professional data searchable.',
      path: '/encryption',
    }),
  component: EncryptionPage,
});

function EncryptionPage() {
  return <DocumentPage title="Encryption" content={encryptionContent} />;
}
