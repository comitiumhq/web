import { type Address, getAddress } from 'viem';

export function normalizeAddress(address: string): Address {
  return getAddress(address).toLowerCase() as Address;
}
