import { MarkdownRenderer } from '@comitium/ui/markdown-renderer';
import { PageContainer } from '@comitium/ui/page-container';

interface DocumentPageProps {
  content: string;
  meta?: string;
  title: string;
}

export function DocumentPage({ content, meta, title }: DocumentPageProps) {
  return (
    <PageContainer size="list" className="py-14 sm:py-20 lg:py-24">
      <header className="max-w-3xl">
        <h1 className="text-heading-40 tracking-[-0.03em] sm:text-heading-48">{title}</h1>
        {meta ? <p className="mt-5 text-copy-16 text-muted-foreground">{meta}</p> : null}
      </header>

      <article className="mt-12 max-w-3xl sm:mt-14">
        <MarkdownRenderer content={content} variant="document" />
      </article>
    </PageContainer>
  );
}
