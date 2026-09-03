import { CryptoProxy } from '@comitium/crypto';

const CRYPTO_DB_NAME = 'comitium_crypto';
const CRYPTO_RESET_CHANNEL = 'comitium_crypto_reset';

export type CryptoResetMessage =
  | { type: 'reset-start'; sourceId: string }
  | { type: 'reset-complete'; sourceId: string };

interface CryptoResetSubscriber {
  onResetStart: () => Promise<void> | void;
  onResetComplete: () => Promise<void> | void;
}

let resetPromise: Promise<void> | null = null;
let resetSourceId: string | null = null;

function getResetSourceId(): string {
  resetSourceId ??= crypto.randomUUID();

  return resetSourceId;
}

function deleteCryptoDatabase(onBlocked?: () => void): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      resolve();

      return;
    }

    const request = indexedDB.deleteDatabase(CRYPTO_DB_NAME);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(new Error('Failed to delete crypto database'));
    request.onblocked = () => onBlocked?.();
  });
}

function postResetMessage(message: CryptoResetMessage): void {
  if (typeof BroadcastChannel === 'undefined') {
    return;
  }

  const channel = new BroadcastChannel(CRYPTO_RESET_CHANNEL);
  channel.postMessage(message);
  channel.close();
}

function broadcastResetStart(sourceId: string): void {
  postResetMessage({ type: 'reset-start', sourceId });
}

function broadcastResetComplete(sourceId: string): void {
  postResetMessage({ type: 'reset-complete', sourceId });
}

interface CryptoResetParams {
  returnTo: string;
  logout: () => Promise<void>;
  clearClientState: () => void;
  disconnectWallet?: () => Promise<void> | void;
  onDatabaseBlocked?: () => void;
}

async function runCryptoReset({
  returnTo,
  logout,
  clearClientState,
  disconnectWallet,
  onDatabaseBlocked,
}: CryptoResetParams): Promise<void> {
  const sourceId = getResetSourceId();

  broadcastResetStart(sourceId);
  CryptoProxy.reset();

  await deleteCryptoDatabase(onDatabaseBlocked);
  await logout();

  if (disconnectWallet) {
    await disconnectWallet();
  }

  clearClientState();

  broadcastResetComplete(sourceId);
  window.location.replace(returnTo);
}

export function performCryptoReset(params: CryptoResetParams): Promise<void> {
  if (resetPromise) {
    return resetPromise;
  }

  const currentReset = runCryptoReset(params).finally(() => {
    if (resetPromise === currentReset) {
      resetPromise = null;
    }
  });

  resetPromise = currentReset;

  return currentReset;
}

export function subscribeToCryptoReset({ onResetStart, onResetComplete }: CryptoResetSubscriber): () => void {
  if (typeof BroadcastChannel === 'undefined') {
    return () => undefined;
  }

  const channel = new BroadcastChannel(CRYPTO_RESET_CHANNEL);
  let localResetPromise: Promise<void> = Promise.resolve();

  channel.onmessage = (event: MessageEvent<CryptoResetMessage>) => {
    if (event.data.sourceId === getResetSourceId()) {
      return;
    }

    if (event.data.type === 'reset-start') {
      CryptoProxy.reset();
      localResetPromise = Promise.resolve(onResetStart());

      return;
    }

    localResetPromise
      .catch(() => undefined)
      .then(onResetComplete)
      .finally(() => window.location.replace('/'));
  };

  return () => channel.close();
}
