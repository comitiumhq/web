import { gunzipSync, gzipSync } from 'node:zlib';

type CompressionFormatName = 'gzip';
type TransformFn = (input: Uint8Array) => Uint8Array;
type TestCompressionStreamConstructor = new (format: CompressionFormatName) => TestCompressionTransform;

class TestCompressionTransform {
  readable: ReadableStream<Uint8Array>;
  writable: WritableStream<Uint8Array>;

  constructor(format: CompressionFormatName, transform: TransformFn) {
    if (format !== 'gzip') {
      throw new Error(`Unsupported test compression format: ${format}`);
    }

    const chunks: Uint8Array[] = [];
    let readableController: ReadableStreamDefaultController<Uint8Array> | null = null;

    this.readable = new ReadableStream<Uint8Array>({
      start(controller) {
        readableController = controller;
      },
    });

    this.writable = new WritableStream<Uint8Array>({
      write(chunk) {
        chunks.push(chunk);
      },
      close() {
        if (!readableController) {
          throw new Error('Compression test stream is not readable');
        }

        readableController.enqueue(transform(concatBytes(chunks)));
        readableController.close();
      },
    });
  }
}

export function installCompressionStreamPolyfill(): void {
  const runtime = globalThis as unknown as {
    CompressionStream: TestCompressionStreamConstructor;
    DecompressionStream: TestCompressionStreamConstructor;
  };

  runtime.CompressionStream = class extends TestCompressionTransform {
    constructor(format: CompressionFormatName) {
      super(format, (input) => new Uint8Array(gzipSync(input)));
    }
  };
  runtime.DecompressionStream = class extends TestCompressionTransform {
    constructor(format: CompressionFormatName) {
      super(format, (input) => new Uint8Array(gunzipSync(input)));
    }
  };
}

function concatBytes(chunks: readonly Uint8Array[]): Uint8Array {
  const byteLength = chunks.reduce((total, chunk) => total + chunk.length, 0);
  const output = new Uint8Array(byteLength);
  let offset = 0;

  for (const chunk of chunks) {
    output.set(chunk, offset);
    offset += chunk.length;
  }

  return output;
}
