import {
  ApplicationRequestError,
  EncryptionError,
  ValidationError,
  VaultError,
} from '@comitium/schemas/product-errors';
import { describe, expect, it } from 'vitest';

import { getCommonErrorMessage, getProductErrorMessage } from './product-error-messages';

describe('error-messages', () => {
  describe('getProductErrorMessage', () => {
    it('does not expose an unknown infrastructure error', () => {
      expect(getProductErrorMessage(new Error('provider_task_not_found'), 'This action could not be confirmed.')).toBe(
        'This action could not be confirmed.',
      );
    });
  });

  describe('getCommonErrorMessage', () => {
    it('ValidationError includes reason', () => {
      const err = new ValidationError('title', 'Title is required');
      const msg = getCommonErrorMessage(err);

      expect(msg).toContain('Title is required');
    });

    it('ApplicationRequestError does not expose transport copy', () => {
      const err = new ApplicationRequestError(400, 'Invalid application data');
      const msg = getCommonErrorMessage(err);

      expect(msg).toBe('This action could not be prepared. Please try again.');
    });

    it('EncryptionError', () => {
      const err = new EncryptionError('encrypt_data', new Error('bad key'));
      const msg = getCommonErrorMessage(err);

      expect(msg).toBe('Failed to encrypt data. Please try again.');
    });

    it('VaultError does not expose vault operation details', () => {
      const err = new VaultError('load_vault', new Error('request failed'));
      const msg = getCommonErrorMessage(err);

      expect(msg).toBe('Could not prepare this action. Please try again.');
    });
  });
});
