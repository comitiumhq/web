import { describe, expect, it } from 'vitest';
import { decryptApplicationWithVaultKey, encryptApplicationWithVaultKey } from '../application-encryption';
import type { CryptoContextInput } from '../context';
import {
  decryptEmailContentWithUserKey,
  decryptEmailContentWithVaultKey,
  encryptEmailContent,
} from '../email-encryption';
import { decryptFileWithVaultKey, encryptFileWithVaultKey } from '../file-encryption';
import { applicantRecipient, orgVaultRecipient } from '../recipients';
import type { PublicEncryptionKey } from '../schemas';
import type { VaultKeyPair } from '../schemas/vault-key';
import { generateUserKeyPair } from '../user-key';
import { generateVaultKeyPair, grantVaultAccess, unwrapVaultKey, wrapSearchKey, wrapVaultKey } from '../vault-key';
import { sampleFormData, TEST_KEYS } from './crypto-helpers';

import { ORG_ID, OTHER_USER_ID, SEARCH_KEY, USER_ID } from './unlock-fixtures';

describe('crypto integration', () => {
  const applicationContext: CryptoContextInput = {
    purpose: 'application_answers',
    orgId: 'org-1',
    subjectId: 'application-1',
    fieldId: 'private_fields',
  };

  const resumeContext: CryptoContextInput = {
    purpose: 'encrypted_file',
    orgId: 'org-1',
    subjectId: 'application-1',
    fieldId: 'resume',
  };

  const emailContext: CryptoContextInput = {
    purpose: 'email_content',
    orgId: 'org-1',
    subjectId: 'thread-1',
    fieldId: 'email-1',
  };

  function emailRecipients(vaultPublicKey: PublicEncryptionKey, applicantPublicKey: PublicEncryptionKey) {
    return [orgVaultRecipient(vaultPublicKey, 1), applicantRecipient(applicantPublicKey, 1)];
  }

  describe('full apply flow: applicant submits → org decrypts', () => {
    it('encrypts form data and resume, org unwraps vault key and decrypts both', async () => {
      // --- Setup: Org creates vault key and wraps for owner ---
      const vault = generateVaultKeyPair();
      const ownerWrapped = await ownerAccess(vault);

      // --- Applicant encrypts form data with vault public key ---
      const formData = sampleFormData();
      const encryptedForm = await encryptApplicationWithVaultKey(vault.publicKey, 1, formData, applicationContext);

      // --- Applicant encrypts resume PDF ---
      const resumePdf = new Uint8Array(500);

      crypto.getRandomValues(resumePdf);

      const encryptedResume = await encryptFileWithVaultKey(vault.publicKey, 1, resumePdf, resumeContext);

      // --- Org owner unwraps vault key (requires user key) ---
      const vaultPrivateKey = await unwrapVaultKey(ownerWrapped, TEST_KEYS.alice.privateKey);

      // --- Org decrypts form data ---
      const decryptedForm = await decryptApplicationWithVaultKey(encryptedForm, vaultPrivateKey, applicationContext);

      expect(decryptedForm).toEqual(formData);

      // --- Org decrypts resume ---
      const decryptedResume = await decryptFileWithVaultKey(encryptedResume, vaultPrivateKey, resumeContext);

      expect(decryptedResume).toEqual(resumePdf);
    });
  });

  describe('full respond flow: org sends response → both decrypt', () => {
    it('encrypted email content is readable by both sides', async () => {
      // --- Setup ---
      const vault = generateVaultKeyPair();
      const applicant = generateUserKeyPair();

      // --- Org sends candidate email ---
      const emailContent = {
        text: 'Thank you for applying! We would like to schedule an interview.',
        status: 'accepted',
      };

      const encrypted = await encryptEmailContent(
        emailContent,
        emailContext,
        emailRecipients(vault.publicKey, applicant.publicKey),
      );

      // --- Org decrypts with vault key ---
      const orgDecrypted = await decryptEmailContentWithVaultKey(encrypted, vault.privateKey, emailContext);

      expect(orgDecrypted).toEqual(emailContent);

      // --- Applicant decrypts with user key ---
      const applicantDecrypted = await decryptEmailContentWithUserKey(encrypted, applicant.privateKey, emailContext);

      expect(applicantDecrypted).toEqual(emailContent);
    });
  });

  describe('vault key lifecycle: create → wrap → grant → use', () => {
    it('owner creates vault, grants to member, member decrypts application', async () => {
      // --- Org owner creates vault ---
      const vault = generateVaultKeyPair();

      // --- Owner wraps vault key for themselves ---
      const ownerWrapped = await ownerAccess(vault);

      // --- Owner grants access to Bob ---
      const bobWrapped = await grantVaultAccess(ownerWrapped, TEST_KEYS.alice.privateKey, TEST_KEYS.bob.publicKey, {
        recipientUserId: OTHER_USER_ID,
        recipientKeyVersion: 1,
      });

      // --- Applicant encrypts form data ---
      const formData = sampleFormData();
      const encrypted = await encryptApplicationWithVaultKey(vault.publicKey, 1, formData, applicationContext);

      // --- Owner decrypts ---
      const ownerVaultKey = await unwrapVaultKey(ownerWrapped, TEST_KEYS.alice.privateKey);
      const ownerDecrypted = await decryptApplicationWithVaultKey(encrypted, ownerVaultKey, applicationContext);

      expect(ownerDecrypted).toEqual(formData);

      // --- Bob decrypts ---
      const bobVaultKey = await unwrapVaultKey(
        { ...ownerWrapped, wrappedVaultKey: bobWrapped, recipientUserId: OTHER_USER_ID },
        TEST_KEYS.bob.privateKey,
      );
      const bobDecrypted = await decryptApplicationWithVaultKey(encrypted, bobVaultKey, applicationContext);

      expect(bobDecrypted).toEqual(formData);
    });
  });

  describe('key isolation', () => {
    it("different orgs cannot read each other's applications", async () => {
      const vault1 = generateVaultKeyPair();
      const vault2 = generateVaultKeyPair();

      const formData = sampleFormData();
      const encrypted = await encryptApplicationWithVaultKey(vault1.publicKey, 1, formData, applicationContext);

      // Org1 can decrypt
      const decrypted = await decryptApplicationWithVaultKey(encrypted, vault1.privateKey, applicationContext);

      expect(decrypted).toEqual(formData);

      // Org2 cannot
      await expect(decryptApplicationWithVaultKey(encrypted, vault2.privateKey, applicationContext)).rejects.toThrow();
    });

    it("applicant A cannot read applicant B's email content", async () => {
      const vault = generateVaultKeyPair();
      const applicantA = generateUserKeyPair();
      const applicantB = generateUserKeyPair();

      const emailContent = { text: 'Private message for A' };
      const encrypted = await encryptEmailContent(
        emailContent,
        emailContext,
        emailRecipients(vault.publicKey, applicantA.publicKey),
      );

      // A can decrypt
      const decryptedA = await decryptEmailContentWithUserKey(encrypted, applicantA.privateKey, emailContext);

      expect(decryptedA).toEqual(emailContent);

      // B cannot
      await expect(decryptEmailContentWithUserKey(encrypted, applicantB.privateKey, emailContext)).rejects.toThrow();
    });

    it('resume encrypted for org1 cannot be decrypted by org2', async () => {
      const vault1 = generateVaultKeyPair();
      const vault2 = generateVaultKeyPair();

      const resumePdf = new Uint8Array(256);

      crypto.getRandomValues(resumePdf);

      const blob = await encryptFileWithVaultKey(vault1.publicKey, 1, resumePdf, resumeContext);

      // Org1 can decrypt
      const decrypted = await decryptFileWithVaultKey(blob, vault1.privateKey, resumeContext);

      expect(decrypted).toEqual(resumePdf);

      // Org2 cannot
      await expect(decryptFileWithVaultKey(blob, vault2.privateKey, resumeContext)).rejects.toThrow();
    });
  });
});

async function ownerAccess(vault: VaultKeyPair) {
  const context = { orgId: ORG_ID, vaultKeyVersion: 1, recipientUserId: USER_ID, recipientKeyVersion: 1 };
  const wrappedVaultKey = await wrapVaultKey(vault.privateKey, TEST_KEYS.alice.publicKey, context);
  const searchKey = await wrapSearchKey(SEARCH_KEY, vault.privateKey, {
    orgId: ORG_ID,
    vaultKeyVersion: 1,
    searchKeyVersion: 1,
  });

  return { ...context, wrappedVaultKey, searchKey, vaultPublicKey: vault.publicKey };
}
