import * as Comlink from 'comlink';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CryptoWorkerClient } from '../worker/crypto-worker-client';

type MockFunction = ReturnType<typeof vi.fn>;

interface MockRemote {
  clear: MockFunction;
  ready: MockFunction;
  [Comlink.releaseProxy]: MockFunction;
}

vi.mock('comlink', () => ({
  releaseProxy: Symbol('releaseProxy'),
  wrap: vi.fn(),
}));

class MockWorker {
  private readonly listeners = new Map<string, Set<() => void>>();
  readonly terminate = vi.fn();

  constructor() {
    workerInstances.push(this);
  }

  addEventListener(type: string, listener: () => void): void {
    const listeners = this.listeners.get(type) ?? new Set();
    listeners.add(listener);
    this.listeners.set(type, listeners);
  }

  removeEventListener(type: string, listener: () => void): void {
    this.listeners.get(type)?.delete(listener);
  }

  emit(type: 'error' | 'messageerror'): void {
    for (const listener of this.listeners.get(type) ?? []) {
      listener();
    }
  }
}

let workerInstances: MockWorker[] = [];

function neverResolves(): Promise<never> {
  return new Promise(() => undefined);
}

describe('CryptoWorkerClient', () => {
  let client: CryptoWorkerClient | null;
  let onFailure: () => void;
  let remote: MockRemote;

  beforeEach(() => {
    workerInstances = [];
    onFailure = vi.fn();
    remote = {
      ready: vi.fn().mockResolvedValue(true),
      clear: vi.fn(),
      [Comlink.releaseProxy]: vi.fn(),
    };

    vi.mocked(Comlink.wrap).mockReturnValue(remote as never);
    vi.stubGlobal('Worker', MockWorker);
    client = null;
  });

  afterEach(() => {
    client?.dispose();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('rejects an in-flight operation when disposed', async () => {
    remote.clear.mockImplementation(neverResolves);
    client = new CryptoWorkerClient(onFailure);

    const pending = client.run((api) => api.clear());
    await vi.waitFor(() => expect(remote.clear).toHaveBeenCalledOnce());

    client.dispose();

    await expect(pending).rejects.toThrow('Crypto worker was terminated');
    expect(remote[Comlink.releaseProxy]).toHaveBeenCalledOnce();
    expect(workerInstances[0]?.terminate).toHaveBeenCalledOnce();
  });

  it('rejects operations when the Worker fails during startup', async () => {
    remote.ready.mockImplementation(neverResolves);
    client = new CryptoWorkerClient(onFailure);

    const pending = client.run((api) => api.clear());
    workerInstances[0]?.emit('error');

    await expect(pending).rejects.toThrow('Crypto worker failed');
    expect(remote.clear).not.toHaveBeenCalled();
    expect(onFailure).toHaveBeenCalledOnce();
    expect(remote[Comlink.releaseProxy]).toHaveBeenCalledOnce();
    expect(workerInstances[0]?.terminate).toHaveBeenCalledOnce();
  });

  it('rejects operations when startup never completes', async () => {
    vi.useFakeTimers();
    remote.ready.mockImplementation(neverResolves);
    client = new CryptoWorkerClient(onFailure);

    const pending = client.run((api) => api.clear());
    const rejection = expect(pending).rejects.toThrow('Crypto worker startup timed out');

    await vi.advanceTimersByTimeAsync(15_000);

    await rejection;
    expect(onFailure).toHaveBeenCalledOnce();
    expect(workerInstances[0]?.terminate).toHaveBeenCalledOnce();
  });

  it('rejects an in-flight operation when the Worker crashes', async () => {
    remote.clear.mockImplementation(neverResolves);
    client = new CryptoWorkerClient(onFailure);

    const pending = client.run((api) => api.clear());
    await vi.waitFor(() => expect(remote.clear).toHaveBeenCalledOnce());

    workerInstances[0]?.emit('error');

    await expect(pending).rejects.toThrow('Crypto worker failed');
    expect(onFailure).toHaveBeenCalledOnce();
  });

  it('rejects an in-flight operation when Worker messages cannot be deserialized', async () => {
    remote.clear.mockImplementation(neverResolves);
    client = new CryptoWorkerClient(onFailure);

    const pending = client.run((api) => api.clear());
    await vi.waitFor(() => expect(remote.clear).toHaveBeenCalledOnce());

    workerInstances[0]?.emit('messageerror');

    await expect(pending).rejects.toThrow('Crypto worker communication failed');
    expect(onFailure).toHaveBeenCalledOnce();
  });
});
