import type { Components } from 'react-markdown';
import ReactMarkdown from 'react-markdown';

import { cn } from '../lib/cn';

const defaultComponents: Components = {
  h2: ({ children }) => <h2 className="text-heading-16 font-semibold mb-2">{children}</h2>,
  h3: ({ children }) => <h3 className="text-heading-16 font-semibold mt-4 mb-1.5">{children}</h3>,
  p: ({ children }) => <p className="mb-3 leading-relaxed">{children}</p>,
  ul: ({ children }) => <ul className="mb-3 list-disc pl-5">{children}</ul>,
  ol: ({ children }) => <ol className="mb-3 list-decimal pl-5">{children}</ol>,
  li: ({ children }) => <li className="mb-1">{children}</li>,
  a: ({ href, children }) => (
    <a
      href={href}
      className="text-primary underline underline-offset-2 hover:opacity-80"
      target="_blank"
      rel="noopener noreferrer"
    >
      {children}
    </a>
  ),
  strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
  blockquote: ({ children }) => (
    <blockquote className="border-l-2 border-border pl-4 italic text-muted-foreground my-3">{children}</blockquote>
  ),
  hr: () => <hr className="my-4 border-border" />,
};

const documentComponents: Components = {
  h2: ({ children }) => <h2 className="mt-14 text-heading-26 text-foreground first:mt-0">{children}</h2>,
  h3: ({ children }) => <h3 className="mt-8 text-heading-20 text-foreground">{children}</h3>,
  p: ({ children }) => <p className="mt-5 text-pretty">{children}</p>,
  ul: ({ children }) => <ul className="mt-5 ml-5 list-disc space-y-3">{children}</ul>,
  ol: ({ children }) => <ol className="mt-5 ml-5 list-decimal space-y-3">{children}</ol>,
  li: ({ children }) => <li className="pl-1 marker:text-foreground/70">{children}</li>,
  a: ({ href, children }) => (
    <a
      href={href}
      className="font-medium text-primary transition-colors hover:text-primary/80"
      target={href?.startsWith('http') ? '_blank' : undefined}
      rel={href?.startsWith('http') ? 'noopener noreferrer' : undefined}
    >
      {children}
    </a>
  ),
  strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
};

interface MarkdownRendererProps {
  content: string;
  className?: string;
  variant?: 'default' | 'document';
}

export function MarkdownRenderer({ content, className, variant = 'default' }: MarkdownRendererProps) {
  const isDocument = variant === 'document';

  return (
    <div className={cn(isDocument ? 'text-copy-18 text-foreground/85' : 'text-copy-14', className)}>
      <ReactMarkdown components={isDocument ? documentComponents : defaultComponents}>{content}</ReactMarkdown>
    </div>
  );
}
