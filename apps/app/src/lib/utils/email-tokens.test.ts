import { describe, expect, it } from 'vitest';
import { containsUnresolvedTemplateToken, renderEmailHtml, renderEmailTemplate } from './email-tokens';

describe('bulk-safe email token rendering', () => {
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
});
