import type { ContractError, TransactionError, ValidationError } from '@comitium/schemas/product-errors';

export type OrgError = ValidationError | ContractError | TransactionError;

export type CreateOrgWorkflowResult = { kind: 'confirming' };
