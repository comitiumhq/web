import type { TipTapDoc } from '@comitium/schemas/common';
import { markdownManager } from '@/lib/tiptap/extensions';

export const EMPTY_JOB_DESCRIPTION: TipTapDoc = {
  type: 'doc',
  content: [{ type: 'paragraph' }],
};

export function parseJobDescription(markdown: string | null): TipTapDoc {
  if (!markdown) {
    return EMPTY_JOB_DESCRIPTION;
  }

  try {
    return markdownManager.parse(markdown) as TipTapDoc;
  } catch {
    return EMPTY_JOB_DESCRIPTION;
  }
}

export function serializeJobDescription(description: TipTapDoc | null): string {
  if (!description) {
    return '';
  }

  try {
    return markdownManager.serialize(description).trim();
  } catch {
    return '';
  }
}
