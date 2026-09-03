import { httpsUrlSchema } from '@comitium/schemas/common';
import HorizontalRule from '@tiptap/extension-horizontal-rule';
import TextAlign from '@tiptap/extension-text-align';
import Typography from '@tiptap/extension-typography';
import Underline from '@tiptap/extension-underline';
import { Markdown, MarkdownManager } from '@tiptap/markdown';
import StarterKit from '@tiptap/starter-kit';

import { TokenNode } from './token-node';

export const EDITOR_EXTENSIONS = [
  StarterKit.configure({
    heading: { levels: [2, 3] },
    codeBlock: false,
    code: false,
    horizontalRule: false,
    underline: false,
    link: {
      defaultProtocol: 'https',
      isAllowedUri: (url) => httpsUrlSchema.safeParse(url).success,
    },
  }),
  Underline,
  HorizontalRule,
  TextAlign.configure({ types: ['heading', 'paragraph'] }),
  Typography,
  Markdown.configure({
    markedOptions: { gfm: true },
  }),
  TokenNode,
];

export const markdownManager = new MarkdownManager({
  extensions: EDITOR_EXTENSIONS,
  markedOptions: { gfm: true },
});
