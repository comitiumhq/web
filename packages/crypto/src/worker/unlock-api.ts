import type { z } from 'zod';

import { TRAILING_SLASH_REGEX } from '../patterns';
import {
  type CurrentKeyProof,
  type DeviceEnrollment,
  deviceIdSchema,
  deviceResponseSchema,
  type KeyBundleResponse,
  type KeyBundleWrite,
  type KeyShareResponse,
  keyBundleResponseSchema,
  keyShareResponseSchema,
  successSchema,
  unlockApiErrorResponseSchema,
} from '../schemas/unlock-api';
import type { WrappedUserKey } from '../schemas/user-key';
import { UnlockApiError } from './unlock-api-error';

/**
 * Runs in the Worker so proofs, share responses and device keys bypass main-thread state.
 */
export class UnlockApi {
  constructor(private readonly baseUrl: string) {
    const url = new URL(baseUrl);

    if (
      url.protocol !== 'https:' &&
      !(url.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname))
    ) {
      throw new Error('Encryption API requires HTTPS');
    }

    if (url.username || url.password || url.search || url.hash) {
      throw new Error('Invalid encryption API URL');
    }
  }

  getKeyShare(signal: AbortSignal): Promise<KeyShareResponse> {
    return this.request('GET', '/users/key-share', undefined, keyShareResponseSchema, signal);
  }

  getBundle(signal: AbortSignal): Promise<KeyBundleResponse> {
    return this.request('POST', '/auth/session', undefined, keyBundleResponseSchema, signal);
  }

  initialize(body: KeyBundleWrite, signal: AbortSignal) {
    return this.request('POST', '/users/encryption-key-bundle', body, successSchema, signal);
  }

  rewrap(
    body: CurrentKeyProof & { wraps: WrappedUserKey['wraps']; replacementKeyShare?: string },
    signal: AbortSignal,
  ) {
    return this.request('PUT', '/users/encryption-key-bundle/wraps', body, successSchema, signal);
  }

  reset(
    body: KeyBundleWrite & { keyVersion: number; prevWrapsFingerprint: string; replacementKeyShare?: string },
    signal: AbortSignal,
  ) {
    return this.request('POST', '/users/encryption-key-bundle/reset', body, successSchema, signal);
  }

  enrollDevice(body: DeviceEnrollment, signal: AbortSignal) {
    return this.request('POST', '/users/devices', body, deviceResponseSchema, signal);
  }

  getDeviceKey(deviceId: string, signal: AbortSignal) {
    return this.request(
      'POST',
      `/users/devices/${deviceIdSchema.parse(deviceId)}/key`,
      undefined,
      deviceResponseSchema,
      signal,
    );
  }

  revokeDevice(deviceId: string, signal: AbortSignal) {
    return this.request('DELETE', `/users/devices/${deviceIdSchema.parse(deviceId)}`, undefined, successSchema, signal);
  }

  logout(deviceId: string | undefined, signal: AbortSignal) {
    return this.request('POST', '/auth/logout', { deviceId }, successSchema, signal);
  }

  revokeAll(signal: AbortSignal) {
    return this.request('POST', '/users/devices/revoke-all', undefined, successSchema, signal);
  }

  private async request<T>(
    method: string,
    path: string,
    body: unknown,
    schema: z.ZodType<T>,
    signal: AbortSignal,
  ): Promise<T> {
    const response = await fetch(`${this.baseUrl.replace(TRAILING_SLASH_REGEX, '')}${path}`, {
      method,
      credentials: 'include',
      cache: 'no-store',
      redirect: 'error',
      headers: { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal,
    });

    if (!response.ok) {
      /**
       * Do not serialize request bodies or server responses containing secret material into errors.
       */
      const failure = unlockApiErrorResponseSchema.safeParse(await response.json().catch(() => null));

      throw new UnlockApiError(response.status, failure.success ? failure.data.error.code : 'API_ERROR');
    }

    return schema.parse(await response.json());
  }
}
