import type { TipTapDoc } from '@comitium/schemas/common';

const TOKEN_PATTERN = /\{\{[a-z_][a-z0-9_]*\}\}/g;

/**
 * Convert `{{...}}` substrings in text nodes into atomic Token nodes. Idempotent
 * — already-converted Token nodes pass through unchanged. Call on initial load
 * so docs stored as plain text render as chips.
 */
export function normalizeTokensInDoc(doc: TipTapDoc): TipTapDoc {
  return processNode(doc) as TipTapDoc;
}

function processNode(node: TipTapDoc): TipTapDoc | TipTapDoc[] {
  if (node.type === 'text' && typeof node.text === 'string') {
    return splitTextNode(node);
  }

  if (Array.isArray(node.content)) {
    const newContent: TipTapDoc[] = [];

    for (const child of node.content) {
      const processed = processNode(child);

      if (Array.isArray(processed)) {
        newContent.push(...processed);
      } else {
        newContent.push(processed);
      }
    }

    return { ...node, content: newContent };
  }

  return node;
}

function splitTextNode(node: TipTapDoc): TipTapDoc | TipTapDoc[] {
  const text = node.text ?? '';
  const matches = Array.from(text.matchAll(TOKEN_PATTERN));

  if (matches.length === 0) {
    return node;
  }

  const result: TipTapDoc[] = [];
  let lastIndex = 0;

  for (const match of matches) {
    const start = match.index ?? 0;
    const end = start + match[0].length;

    if (start > lastIndex) {
      result.push({ type: 'text', text: text.slice(lastIndex, start), marks: node.marks });
    }

    result.push({ type: 'token', attrs: { token: match[0] } });
    lastIndex = end;
  }

  if (lastIndex < text.length) {
    result.push({ type: 'text', text: text.slice(lastIndex), marks: node.marks });
  }

  return result;
}
