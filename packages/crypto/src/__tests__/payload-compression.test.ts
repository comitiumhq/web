import { gzipSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';
import { decodeJsonPayload, ENVELOPE_MAX_DECOMPRESSED_BYTES, prepareJsonPayload } from '../payload-compression';
import { installCompressionStreamPolyfill } from './compression-stream-polyfill';

installCompressionStreamPolyfill();

describe('payload compression', () => {
  it('uses gzip only when the payload is large and meaningfully smaller', async () => {
    const small = await prepareJsonPayload(textPayload('short'), true);
    const large = await prepareJsonPayload(textPayload(repeatText('repeatable text ', 500)), true);

    expect(small.zip).toBe('none');
    expect(large.zip).toBe('gzip');
    expect(large.bytes.length).toBeLessThan(large.plaintextBytes);
  });

  it('falls back to uncompressed payloads when gzip streams are unavailable', async () => {
    const payload = await withoutCompressionStreams(() =>
      prepareJsonPayload(textPayload(repeatText('repeatable text ', 500)), true),
    );

    expect(payload.zip).toBe('none');
  });

  it('does not gzip payloads above the decompression safety cap', async () => {
    const oversized = await prepareJsonPayload(oversizedTextPayload(), true);

    expect(oversized.zip).toBe('none');
  });

  it('rejects payloads that cannot be serialized as JSON', async () => {
    await expect(prepareJsonPayload(undefined, true)).rejects.toThrow('Encrypted payload must be JSON-serializable');
  });

  it('bounds decompressed payload size', async () => {
    const compressed = gzipJsonPayload(oversizedTextPayload());

    await expect(decodeJsonPayload(compressed, 'gzip')).rejects.toThrow('Decompressed payload exceeds');
  });
});

function textPayload(text: string) {
  return { text };
}

function oversizedTextPayload() {
  return textPayload(repeatText('a', ENVELOPE_MAX_DECOMPRESSED_BYTES + 1));
}

function repeatText(text: string, times: number): string {
  return text.repeat(times);
}

function gzipJsonPayload(data: unknown): Uint8Array {
  const json = JSON.stringify(data);
  const payload = new TextEncoder().encode(json);

  return new Uint8Array(gzipSync(payload));
}

async function withoutCompressionStreams<T>(operation: () => Promise<T>): Promise<T> {
  const runtime = globalThis as unknown as {
    CompressionStream: typeof CompressionStream | undefined;
    DecompressionStream: typeof DecompressionStream | undefined;
  };
  const compressionStream = runtime.CompressionStream;
  const decompressionStream = runtime.DecompressionStream;

  runtime.CompressionStream = undefined;
  runtime.DecompressionStream = undefined;

  try {
    return await operation();
  } finally {
    runtime.CompressionStream = compressionStream;
    runtime.DecompressionStream = decompressionStream;
  }
}
