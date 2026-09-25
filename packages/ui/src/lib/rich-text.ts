import { httpsUrlSchema, type TipTapDoc } from '@comitium/schemas/common';
import { generateText, type JSONContent } from '@tiptap/core';
import HorizontalRule from '@tiptap/extension-horizontal-rule';
import TextAlign from '@tiptap/extension-text-align';
import Typography from '@tiptap/extension-typography';
import Underline from '@tiptap/extension-underline';
import { Markdown, MarkdownManager } from '@tiptap/markdown';
import StarterKit from '@tiptap/starter-kit';

export const JOB_DESCRIPTION_EXTENSIONS = [
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
  Markdown.configure({ markedOptions: { gfm: true } }),
];

const markdownManager = new MarkdownManager({
  extensions: JOB_DESCRIPTION_EXTENSIONS,
  markedOptions: { gfm: true },
});

export function richTextToMarkdown(document: TipTapDoc | null): string {
  return document ? markdownManager.serialize(document).trim() : '';
}

export function richTextToPlainText(document: TipTapDoc | null): string {
  return document
    ? generateText(document as JSONContent, JOB_DESCRIPTION_EXTENSIONS, { blockSeparator: '\n' }).trim()
    : '';
}
