import type { TipTapDoc } from '@comitium/schemas/common';

/** Map of literal token string (e.g. `{{job_title}}`) to its resolved value. */
export type TokenValues = Record<string, string>;

/** Replace tokens in a plain string. Unknown tokens are left untouched. */
export function replaceTokensInText(text: string, values: TokenValues): string {
  let result = text;

  for (const [token, value] of Object.entries(values)) {
    result = result.replaceAll(token, value);
  }

  return result;
}

/**
 * Deep-clone a TipTap doc, resolving Token nodes and inline `{{...}}` strings.
 * Unknown tokens stay literal so recipients see the placeholder, not a gap.
 */
export function replaceTipTapTokens(doc: TipTapDoc, values: TokenValues): TipTapDoc {
  function replaceInNode(node: TipTapDoc): TipTapDoc {
    if (node.type === 'token' && typeof node.attrs?.token === 'string') {
      const name = node.attrs.token;

      return { type: 'text', text: values[name] ?? name };
    }

    const next = { ...node };

    if (next.type === 'text' && typeof next.text === 'string') {
      next.text = replaceTokensInText(next.text, values);
    }

    if (Array.isArray(next.content)) {
      next.content = next.content.map(replaceInNode);
    }

    return next;
  }

  return replaceInNode(doc);
}

/** Extract plain text from a TipTap doc. Token nodes render as their `{{...}}` literal. */
export function tipTapToPlainText(doc: TipTapDoc): string {
  const lines: string[] = [];

  function extract(node: TipTapDoc): string {
    if (node.type === 'text') {
      return node.text ?? '';
    }

    if (node.type === 'token' && typeof node.attrs?.token === 'string') {
      return node.attrs.token;
    }

    if (!node.content) {
      return '';
    }

    return node.content.map(extract).join('');
  }

  function walk(node: TipTapDoc): void {
    if (node.type === 'paragraph') {
      lines.push(extract(node));

      return;
    }

    if (node.type === 'listItem') {
      lines.push(`- ${extract(node)}`);

      return;
    }

    if (node.content) {
      for (const child of node.content) {
        walk(child);
      }
    }
  }

  if (!doc.content) {
    return '';
  }

  for (const node of doc.content) {
    walk(node);
  }

  return lines.join('\n');
}
