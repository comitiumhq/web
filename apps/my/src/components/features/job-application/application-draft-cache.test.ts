import { describe, expect, it } from 'vitest';
import {
  clearApplicationDraft,
  createApplicationDraftKey,
  readApplicationDraft,
  writeApplicationDraft,
} from './application-draft-cache';

const form = {
  form: { id: 'form-2' },
  sections: [{ id: 'section-1', questions: [{ id: 'name' }, { id: 'email' }] }],
} as Parameters<typeof readApplicationDraft>[1];

describe('application draft cache', () => {
  it('keeps only defined answers for the active form until cleared', () => {
    const key = createApplicationDraftKey('account-1', 'posting-2', 'form-2');

    writeApplicationDraft(key, { name: 'Ada', email: undefined, staleQuestion: 'ignored' });

    expect(readApplicationDraft(key, form)).toEqual({ name: 'Ada' });
    clearApplicationDraft(key);

    expect(readApplicationDraft(key, form)).toEqual({});
  });

  it('isolates drafts for different global accounts in the same browser session', () => {
    const firstAccountKey = createApplicationDraftKey('account-1', 'posting-2', 'form-2');
    const secondAccountKey = createApplicationDraftKey('account-2', 'posting-2', 'form-2');

    writeApplicationDraft(firstAccountKey, { name: 'Ada' });

    expect(readApplicationDraft(secondAccountKey, form)).toEqual({});
  });
});
