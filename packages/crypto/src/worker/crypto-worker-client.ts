import * as Comlink from 'comlink';

import type { CryptoWorkerApi } from './crypto-api';

const WORKER_STARTUP_TIMEOUT_MS = 15_000;

type WorkerOperation<Result> = (api: Comlink.Remote<CryptoWorkerApi>) => Promise<Result>;

/**
 * Owns Worker/Comlink lifecycle. Comlink leaves RPC calls pending after Worker
 * failure, so each call also waits for an explicit failure signal.
 */
export class CryptoWorkerClient {
  private readonly failureSignal: Promise<Error>;
  private readonly readyPromise: Promise<void>;
  private readonly remote: Comlink.Remote<CryptoWorkerApi>;
  private readonly worker: Worker;
  private disposed = false;
  private resolveFailure!: (error: Error) => void;

  constructor(private readonly onFailure: () => void) {
    if (!globalThis.Worker) {
      throw new Error('CryptoProxy requires a browser environment (Web Workers not available)');
    }

    this.worker = new Worker(new URL('./crypto.worker.ts', import.meta.url), {
      type: 'module',
    });

    this.remote = Comlink.wrap<CryptoWorkerApi>(this.worker);

    this.failureSignal = new Promise((resolve) => {
      this.resolveFailure = resolve;
    });

    this.worker.addEventListener('error', this.handleWorkerError);
    this.worker.addEventListener('messageerror', this.handleMessageError);

    const timeoutId = globalThis.setTimeout(() => {
      this.fail(new Error('Crypto worker startup timed out'));
    }, WORKER_STARTUP_TIMEOUT_MS);

    this.readyPromise = this.raceFailure(this.remote.ready())
      .then(() => undefined)
      .finally(() => globalThis.clearTimeout(timeoutId));

    // Eager init has no caller to observe a startup rejection.
    void this.readyPromise.catch(() => undefined);
  }

  async run<Result>(operation: WorkerOperation<Result>): Promise<Result> {
    await this.readyPromise;

    return this.raceFailure(operation(this.remote));
  }

  dispose(reason = new Error('Crypto worker was terminated')): void {
    if (this.disposed) {
      return;
    }

    this.disposed = true;
    this.worker.removeEventListener('error', this.handleWorkerError);
    this.worker.removeEventListener('messageerror', this.handleMessageError);
    this.resolveFailure(reason);
    this.remote[Comlink.releaseProxy]();
    this.worker.terminate();
  }

  private readonly handleMessageError = () => {
    this.fail(new Error('Crypto worker communication failed'));
  };

  private readonly handleWorkerError = () => {
    this.fail(new Error('Crypto worker failed'));
  };

  private fail(error: Error): void {
    if (this.disposed) {
      return;
    }

    this.dispose(error);
    this.onFailure();
  }

  private raceFailure<Result>(operation: Promise<Result>): Promise<Result> {
    return Promise.race([
      operation,
      this.failureSignal.then((error) => {
        throw error;
      }),
    ]);
  }
}
