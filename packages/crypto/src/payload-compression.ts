export type PayloadCompression = 'none' | 'gzip';

export const PAYLOAD_COMPRESSION_NONE = 'none' satisfies PayloadCompression;
const PAYLOAD_COMPRESSION_GZIP = 'gzip' satisfies PayloadCompression;
const ENVELOPE_COMPRESSION_THRESHOLD_BYTES = 1024;
const ENVELOPE_COMPRESSION_MIN_SAVINGS_BYTES = 64;
const ENVELOPE_COMPRESSION_MIN_SAVINGS_RATIO = 0.1;
export const ENVELOPE_MAX_DECOMPRESSED_BYTES = 2 * 1024 * 1024;

type CompressionFormatName = 'gzip';
type CompressionStreamLike = {
  readable: ReadableStream<Uint8Array>;
  writable: WritableStream<Uint8Array>;
};
type CompressionStreamConstructor = new (format: CompressionFormatName) => CompressionStreamLike;

const GZIP_FORMAT = 'gzip' satisfies CompressionFormatName;
const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

export type PreparedJsonPayload = {
  bytes: Uint8Array;
  zip: PayloadCompression;
  plaintextBytes: number;
};

export async function prepareJsonPayload(data: unknown, shouldCompress: boolean): Promise<PreparedJsonPayload> {
  const plaintext = encodeJsonPayload(data);

  if (!shouldAttemptCompression(plaintext.length, shouldCompress)) {
    return uncompressedPayload(plaintext);
  }

  const compressed = await tryCompressGzip(plaintext);

  if (!compressed || !isCompressionWorthIt(plaintext.length, compressed.length)) {
    return uncompressedPayload(plaintext);
  }

  return { bytes: compressed, zip: PAYLOAD_COMPRESSION_GZIP, plaintextBytes: plaintext.length };
}

export async function decodeJsonPayload<T>(payload: Uint8Array, zip: PayloadCompression): Promise<T> {
  if (zip === PAYLOAD_COMPRESSION_NONE) {
    return JSON.parse(textDecoder.decode(payload)) as T;
  }

  if (zip === PAYLOAD_COMPRESSION_GZIP) {
    const decompressed = await decompressGzip(payload, ENVELOPE_MAX_DECOMPRESSED_BYTES);

    return JSON.parse(textDecoder.decode(decompressed)) as T;
  }

  throw new Error(`Unsupported payload compression: ${zip satisfies never}`);
}

function isCompressionWorthIt(plaintextBytes: number, compressedBytes: number): boolean {
  const savedBytes = plaintextBytes - compressedBytes;
  const minRatioBytes = Math.ceil(plaintextBytes * ENVELOPE_COMPRESSION_MIN_SAVINGS_RATIO);
  const requiredSavings = Math.max(ENVELOPE_COMPRESSION_MIN_SAVINGS_BYTES, minRatioBytes);

  return savedBytes >= requiredSavings;
}

function encodeJsonPayload(data: unknown): Uint8Array {
  const json = JSON.stringify(data);

  if (typeof json !== 'string') {
    throw new Error('Encrypted payload must be JSON-serializable');
  }

  return textEncoder.encode(json);
}

function shouldAttemptCompression(plaintextBytes: number, shouldCompress: boolean): boolean {
  if (!shouldCompress) {
    return false;
  }

  if (plaintextBytes < ENVELOPE_COMPRESSION_THRESHOLD_BYTES) {
    return false;
  }

  return plaintextBytes <= ENVELOPE_MAX_DECOMPRESSED_BYTES;
}

function uncompressedPayload(plaintext: Uint8Array): PreparedJsonPayload {
  return { bytes: plaintext, zip: PAYLOAD_COMPRESSION_NONE, plaintextBytes: plaintext.length };
}

async function tryCompressGzip(plaintext: Uint8Array): Promise<Uint8Array | null> {
  const ctor = getCompressionStreamConstructor('CompressionStream');

  if (!ctor || !getCompressionStreamConstructor('DecompressionStream')) {
    return null;
  }

  try {
    return await transformBytes(plaintext, new ctor(GZIP_FORMAT), Number.POSITIVE_INFINITY);
  } catch {
    return null;
  }
}

async function decompressGzip(payload: Uint8Array, maxBytes: number): Promise<Uint8Array> {
  const ctor = getCompressionStreamConstructor('DecompressionStream');

  if (!ctor) {
    throw new Error('Gzip payload compression is not supported in this runtime');
  }

  return transformBytes(payload, new ctor(GZIP_FORMAT), maxBytes);
}

function getCompressionStreamConstructor(name: 'CompressionStream' | 'DecompressionStream') {
  const runtime = globalThis as typeof globalThis & {
    CompressionStream?: CompressionStreamConstructor;
    DecompressionStream?: CompressionStreamConstructor;
  };

  return runtime[name] ?? null;
}

async function transformBytes(
  input: Uint8Array,
  transform: CompressionStreamLike,
  maxOutputBytes: number,
): Promise<Uint8Array> {
  return readAllBytes(singleChunkStream(input).pipeThrough(transform), maxOutputBytes);
}

function singleChunkStream(input: Uint8Array): ReadableStream<Uint8Array> {
  return new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(input);
      controller.close();
    },
  });
}

async function readAllBytes(stream: ReadableStream<Uint8Array>, maxBytes: number): Promise<Uint8Array> {
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;

  try {
    while (true) {
      const chunk = await reader.read();

      if (chunk.done) {
        break;
      }

      totalBytes += chunk.value.length;

      if (totalBytes > maxBytes) {
        await reader.cancel();

        throw new Error(`Decompressed payload exceeds ${maxBytes} bytes`);
      }

      chunks.push(chunk.value);
    }
  } finally {
    reader.releaseLock();
  }

  const output = new Uint8Array(totalBytes);
  let offset = 0;

  for (const chunk of chunks) {
    output.set(chunk, offset);
    offset += chunk.length;
  }

  return output;
}
