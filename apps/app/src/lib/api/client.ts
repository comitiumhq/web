import { ApiError, parseApiErrorPayload } from '@comitium/schemas/api-errors';
import type { z } from 'zod';
import { isDefined } from '@/lib/utils';

export {
  ApiError,
  getApiErrorStatus as getErrorStatus,
  hasApiErrorCode,
  hasApiErrorStatus,
  isApiError,
} from '@comitium/schemas/api-errors';

const API_URL = import.meta.env.VITE_API;
const API_REQUEST_TIMEOUT_MS = 30_000;
const FILE_UPLOAD_TOKEN_HEADER = 'Upload-Token';

function handleError(response: Response, data: unknown): never {
  const { message, code, details } = parseApiErrorPayload(data);

  throw new ApiError(response.status, message, code, details);
}

type ResponseSchema<T> = z.ZodType<T, unknown>;
type ApiRequestOptions = {
  signal?: AbortSignal;
};

function parseResponse<T>(data: unknown, schema?: ResponseSchema<T>): T {
  if (schema) {
    return schema.parse(data);
  }

  return data as T;
}

async function request<T>(
  url: string,
  method?: string,
  body?: unknown,
  schema?: ResponseSchema<T> | null,
  options?: ApiRequestOptions,
): Promise<T> {
  const response = await fetch(`${API_URL}${url}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: isDefined(body) ? JSON.stringify(body) : undefined,
    signal: options?.signal ?? AbortSignal.timeout(API_REQUEST_TIMEOUT_MS),
  });

  if (!response.ok) {
    const data = await response.json().catch(() => null);

    handleError(response, data);
  }

  if (schema === null) {
    return undefined as T;
  }

  return parseResponse(await response.json(), schema);
}

async function upload<T>(
  url: string,
  formData: FormData,
  schema?: ResponseSchema<T>,
  options?: ApiRequestOptions,
): Promise<T> {
  const response = await fetch(`${API_URL}${url}`, {
    method: 'POST',
    credentials: 'include',
    body: formData,
    signal: options?.signal ?? AbortSignal.timeout(API_REQUEST_TIMEOUT_MS),
  });

  if (!response.ok) {
    const data = await response.json().catch(() => null);

    handleError(response, data);
  }

  const data = await response.json();

  return parseResponse(data, schema);
}

async function getBinaryResponse(url: string): Promise<Response> {
  const response = await fetch(`${API_URL}${url}`, {
    credentials: 'include',
  });

  if (!response.ok) {
    const data = await response.json().catch(() => null);

    handleError(response, data);
  }

  return response;
}

async function getBlob(url: string): Promise<ArrayBuffer> {
  return (await getBinaryResponse(url)).arrayBuffer();
}

async function getFile(url: string): Promise<Blob> {
  return (await getBinaryResponse(url)).blob();
}

async function putBlob<T>(url: string, body: Blob, uploadToken: string, schema?: ResponseSchema<T>): Promise<T> {
  const response = await fetch(`${API_URL}${url}`, {
    method: 'PUT',
    headers: {
      [FILE_UPLOAD_TOKEN_HEADER]: uploadToken,
      'Content-Type': 'application/octet-stream',
    },
    credentials: 'include',
    body,
  });

  if (!response.ok) {
    const data = await response.json().catch(() => null);

    handleError(response, data);
  }

  return parseResponse(await response.json(), schema);
}

function deleteRequest<T>(url: string, schema?: ResponseSchema<T>): Promise<T>;

function deleteRequest<T>(url: string, body: unknown, schema: ResponseSchema<T>): Promise<T>;

function deleteRequest<T>(url: string, bodyOrSchema?: unknown, schema?: ResponseSchema<T>): Promise<T> {
  if (schema) {
    return request<T>(url, 'DELETE', bodyOrSchema, schema);
  }

  return request<T>(url, 'DELETE', undefined, bodyOrSchema as ResponseSchema<T> | undefined);
}

export const api = {
  get: <T>(url: string, schema?: ResponseSchema<T>, options?: ApiRequestOptions) =>
    request<T>(url, undefined, undefined, schema, options),
  post: <T>(url: string, body?: unknown, schema?: ResponseSchema<T> | null) => request<T>(url, 'POST', body, schema),
  put: <T>(url: string, body?: unknown, schema?: ResponseSchema<T>) => request<T>(url, 'PUT', body, schema),
  patch: <T>(url: string, body?: unknown, schema?: ResponseSchema<T>) => request<T>(url, 'PATCH', body, schema),
  delete: deleteRequest,
  upload: <T>(url: string, formData: FormData, schema?: ResponseSchema<T>, options?: ApiRequestOptions) =>
    upload<T>(url, formData, schema, options),
  putBlob,
  getBlob,
  getFile,
};
