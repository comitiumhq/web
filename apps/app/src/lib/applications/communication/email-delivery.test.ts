import { CryptoProxy } from '@comitium/crypto';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { mockPublicEncryptionKey } from '@/test/crypto-helpers';
import { prepareEncryptedEmailDeliveryWithGrant } from './email-delivery';

const publicKey = mockPublicEncryptionKey();
const grant = { id: 'grant-1', recipient: 'processor:grant-1', processorPublicKey: publicKey };
const draft = {
  applicationId: 'application-1',
  orgId: 'org-1',
  vaultPublicKey: publicKey,
  vaultKeyVersion: 3,
  applicantPublicKey: publicKey,
  applicantKeyVersion: 7,
  applicantEmail: 'candidate@example.test',
  subject: 'Interview',
  messageDoc: { type: 'doc', content: [] },
  messageHtml: '<p>Interview</p>',
};

afterEach(() => vi.restoreAllMocks());

describe('email recipient generations', () => {
  it.each([true, false])('passes current applicant generation only when personal keys exist (%s)', async (hasKeys) => {
    const encrypt = vi
      .spyOn(CryptoProxy, 'encryptEmailContentWithOverlays')
      .mockRejectedValue(new Error('Stop before encryption'));

    await expect(
      prepareEncryptedEmailDeliveryWithGrant(
        {
          ...draft,
          applicantPublicKey: hasKeys ? publicKey : null,
          applicantKeyVersion: hasKeys ? 7 : null,
        },
        grant,
      ),
    ).rejects.toThrow('Stop before encryption');

    const recipients = encrypt.mock.calls[0][2];
    expect(recipients.map(({ recipient, keyVersion }) => ({ recipient, keyVersion }))).toEqual([
      { recipient: 'org_vault', keyVersion: 3 },
      ...(hasKeys ? [{ recipient: 'applicant', keyVersion: 7 }] : []),
    ]);
  });

  it('rejects missing generation metadata instead of silently encrypting to generation one', async () => {
    const encrypt = vi.spyOn(CryptoProxy, 'encryptEmailContentWithOverlays');

    await expect(
      prepareEncryptedEmailDeliveryWithGrant({ ...draft, applicantKeyVersion: null }, grant),
    ).rejects.toThrow('Applicant key and generation must be supplied together');
    expect(encrypt).not.toHaveBeenCalled();
  });
});
