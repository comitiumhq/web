import { hkdf } from '@noble/hashes/hkdf.js';
import { sha256 } from '@noble/hashes/sha2.js';
import { randomBytes } from '@noble/hashes/utils.js';
import { base64 } from '@scure/base';
import type { z } from 'zod';
import type { CandidateSearchReference, CandidateSearchScope } from '../candidate-search-protocol';
import { decryptBinaryData, encryptBinaryData } from '../data-encryption';
import { keyMetadataFingerprint } from '../key-context';
import { unwrapKeyMaterial, wrapKeyMaterial } from '../key-wrapping';
import { decodeJsonPayload, prepareJsonPayload } from '../payload-compression';
import {
  CANDIDATE_SEARCH_CACHE_LIMITS,
  type CandidateSearchCacheBinding,
  type CandidateSearchData,
  type CandidateSearchPayload,
  type CandidateSearchPosting,
  type CandidateSearchRegistry,
  candidateSearchCacheBindingSchema,
  candidateSearchPayloadSchema,
  candidateSearchPostingSchema,
  candidateSearchRegistrySchema,
  type StoredProfile,
} from '../schemas/candidate-search-cache';
import type { WrappedKey } from '../schemas/keys';
import { isSameCryptoSession } from '../session';
import { CandidateSearchError } from './candidate-search-error';
import type { UserKeySession } from './user-key-session';

const encoder = new TextEncoder();

export interface CandidateProfileCipherIdentity extends CandidateSearchReference {
  localId: number;
  unreadable: boolean;
}

interface CandidateCacheKeys {
  key: Uint8Array;
  hmacKey: CryptoKey;
  binding: CandidateSearchCacheBinding;
}

interface CandidateCacheCipherContext {
  purpose: 'profile' | 'posting' | 'registry';
  identity: CandidateProfileCipherIdentity | string;
}

/**
 * One user-wrapped namespace key; a separate HKDF-derived HMAC key hides term addresses.
 * Only encrypted values/wrappers leave the Worker. Compression metadata is authenticated.
 */
export class CandidateSearchCacheCipher {
  private key: Uint8Array | null = null;
  private hmacKey: CryptoKey | null = null;
  private binding: CandidateSearchCacheBinding | null = null;
  private generation = 0;

  constructor(private readonly session: UserKeySession) {}

  async createKey(value: CandidateSearchCacheBinding): Promise<WrappedKey> {
    const binding = this.validateBinding(value);
    const generation = this.session.keys.captureGeneration();
    const key = randomBytes(32);

    try {
      const wrapped = await wrapKeyMaterial(key, this.session.requirePublicKey(), keyAad(binding));
      this.session.keys.assertGeneration(generation);
      return wrapped;
    } finally {
      key.fill(0);
    }
  }

  async open(scope: CandidateSearchScope, value: CandidateSearchCacheBinding): Promise<void> {
    this.clear();
    const binding = this.validateBinding(value);
    const generation = this.generation;
    const sessionGeneration = this.session.keys.captureGeneration();
    const sameScope = scope.orgId === binding.context.orgId && scope.scopeToken === binding.context.scopeToken;

    if (!sameScope || !binding.wrappedKey) {
      throw new CandidateSearchError('SEARCH_CACHE_INVALID');
    }

    let key: Uint8Array;

    try {
      key = await unwrapKeyMaterial(binding.wrappedKey, this.session.keys.getUserPrivateKey(), keyAad(binding));
    } catch {
      this.session.keys.assertGeneration(sessionGeneration);
      throw new CandidateSearchError('SEARCH_CACHE_INVALID');
    }

    try {
      const hashKey = hkdf(
        sha256,
        key,
        encoder.encode(binding.generation),
        encoder.encode('comitium.candidate-search-cache.address.v2'),
        32,
      );

      let hmacKey: CryptoKey;

      try {
        hmacKey = await crypto.subtle.importKey(
          'raw',
          hashKey as BufferSource,
          { name: 'HMAC', hash: 'SHA-256' },
          false,
          ['sign'],
        );
      } finally {
        hashKey.fill(0);
      }

      this.session.keys.assertGeneration(sessionGeneration);

      if (key.length !== 32) {
        throw new CandidateSearchError('SEARCH_CACHE_INVALID');
      }

      if (generation !== this.generation) {
        throw new CandidateSearchError('SEARCH_SCOPE_CHANGED');
      }

      this.key = key;
      this.hmacKey = hmacKey;
      this.binding = binding;
    } catch (error) {
      key.fill(0);
      throw error;
    }
  }

  async address(term: string): Promise<ArrayBuffer> {
    const { hmacKey } = this.requireKey();
    const generation = this.generation;
    const digest = await crypto.subtle.sign('HMAC', hmacKey, encoder.encode(term));
    this.assertGeneration(generation);
    return digest;
  }

  async encryptProfile(
    identity: CandidateProfileCipherIdentity,
    payload: CandidateSearchPayload,
  ): Promise<CandidateSearchData> {
    return this.encrypt(payload, { purpose: 'profile', identity }, CANDIDATE_SEARCH_CACHE_LIMITS.maxRecordBytes);
  }

  async decryptProfile(record: StoredProfile): Promise<CandidateSearchPayload> {
    const { candidateId, profileRevision, profileFingerprint, localId, unreadable } = record;
    const identity = { candidateId, profileRevision, profileFingerprint, localId, unreadable };
    return this.decrypt(record.searchData, { purpose: 'profile', identity }, candidateSearchPayloadSchema);
  }

  async encryptPosting(address: ArrayBuffer, value: CandidateSearchPosting): Promise<CandidateSearchData> {
    return this.encrypt(
      value,
      { purpose: 'posting', identity: base64.encode(new Uint8Array(address)) },
      CANDIDATE_SEARCH_CACHE_LIMITS.maxBucketBytes,
    );
  }

  async decryptPosting(address: ArrayBuffer, data: CandidateSearchData): Promise<CandidateSearchPosting> {
    const oversized =
      data.plaintextBytes > CANDIDATE_SEARCH_CACHE_LIMITS.maxBucketBytes ||
      data.ct.byteLength > CANDIDATE_SEARCH_CACHE_LIMITS.maxBucketBytes + 16;

    if (oversized) {
      throw new CandidateSearchError('SEARCH_CACHE_INVALID');
    }

    return this.decrypt(
      data,
      { purpose: 'posting', identity: base64.encode(new Uint8Array(address)) },
      candidateSearchPostingSchema,
    );
  }

  async encryptRegistry(address: ArrayBuffer, value: CandidateSearchRegistry): Promise<CandidateSearchData> {
    return this.encrypt(
      value,
      { purpose: 'registry', identity: base64.encode(new Uint8Array(address)) },
      CANDIDATE_SEARCH_CACHE_LIMITS.maxPostingBytes,
    );
  }

  async decryptRegistry(address: ArrayBuffer, data: CandidateSearchData): Promise<CandidateSearchRegistry> {
    return this.decrypt(
      data,
      { purpose: 'registry', identity: base64.encode(new Uint8Array(address)) },
      candidateSearchRegistrySchema,
    );
  }

  clear(): void {
    this.generation += 1;
    this.key?.fill(0);
    this.key = null;
    this.hmacKey = null;
    this.binding = null;
  }

  private async encrypt(
    value: unknown,
    context: CandidateCacheCipherContext,
    maxBytes: number,
  ): Promise<CandidateSearchData> {
    const { key, binding } = this.requireKey();
    const generation = this.generation;
    const payload = await prepareJsonPayload(value, true);

    if (payload.plaintextBytes > maxBytes) {
      throw new CandidateSearchError('SEARCH_RESOURCE_LIMIT');
    }

    const aad = recordAad(binding, context, payload.zip, payload.plaintextBytes);
    const encrypted = await encryptBinaryData(payload.bytes, key, aad);

    this.assertGeneration(generation);

    return { v: 2, ...encrypted, ct: encrypted.ct.slice(), zip: payload.zip, plaintextBytes: payload.plaintextBytes };
  }

  private async decrypt<T>(
    data: CandidateSearchData,
    context: CandidateCacheCipherContext,
    schema: z.ZodType<T>,
  ): Promise<T> {
    const { key, binding } = this.requireKey();
    const generation = this.generation;
    const aad = recordAad(binding, context, data.zip, data.plaintextBytes);

    try {
      const plaintext = await decryptBinaryData(data.ct, data.iv, key, aad);
      this.assertGeneration(generation);

      try {
        const value = await decodeJsonPayload(plaintext, data.zip);
        this.assertGeneration(generation);

        return schema.parse(value);
      } finally {
        plaintext.fill(0);
      }
    } catch {
      this.assertGeneration(generation);

      throw new CandidateSearchError('SEARCH_CACHE_INVALID');
    }
  }

  private assertGeneration(generation: number): void {
    if (generation !== this.generation) {
      throw new CandidateSearchError('SEARCH_SCOPE_CHANGED');
    }

    this.requireKey();
  }

  private validateBinding(value: CandidateSearchCacheBinding): CandidateSearchCacheBinding {
    const { key, generation, context, wrappedKey } = value;
    const result = candidateSearchCacheBindingSchema.safeParse({ key, generation, context, wrappedKey });

    if (!result.success) {
      throw new CandidateSearchError('SEARCH_CACHE_INVALID');
    }

    const binding = result.data;
    const identity = this.session.requireIdentity();
    const sameOwner = isSameCryptoSession(identity, binding.context);

    if (!sameOwner || keyMetadataFingerprint(binding.context) !== binding.key) {
      throw new CandidateSearchError('SEARCH_CACHE_INVALID');
    }

    return binding;
  }

  private requireKey(): CandidateCacheKeys {
    if (!this.key || !this.binding || !this.hmacKey) {
      throw new CandidateSearchError('SEARCH_SCOPE_CHANGED');
    }

    return { key: this.key, hmacKey: this.hmacKey, binding: this.binding };
  }
}

function keyAad(binding: CandidateSearchCacheBinding): Uint8Array {
  return encoder.encode(
    JSON.stringify({
      purpose: 'comitium.candidate-search-cache.key.v2',
      namespace: binding.key,
      generation: binding.generation,
      context: binding.context,
    }),
  );
}

function recordAad(
  binding: CandidateSearchCacheBinding,
  context: CandidateCacheCipherContext,
  zip: CandidateSearchData['zip'],
  plaintextBytes: number,
): Uint8Array {
  return encoder.encode(
    JSON.stringify({
      purpose: `comitium.candidate-search-cache.${context.purpose}.v2`,
      namespace: binding.key,
      generation: binding.generation,
      context: binding.context,
      identity: context.identity,
      zip,
      plaintextBytes,
    }),
  );
}
