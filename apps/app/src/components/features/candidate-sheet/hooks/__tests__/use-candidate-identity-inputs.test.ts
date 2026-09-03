import { CryptoProxy } from '@comitium/crypto';
import type { EncryptedEnvelope } from '@comitium/crypto/schemas';
import { describe, expect, it, vi } from 'vitest';
import { decryptCandidateIdentityInputs } from '@/hooks/use-candidate-identity-inputs';
import { mockWrappedKey } from '@/test/crypto-helpers';

describe('candidate identity inputs', () => {
  it('decrypts identity slots into form answers through their application-bound contexts', async () => {
    const decrypt = vi.spyOn(CryptoProxy, 'decryptApplication').mockResolvedValue({
      value: 'applicant@example.com',
    });
    const envelope = { purpose: 'candidate_identity_input', keys: [] } as unknown as EncryptedEnvelope;
    const wrappedVaultKey = mockWrappedKey();
    const identities = await decryptCandidateIdentityInputs({
      candidateIdentityInputs: [
        {
          applicationId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
          questionId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
          envelope,
        },
      ],
      orgId: 'org-1',
      wrappedVaultKey,
    });

    expect(identities).toEqual({
      'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb': 'applicant@example.com',
    });
    expect(decrypt).toHaveBeenCalledWith(envelope, 'org-1', wrappedVaultKey, {
      purpose: 'candidate_identity_input',
      orgId: 'org-1',
      subjectId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      fieldId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    });
  });
});
