import { describe, expect, it } from 'vitest';
import { appendSignature, containsUnresolvedTemplateToken, renderEmailHtml, renderEmailTemplate } from './email-tokens';

describe('email composition utilities', () => {
  it('resolves each recipient context independently', () => {
    const template = {
      subject: 'Update for {{candidate_first_name}} — {{job_title}}',
      body: {
        type: 'doc',
        content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Hi {{candidate_first_name}}' }] }],
      },
    };

    expect(renderEmailTemplate(template, { candidateFirstName: 'Ada', jobTitle: 'Engineer' }).subject).toBe(
      'Update for Ada — Engineer',
    );
    expect(renderEmailTemplate(template, { candidateFirstName: 'Grace', jobTitle: 'Researcher' }).subject).toBe(
      'Update for Grace — Researcher',
    );
  });

  it('escapes personalized values before inserting them into editor HTML', () => {
    expect(
      renderEmailHtml('<p>Hello {{candidate_first_name}}</p>', {
        candidateFirstName: '<img src=x onerror=alert(1)>',
      }),
    ).toBe('<p>Hello &lt;img src=x onerror=alert(1)&gt;</p>');
  });

  it('detects unresolved placeholders, including unknown template tokens', () => {
    expect(containsUnresolvedTemplateToken('Hello {{unknown_token}}')).toBe(true);
    expect(containsUnresolvedTemplateToken('Hello Ada')).toBe(false);
  });

  it('appends signature paragraphs as compact lines', () => {
    const body = {
      type: 'doc',
      content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Thanks for applying.' }] }],
    };
    const signature = {
      type: 'doc',
      content: [
        { type: 'paragraph', content: [{ type: 'text', text: 'Illia Yablonski' }] },
        { type: 'paragraph', content: [{ type: 'text', text: 'Founder, Comitium' }] },
        { type: 'paragraph', content: [{ type: 'text', text: 'comitium.co' }] },
      ],
    };

    expect(appendSignature(body, signature)).toEqual({
      type: 'doc',
      content: [
        { type: 'paragraph', content: [{ type: 'text', text: 'Thanks for applying.' }] },
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: 'Illia Yablonski' },
            { type: 'hardBreak' },
            { type: 'text', text: 'Founder, Comitium' },
            { type: 'hardBreak' },
            { type: 'text', text: 'comitium.co' },
          ],
        },
      ],
    });
  });
});
