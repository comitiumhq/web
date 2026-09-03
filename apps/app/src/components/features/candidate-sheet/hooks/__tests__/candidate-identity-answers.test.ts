import { describe, expect, it } from 'vitest';

import { mergeApplicationAnswers } from '@/lib/forms/application-answers';

describe('candidate identity answers', () => {
  it('projects identity slots into their form question values', () => {
    expect(
      mergeApplicationAnswers(
        { firstName: 'Ada', emailQuestion: 'stale@example.com' },
        { emailQuestion: 'ada@example.com', githubQuestion: 'ada' },
      ),
    ).toEqual({ firstName: 'Ada', emailQuestion: 'ada@example.com', githubQuestion: 'ada' });
  });

  it('preserves the original answer object when no identities are available', () => {
    const answers = { firstName: 'Ada' };

    expect(mergeApplicationAnswers(answers, undefined)).toBe(answers);
  });
});
