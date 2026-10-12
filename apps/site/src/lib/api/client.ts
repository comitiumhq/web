import { ApiError, parseApiErrorPayload } from '@comitium/schemas/api-errors';
import type { z } from 'zod';

const API_URL = import.meta.env.VITE_API;
const API_REQUEST_TIMEOUT_MS = 30_000;

type ResponseSchema<T> = z.ZodType<T, unknown>;

async function request<T>(path: string, schema: ResponseSchema<T>, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    credentials: 'omit',
    signal: AbortSignal.timeout(API_REQUEST_TIMEOUT_MS),
  });

  if (!response.ok) {
    const data = await response.json().catch(() => null);
    const { message, code, details } = parseApiErrorPayload(data);

    throw new ApiError(response.status, message, code, details);
  }

  return schema.parse(await response.json());
}

export const api = {
  get: <T>(path: string, schema: ResponseSchema<T>) => request(path, schema),
  post: <T>(path: string, body: unknown, schema: ResponseSchema<T>) =>
    request(path, schema, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }),
};
