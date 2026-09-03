import { DocumentPage } from '@/components/document/document-page';

interface LegalPageProps {
  content: string;
  lastUpdated: string;
  title: string;
}

export function LegalPage({ content, lastUpdated, title }: LegalPageProps) {
  return <DocumentPage title={title} content={content} meta={`Last updated ${lastUpdated}`} />;
}
