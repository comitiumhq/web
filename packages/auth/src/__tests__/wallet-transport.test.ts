import { ProductTransactionFailedError, ProductTransactionStageError } from '@comitium/schemas/transaction-errors';
import type { Address, Hex } from 'viem';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { CanonicalWallet } from '../wallet';

const mocks = vi.hoisted(() => ({
  call: vi.fn(),
  waitForTransactionReceipt: vi.fn(),
}));

vi.mock('@comitium/chain/instances', () => ({
  publicClient: {
    call: mocks.call,
    waitForTransactionReceipt: mocks.waitForTransactionReceipt,
  },
}));

const { sendPreparedProductTransaction } = await import('../wallet-transport');

const ADDRESS = '0x1111111111111111111111111111111111111111' as Address;
const TARGET = '0x2222222222222222222222222222222222222222' as Address;
const TX_HASH = `0x${'cd'.repeat(32)}` as Hex;
const transaction = {
  chainId: 84532,
  to: TARGET,
  data: '0x1234' as Hex,
  value: 0n,
};

function createWallet(): CanonicalWallet {
  return {
    id: 'wallet-id',
    address: ADDRESS,
    signTypedData: vi.fn(),
    sendTransaction: vi.fn().mockResolvedValue(TX_HASH),
    switchChain: vi.fn(),
  };
}

describe('canonical wallet transport', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.call.mockResolvedValue(undefined);
    mocks.waitForTransactionReceipt.mockResolvedValue({ status: 'success' });
  });

  it('preflights, submits through the embedded wallet, and waits for its receipt', async () => {
    const wallet = createWallet();

    await expect(sendPreparedProductTransaction(wallet, transaction, null)).resolves.toBe(TX_HASH);
    expect(wallet.switchChain).toHaveBeenCalledExactlyOnceWith(84532);
    expect(mocks.call).toHaveBeenCalledExactlyOnceWith({
      account: ADDRESS,
      to: TARGET,
      data: '0x1234',
      value: 0n,
    });
    expect(wallet.sendTransaction).toHaveBeenCalledExactlyOnceWith({
      chainId: 84532,
      to: TARGET,
      data: '0x1234',
      value: 0n,
    });
  });

  it.each([
    ['chain switch', (wallet: CanonicalWallet) => vi.mocked(wallet.switchChain).mockRejectedValue(new Error('switch'))],
    ['simulation', () => mocks.call.mockRejectedValue(new Error('simulation'))],
  ])('does not submit when %s preflight fails', async (_name, arrange) => {
    const wallet = createWallet();
    arrange(wallet);

    const error = await sendPreparedProductTransaction(wallet, transaction, null).catch((cause) => cause);

    expect(error).toBeInstanceOf(ProductTransactionStageError);
    expect(error).toMatchObject({ stage: 'preflight' });
    expect(wallet.sendTransaction).not.toHaveBeenCalled();
    expect(mocks.waitForTransactionReceipt).not.toHaveBeenCalled();
  });

  it('records the submitted hash exactly once before waiting for the receipt', async () => {
    const wallet = createWallet();
    const onSubmitted = vi.fn();

    await sendPreparedProductTransaction(wallet, transaction, { onSubmitted });

    expect(onSubmitted).toHaveBeenCalledExactlyOnceWith(TX_HASH);
    expect(onSubmitted.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.waitForTransactionReceipt.mock.invocationCallOrder[0],
    );
  });

  it('classifies a wallet send rejection as a submission-stage failure without recording a hash', async () => {
    const wallet = createWallet();
    const rejection = Object.assign(new Error('Rejected'), { code: 4001 });
    vi.mocked(wallet.sendTransaction).mockRejectedValue(rejection);
    const onSubmitted = vi.fn();

    const error = await sendPreparedProductTransaction(wallet, transaction, { onSubmitted }).catch((cause) => cause);

    expect(error).toBeInstanceOf(ProductTransactionStageError);
    expect(error).toMatchObject({ stage: 'submission', cause: rejection });
    expect(onSubmitted).not.toHaveBeenCalled();
    expect(mocks.waitForTransactionReceipt).not.toHaveBeenCalled();
  });

  it('keeps a receipt timeout as a submission-stage failure after recording the hash', async () => {
    const wallet = createWallet();
    const timeout = new Error('Timed out waiting for receipt');
    mocks.waitForTransactionReceipt.mockRejectedValue(timeout);
    const onSubmitted = vi.fn();

    const error = await sendPreparedProductTransaction(wallet, transaction, { onSubmitted }).catch((cause) => cause);

    expect(error).toBeInstanceOf(ProductTransactionStageError);
    expect(error).toMatchObject({ stage: 'submission', cause: timeout });
    expect(onSubmitted).toHaveBeenCalledExactlyOnceWith(TX_HASH);
  });

  it('preserves a reverted receipt as a deterministic product failure', async () => {
    const wallet = createWallet();
    mocks.waitForTransactionReceipt.mockResolvedValue({ status: 'reverted' });

    const error = await sendPreparedProductTransaction(wallet, transaction, null).catch((cause) => cause);

    expect(error).toBeInstanceOf(ProductTransactionStageError);
    expect(error).toMatchObject({ stage: 'submission' });
    expect(error.cause).toBeInstanceOf(ProductTransactionFailedError);
  });
});
