import { publicClient } from '@comitium/chain/instances';
import { type Address, parseAbi } from 'viem';

const erc20Abi = parseAbi(['function balanceOf(address account) view returns (uint256)']);

export function getBalance(tokenAddress: Address, accountAddress: Address): Promise<bigint> {
  return publicClient.readContract({
    address: tokenAddress,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: [accountAddress],
  });
}
