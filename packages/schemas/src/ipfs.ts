const IPFS_PROTOCOL_PREFIX = 'ipfs://';

interface NormalizeIpfsUriOptions {
  maxLength?: number;
}

interface RequireIpfsUriOptions extends NormalizeIpfsUriOptions {
  message?: string;
}

export function isIpfsUriOrCid(value: string): boolean {
  const trimmed = value.trim();

  return trimmed.startsWith(IPFS_PROTOCOL_PREFIX) || trimmed.startsWith('Qm') || trimmed.startsWith('bafy');
}

export function normalizeIpfsUri(value?: string | null, options: NormalizeIpfsUriOptions = {}): string | null {
  const trimmed = value?.trim() ?? '';

  if (!trimmed || (options.maxLength !== undefined && trimmed.length > options.maxLength)) {
    return null;
  }

  if (!isIpfsUriOrCid(trimmed)) {
    return null;
  }

  return trimmed.startsWith(IPFS_PROTOCOL_PREFIX) ? trimmed : `${IPFS_PROTOCOL_PREFIX}${trimmed}`;
}

export function requireIpfsUri(value: string, options: RequireIpfsUriOptions = {}): string {
  const uri = normalizeIpfsUri(value, options);

  if (!uri) {
    throw new Error(options.message ?? 'Invalid IPFS URI');
  }

  return uri;
}
