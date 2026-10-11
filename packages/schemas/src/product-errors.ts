export type JobError = VaultError | ValidationError | EncryptionError | ApplicationRequestError;

export function isJobError(error: unknown): error is JobError {
  return error instanceof Error && '_tag' in error;
}

export class VaultError extends Error {
  readonly _tag = 'VaultError';

  constructor(
    public readonly operation: string,
    public readonly cause: unknown,
  ) {
    super(`Vault operation failed: ${operation}`);
    this.name = 'VaultError';
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

export class ApplicationRequestError extends Error {
  readonly _tag = 'ApplicationRequestError';

  constructor(
    public readonly httpStatus: number,
    public readonly message: string,
    public readonly apiCode?: string,
  ) {
    super(`Application request failed: ${message}`);
    this.name = 'ApplicationRequestError';
  }
}

export type ApplicationResult = { kind: 'completed' };
