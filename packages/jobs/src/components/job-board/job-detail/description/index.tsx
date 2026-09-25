import type { TipTapDoc } from '@comitium/schemas/common';
import { cn } from '@comitium/ui/cn';
import { MarkdownRenderer } from '@comitium/ui/markdown-renderer';
import { richTextToMarkdown } from '@comitium/ui/rich-text';

interface JobDescriptionProps {
  description: TipTapDoc | string;
  className?: string;
}

export function JobDescription({ description, className }: JobDescriptionProps) {
  const content = typeof description === 'string' ? description : richTextToMarkdown(description);

  return <MarkdownRenderer content={content} className={cn(className)} />;
}
