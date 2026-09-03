import { ApiError, parseApiErrorPayload } from '@comitium/schemas/api-errors';
import { isDefined } from '@comitium/schemas/guards';
import type { z } from 'zod';

const API_URL = import.meta.env.VITE_API;
const API_REQUEST_TIMEOUT_MS = 30_000;
const FILE_UPLOAD_TOKEN_HEADER = 'Upload-Token';

type ApiAuthTokens = {
  accessToken: string | null;
  identityToken: string | null;
};

type ApiAuthTokenProvider = () => Promise<ApiAuthTokens>;

let apiAuthTokenProvider: ApiAuthTokenProvider | null = null;

export function registerApiAuthTokenProvider(provider: ApiAuthTokenProvider): () => void {
  apiAuthTokenProvider = provider;

  return () => {
    if (apiAuthTokenProvider === provider) {
      apiAuthTokenProvider = null;
    }
  };
}

async function getApiAuthTokens(): Promise<ApiAuthTokens | null> {
  if (!apiAuthTokenProvider) {
    return null;
  }

  return apiAuthTokenProvider();
}

function handleError(response: Response, data: unknown): never {
  const { message, code, details } = parseApiErrorPayload(data);

  throw new ApiError(response.status, message, code, details);
}

type ResponseSchema<T> = z.ZodType<T, unknown>;
type ApiRequestOptions = {
  signal?: AbortSignal;
  auth?: 'none';
};

function parseResponse<T>(data: unknown, schema?: ResponseSchema<T>): T {
  if (schema) {
    return schema.parse(data);
  }

  return data as T;
}

async function createRequestHeaders(initialHeaders?: HeadersInit, auth?: ApiRequestOptions['auth']): Promise<Headers> {
  const headers = new Headers(initialHeaders);
  const tokens = auth === 'none' ? null : await getApiAuthTokens();

  if (!headers.has('Authorization') && tokens?.accessToken) {
    headers.set('Authorization', `Bearer ${tokens.accessToken}`);
  }

  if (tokens?.identityToken) {
    headers.set('privy-id-token', tokens.identityToken);
  }

  return headers;
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
    headers: await createRequestHeaders({ 'Content-Type': 'application/json' }, options?.auth),
    credentials: options?.auth === 'none' ? 'omit' : 'include',
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
    headers: await createRequestHeaders(),
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

async function getBlob(url: string): Promise<ArrayBuffer> {
  const response = await fetch(`${API_URL}${url}`, {
    headers: await createRequestHeaders(),
    credentials: 'include',
  });

  if (!response.ok) {
    const data = await response.json().catch(() => null);

    handleError(response, data);
  }

  return response.arrayBuffer();
}

async function putBlob<T>(url: string, body: Blob, uploadToken: string, schema?: ResponseSchema<T>): Promise<T> {
  const response = await fetch(`${API_URL}${url}`, {
    method: 'PUT',
    headers: await createRequestHeaders({
      [FILE_UPLOAD_TOKEN_HEADER]: uploadToken,
      'Content-Type': 'application/octet-stream',
    }),
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
  post: <T>(url: string, body?: unknown, schema?: ResponseSchema<T> | null, options?: ApiRequestOptions) =>
    request<T>(url, 'POST', body, schema, options),
  put: <T>(url: string, body?: unknown, schema?: ResponseSchema<T>) => request<T>(url, 'PUT', body, schema),
  patch: <T>(url: string, body?: unknown, schema?: ResponseSchema<T>) => request<T>(url, 'PATCH', body, schema),
  delete: deleteRequest,
  upload: <T>(url: string, formData: FormData, schema?: ResponseSchema<T>, options?: ApiRequestOptions) =>
    upload<T>(url, formData, schema, options),
  putBlob,
  getBlob,
};
