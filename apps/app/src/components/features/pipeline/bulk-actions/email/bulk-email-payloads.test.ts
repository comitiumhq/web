import type { PublicEncryptionKey } from '@comitium/crypto';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PipelineBulkTarget } from '../model';

const mocks = vi.hoisted(() => ({
  prepareEncryptedEmailDeliveryWithGrant: vi.fn(),
}));

vi.mock('@/lib/applications/communication/email-delivery', () => ({
  prepareEncryptedEmailDeliveryWithGrant: mocks.prepareEncryptedEmailDeliveryWithGrant,
}));

import { prepareBulkEmailPayloads } from './bulk-email-payloads';

const publicKey = { v: 1, xwing: 'public-key' } as PublicEncryptionKey;
const draft = {
  subject: 'Update for {{candidate_first_name}}',
  messageDoc: {
    type: 'doc',
    content: [{ type: 'paragraph', content: [{ type: 'text', text: 'About {{job_title}}' }] }],
  },
  messageHtml: '<p>About {{job_title}}</p>',
  emailTemplateId: 'template-1',
  companyName: 'Comitium',
  senderName: 'Recruiter',
};

function target(
  id: string,
  firstName: string,
  overrides: { email?: string | null; recipientPublicKey?: PublicEncryptionKey | null } = {},
): PipelineBulkTarget {
  const applicationId = `application-${id}`;
  const recipientPublicKey = overrides.recipientPublicKey === undefined ? publicKey : overrides.recipientPublicKey;

  return {
    item: {
      id: `item-${id}`,
      ordinal: Number(id),
      selectedTargetId: applicationId,
      status: 'ready',
      exclusion: null,
      error: null,
      application: {
        applicationId,
        candidateId: `candidate-${id}`,
        jobId: `job-${id}`,
        jobTitle: `Role ${id}`,
        requiresEmail: true,
        childOperationId: null,
        recipientPublicKey,
        deliveryGrant: {
          id: `grant-${id}`,
          recipient: `processor:grant-${id}`,
          processorPublicKey: publicKey,
          expiresAt: '2026-09-01T00:00:00.000Z',
        },
      },
      completedAt: null,
    },
    application: {
      applicationId,
      candidateId: `candidate-${id}`,
      jobId: `job-${id}`,
      jobTitle: `Role ${id}`,
      requiresEmail: true,
      childOperationId: null,
      recipientPublicKey,
      deliveryGrant: {
        id: `grant-${id}`,
        recipient: `processor:grant-${id}`,
        processorPublicKey: publicKey,
        expiresAt: '2026-09-01T00:00:00.000Z',
      },
    },
    pipelineApplication: {
      id: applicationId,
      candidateId: `candidate-${id}`,
      jobTitle: `Role ${id}`,
      currentStageName: 'Review',
    } as PipelineBulkTarget['pipelineApplication'],
    profile: {
      firstName,
      email: overrides.email === undefined ? `${firstName.toLowerCase()}@example.com` : overrides.email,
    } as PipelineBulkTarget['profile'],
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.prepareEncryptedEmailDeliveryWithGrant.mockImplementation(async (input, grant) => ({
    content: { subject: input.subject },
    deliveryGrant: {
      deliveryGrantId: grant.id,
      deliveryGrantKey: { recipient: grant.recipient },
    },
  }));
});

describe('prepareBulkEmailPayloads', () => {
  it('personalizes and encrypts one independent payload per recipient', async () => {
    const result = await prepareBulkEmailPayloads({
      targets: [target('1', 'Ada'), target('2', 'Grace')],
      draft,
      orgId: 'org-1',
      vaultKey: { vaultPublicKey: publicKey, keyVersion: 3 },
      purpose: 'send',
    });

    expect(result.error).toBeNull();
    expect(result.excludedItemIds).toEqual([]);
    expect(result.payloads.map((payload) => payload.itemId)).toEqual(['item-1', 'item-2']);
    expect(mocks.prepareEncryptedEmailDeliveryWithGrant).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        applicationId: 'application-1',
        applicantEmail: 'ada@example.com',
        subject: 'Update for Ada',
        messageHtml: '<p>About Role 1</p>',
      }),
      expect.objectContaining({ id: 'grant-1' }),
    );
    expect(mocks.prepareEncryptedEmailDeliveryWithGrant).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ subject: 'Update for Grace', messageHtml: '<p>About Role 2</p>' }),
      expect.objectContaining({ id: 'grant-2' }),
    );
  });

  it('excludes only recipients whose contact or encryption material is unavailable', async () => {
    const result = await prepareBulkEmailPayloads({
      targets: [target('1', 'Ada', { email: null }), target('2', 'Grace')],
      draft,
      orgId: 'org-1',
      vaultKey: { vaultPublicKey: publicKey, keyVersion: 3 },
      purpose: 'send',
    });

    expect(result).toMatchObject({ error: null, excludedItemIds: ['item-1'] });
    expect(result.payloads.map((payload) => payload.itemId)).toEqual(['item-2']);
    expect(mocks.prepareEncryptedEmailDeliveryWithGrant).toHaveBeenCalledTimes(1);
  });

  it('prepares vault delivery for a sourced candidate without an applicant public key', async () => {
    const result = await prepareBulkEmailPayloads({
      targets: [target('1', 'Ada', { recipientPublicKey: null })],
      draft,
      orgId: 'org-1',
      vaultKey: { vaultPublicKey: publicKey, keyVersion: 3 },
      purpose: 'send',
    });

    expect(result.error).toBeNull();
    expect(result.excludedItemIds).toEqual([]);
    expect(result.payloads.map((payload) => payload.itemId)).toEqual(['item-1']);
    expect(mocks.prepareEncryptedEmailDeliveryWithGrant).toHaveBeenCalledWith(
      expect.objectContaining({ applicantPublicKey: null, applicantEmail: 'ada@example.com' }),
      expect.objectContaining({ id: 'grant-1' }),
    );
  });

  it('blocks the whole submission when personalization leaves an unresolved token', async () => {
    const result = await prepareBulkEmailPayloads({
      targets: [target('1', 'Ada')],
      draft: { ...draft, subject: 'Update for {{unknown_token}}' },
      orgId: 'org-1',
      vaultKey: { vaultPublicKey: publicKey, keyVersion: 3 },
      purpose: 'archive',
    });

    expect(result).toEqual({
      payloads: [],
      excludedItemIds: [],
      error: '1 email has unresolved personalization tokens. Edit the draft before archiving.',
    });
    expect(mocks.prepareEncryptedEmailDeliveryWithGrant).not.toHaveBeenCalled();
  });
});
