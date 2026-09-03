import {
  ContractError,
  EncryptionError,
  SignatureError,
  TransactionError,
  ValidationError,
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

    it('maps a transaction error through product copy', () => {
      expect(getProductErrorMessage(new TransactionError('job_funds_deposit', new Error('RPC unavailable')), 'x')).toBe(
        'Could not submit this action. Please try again.',
      );
    });
  });

  describe('getCommonErrorMessage', () => {
    it('ValidationError includes reason', () => {
      const err = new ValidationError('title', 'Title is required');
      const msg = getCommonErrorMessage(err);

      expect(msg).toContain('Title is required');
    });

    it('TransactionError with "rejected" message', () => {
      const err = new TransactionError('apply', 'User rejected the request');
      const msg = getCommonErrorMessage(err);

      expect(msg).toBe('Wallet request was rejected');
    });

    it('TransactionError with other message uses product copy', () => {
      const err = new TransactionError('createJob', 'gas estimation failed');
      const msg = getCommonErrorMessage(err);

      expect(msg).toBe('Could not submit this action. Please try again.');
    });

    it('SignatureError does not expose transport copy', () => {
      const err = new SignatureError(400, 'Invalid application data');
      const msg = getCommonErrorMessage(err);

      expect(msg).toBe('Wallet confirmation could not be prepared. Please try again.');
    });

    it('EncryptionError', () => {
      const err = new EncryptionError('encrypt_data', new Error('bad key'));
      const msg = getCommonErrorMessage(err);

      expect(msg).toBe('Failed to encrypt data. Please try again.');
    });

    it('ContractError does not expose the contract operation', () => {
      const err = new ContractError('read_stake_token', new Error('rpc'));
      const msg = getCommonErrorMessage(err);

      expect(msg).toBe('Could not prepare this action. Please try again.');
    });

    it('TransactionError with null cause', () => {
      const err = new TransactionError('apply', null);
      const msg = getCommonErrorMessage(err);

      expect(msg).toBe('Could not submit this action. Please try again.');
    });

    it('TransactionError with "rejected" anywhere in message', () => {
      const err = new TransactionError('apply', 'MetaMask Tx Signature: User rejected the request.');
      const msg = getCommonErrorMessage(err);

      expect(msg).toBe('Wallet request was rejected');
    });
  });
});
