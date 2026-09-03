import { z } from 'zod';

import { isDefined, isRecord } from './guards';

export const API_ERROR_CODES = {
  noPipeline: 'NO_PIPELINE',
  stageConflict: 'STAGE_CONFLICT',
  templateNotActive: 'TEMPLATE_NOT_ACTIVE',
  availabilityConflict: 'AVAILABILITY_CONFLICT',
  recruitingPrivacyPolicyRequired: 'RECRUITING_PRIVACY_POLICY_REQUIRED',
  recruitingControllerNameRequired: 'RECRUITING_CONTROLLER_NAME_REQUIRED',
  aiCriteriaEvaluationPolicyChanged: 'AI_CRITERIA_EVALUATION_POLICY_CHANGED',
} as const;

export type ApiErrorCode = (typeof API_ERROR_CODES)[keyof typeof API_ERROR_CODES];

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly code?: string,
    public readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export function isApiError(error: unknown, predicate?: (error: ApiError) => boolean): error is ApiError {
  return error instanceof ApiError && (!predicate || predicate(error));
}

export function isTransientApiError(error: unknown): boolean {
  if (error instanceof TypeError || hasName(error, 'AbortError') || hasName(error, 'TimeoutError')) {
    return true;
  }

  return isApiError(error, ({ status }) => status === 429 || status >= 500);
}

export function hasApiErrorCode(error: unknown, code: ApiErrorCode | readonly ApiErrorCode[]): boolean {
  return isApiError(error, (apiError) => {
    if (Array.isArray(code)) {
      return isDefined(apiError.code) && code.includes(apiError.code as ApiErrorCode);
    }

    return apiError.code === code;
  });
}

export function hasApiErrorStatus(error: unknown, status: number): boolean {
  return isApiError(error, (apiError) => apiError.status === status);
}

export function getApiErrorStatus(error: unknown): number | null {
  if (error instanceof ApiError) {
    return error.status;
  }

  if (!isRecord(error)) {
    return null;
  }

  const httpStatus = z.number().safeParse(Reflect.get(error, 'httpStatus'));

  if (httpStatus.success) {
    return httpStatus.data;
  }

  return getApiErrorStatus(Reflect.get(error, 'cause'));
}

export function parseApiErrorPayload(data: unknown): {
  code?: string;
  details?: Record<string, unknown>;
  message: string;
} {
  if (!isRecord(data)) {
    return { message: 'Request failed' };
  }

  const error = Reflect.get(data, 'error');
  const stringError = z.string().safeParse(error);

  if (stringError.success) {
    return { message: stringError.data };
  }

  if (!isRecord(error)) {
    return { message: 'Request failed' };
  }

  const message = z.string().safeParse(Reflect.get(error, 'message'));
  const code = z.string().safeParse(Reflect.get(error, 'code'));
  const details = Reflect.get(error, 'details');

  return {
    message: message.success ? message.data : 'Request failed',
    ...(code.success ? { code: code.data } : {}),
    ...(isRecord(details) ? { details } : {}),
  };
}

function hasName(error: unknown, name: string): boolean {
  return isRecord(error) && Reflect.get(error, 'name') === name;
}
