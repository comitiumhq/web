import { getErrorMessage } from './error';

export type JobError = ContractError | ValidationError | EncryptionError | SignatureError | TransactionError;

export function isJobError(error: unknown): error is JobError {
  return error instanceof Error && '_tag' in error;
}

export class ContractError extends Error {
  readonly _tag = 'ContractError';

  constructor(
    public readonly operation: string,
    public readonly cause: unknown,
  ) {
    super(`Contract operation failed: ${operation}`);
    this.name = 'ContractError';
  }
}

export class ValidationError extends Error {
  readonly _tag = 'ValidationError';

  constructor(
    public readonly field: string,
    public readonly reason: string,
  ) {
    super(`Validation failed: ${field} - ${reason}`);
    this.name = 'ValidationError';
  }
}

export class EncryptionError extends Error {
  readonly _tag = 'EncryptionError';

  constructor(
    public readonly step: 'encrypt_data' | 'encrypt_resume' | 'encrypt_attachments' | 'compute_hash',
    public readonly cause: unknown,
  ) {
    super(`Encryption failed at: ${step}`);
    this.name = 'EncryptionError';
  }
}

export class SignatureError extends Error {
  readonly _tag = 'SignatureError';

  constructor(
    public readonly httpStatus: number,
    public readonly message: string,
    public readonly apiCode?: string,
  ) {
    super(`Signature request failed: ${message}`);
    this.name = 'SignatureError';
  }
}

export class TransactionError extends Error {
  readonly _tag = 'TransactionError';

  constructor(
    public readonly operation: string,
    public readonly cause: unknown,
  ) {
    const causeMessage = getErrorMessage(cause, String(cause));
    super(`Transaction failed: ${operation} - ${causeMessage}`);
    this.name = 'TransactionError';
  }
}

export type ApplicationResult = { kind: 'completed' | 'confirmed' | 'confirming'; operationId: string };
