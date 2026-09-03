import { cn } from '@comitium/ui/cn';
import { MarkdownRenderer } from '@comitium/ui/markdown-renderer';

interface JobDescriptionProps {
  description: string;
  className?: string;
}

export function JobDescription({ description, className }: JobDescriptionProps) {
  return <MarkdownRenderer content={description} className={cn(className)} />;
}
