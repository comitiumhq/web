import { normalizeIpfsUri } from '@comitium/schemas/ipfs';

const IPFS_PROTOCOL_PREFIX = 'ipfs://';
const PUBLIC_GATEWAYS = ['https://dweb.link/ipfs', 'https://ipfs.io/ipfs'] as const;

function getFilebaseGatewayBaseUrl(): string {
  const value = import.meta.env.VITE_FILEBASE_GATEWAY_BASE_URL?.trim();

  if (!value) {
    throw new Error('VITE_FILEBASE_GATEWAY_BASE_URL is required');
  }

  return value.replace(/\/+$/, '');
}

export function resolveIpfsGatewayUrls(uri?: string | null): string[] {
  if (!uri) {
    return [];
  }

  const ipfsUri = normalizeIpfsUri(uri);

  if (!ipfsUri) {
    return [uri];
  }

  const cidPath = ipfsUri.slice(IPFS_PROTOCOL_PREFIX.length);
  const gateways = [`${getFilebaseGatewayBaseUrl()}/ipfs`, ...PUBLIC_GATEWAYS];

  return gateways.map((gateway) => `${gateway}/${cidPath}`);
}

export function resolveIpfsUrl(uri?: string | null): string | null {
  return resolveIpfsGatewayUrls(uri)[0] ?? null;
}
