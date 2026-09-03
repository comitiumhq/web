import { isDefined } from '@comitium/schemas/guards';

type LogMeta = unknown;

function writeError(message: string, meta?: LogMeta): void {
  if (!isDefined(meta)) {
    console.error(message);
    return;
  }

  console.error(message, meta);
}

function writeWarn(message: string, meta?: LogMeta): void {
  if (!isDefined(meta)) {
    console.warn(message);
    return;
  }

  console.warn(message, meta);
}

export const logger = {
  error: writeError,
  warn: writeWarn,
};
