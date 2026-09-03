import { z } from 'zod';

import { isRecord } from './guards';

export function getErrorMessage(error: unknown, fallback = 'Unknown error'): string {
  return getErrorMessageOrNull(error) ?? fallback;
}

export function getErrorMessageOrNull(error: unknown): string | null {
  const stringError = z.string().safeParse(error);

  if (stringError.success) {
    return stringError.data;
  }

  if (error instanceof Error) {
    return readStringProperty(error, 'shortMessage') ?? error.message;
  }

  return isRecord(error) ? readStringProperty(error, 'message') : null;
}

function readStringProperty(value: object, key: string): string | null {
  const property = z.string().safeParse(Reflect.get(value, key));

  return property.success ? property.data : null;
}
