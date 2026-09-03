import { mergeAttributes, Node } from '@tiptap/core';

/**
 * Inline atom representing a substitution token (e.g. `{{candidate_first_name}}`).
 * Cursor treats it as a single unit — one backspace deletes the whole token.
 * Generic by design: the same node powers email templates today and any future
 * surface that needs `{{...}}` placeholders (notifications, scorecards, etc.).
 */
export const TokenNode = Node.create({
  name: 'token',
  inline: true,
  group: 'inline',
  atom: true,
  selectable: true,
  draggable: false,

  addAttributes() {
    return {
      token: {
        default: null,
        parseHTML: (el) => el.getAttribute('data-token'),
        renderHTML: (attrs) => (attrs.token ? { 'data-token': attrs.token } : {}),
      },
      label: {
        default: null,
        parseHTML: (el) => el.getAttribute('data-label'),
        renderHTML: (attrs) => (attrs.label ? { 'data-label': attrs.label } : {}),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'span[data-token]' }];
  },

  renderHTML({ HTMLAttributes, node }) {
    return [
      'span',
      mergeAttributes(HTMLAttributes, { class: 'tiptap-token', 'data-type': 'token' }),
      String(node.attrs.token ?? ''),
    ];
  },

  renderText({ node }) {
    return String(node.attrs.token ?? '');
  },
});
