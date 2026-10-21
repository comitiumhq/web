import { transferHandlers } from 'comlink';
import { serializedUnlockApiErrorSchema } from '../schemas/unlock-api';
import { UnlockApiError } from './unlock-api-error';

const fallback = transferHandlers.get('throw');

if (!fallback) {
  throw new Error('Comlink exception handler is unavailable');
}

/**
 * Preserve only allowlisted API error metadata across the Worker boundary.
 */
transferHandlers.set('throw', {
  canHandle: fallback.canHandle,
  serialize(thrown) {
    const error = typeof thrown === 'object' && thrown !== null && 'value' in thrown ? thrown.value : undefined;

    if (error instanceof UnlockApiError) {
      return [{ kind: 'comitium.unlock-api-error', status: error.status, code: error.code }, []];
    }

    return fallback.serialize(thrown);
  },
  deserialize(value) {
    const result = serializedUnlockApiErrorSchema.safeParse(value);

    if (result.success) {
      throw new UnlockApiError(result.data.status, result.data.code);
    }

    return fallback.deserialize(value);
  },
});
