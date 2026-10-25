import { CryptoProxy } from '@comitium/crypto';
import type { EncryptedEnvelope } from '@comitium/crypto/schemas';
import { afterEach, expect, it, vi } from 'vitest';
import { mockVaultAccess } from '@/test/crypto-helpers';
import { decryptFeedbackBuckets } from './decrypt-answers';

afterEach(() => vi.restoreAllMocks());

it('uses each bucket AAD after an Application move and a partial feedback edit', async () => {
  const decrypt = vi
    .spyOn(CryptoProxy, 'decryptApplication')
    .mockResolvedValueOnce({ standard: 'a' })
    .mockResolvedValueOnce({ private: 'b' });
  const envelope = { purpose: 'feedback_answers', keys: [] } as unknown as EncryptedEnvelope;
  const access = mockVaultAccess();
  const values = await decryptFeedbackBuckets(
    'org-1',
    'form-1',
    [
      { visibility: 'standard', cryptoSubjectId: 'current-application', answers: envelope },
      { visibility: 'private', cryptoSubjectId: 'original-application', answers: envelope },
    ],
    access,
  );

  expect(values).toEqual({ standard: 'a', private: 'b' });
  expect(decrypt.mock.calls.map((call) => call[3].subjectId)).toEqual(['current-application', 'original-application']);
});
