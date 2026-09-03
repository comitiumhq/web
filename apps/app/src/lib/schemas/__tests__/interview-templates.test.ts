import { describe, expect, it } from 'vitest';

import { interviewTemplateInstructionsFieldSchema } from '../interview-templates';

describe('interview template instructions contract', () => {
  it('accepts a structured TipTap document', () => {
    const instructions = {
      type: 'doc',
      content: [
        { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'System design' }] },
        {
          type: 'bulletList',
          content: [
            {
              type: 'listItem',
              content: [
                {
                  type: 'paragraph',
                  content: [{ type: 'text', marks: [{ type: 'bold' }], text: 'Ask about trade-offs' }],
                },
              ],
            },
          ],
        },
      ],
    };

    expect(interviewTemplateInstructionsFieldSchema.parse(instructions)).toEqual(instructions);
  });

  it('rejects the legacy plain-text shape', () => {
    expect(interviewTemplateInstructionsFieldSchema.safeParse('Ask about trade-offs').success).toBe(false);
  });
});
