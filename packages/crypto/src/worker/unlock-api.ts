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
 * Secret-bearing requests run in the Worker; session revocation also runs without it.
 */
export class UnlockApi {
  private readonly baseUrl: string;

  constructor(baseUrl: string) {
    const url = new URL(baseUrl);
    const isLocalHttp = url.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);

    if (url.protocol !== 'https:' && !isLocalHttp) {
      throw new Error('Encryption API requires HTTPS');
    }

    const hasCredentials = Boolean(url.username || url.password);
    const hasQueryOrHash = Boolean(url.search || url.hash);

    if (hasCredentials || hasQueryOrHash) {
      throw new Error('Invalid encryption API URL');
    }

    this.baseUrl = baseUrl.replace(TRAILING_SLASH_REGEX, '');
  }

  async getKeyShare(userId: string, signal: AbortSignal): Promise<KeyShareResponse> {
    const share = await this.request('GET', '/users/key-share', undefined, keyShareResponseSchema, signal);

    if (share.userId !== userId) {
      throw new UnlockApiError(409, 'API_ERROR');
    }

    return share;
  }

  getBundle(signal: AbortSignal): Promise<KeyBundleResponse> {
    return this.request('POST', '/auth/bootstrap', undefined, keyBundleResponseSchema, signal);
  }

  initialize(body: KeyBundleWrite & { userId: string }, signal: AbortSignal) {
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

  logoutEverywhere(signal: AbortSignal) {
    return this.request('POST', '/auth/logout-all', undefined, successSchema, signal);
  }

  /**
   * Expose only status and allowlisted error codes; response bodies may contain secrets.
   */
  private async request<T>(
    method: string,
    path: string,
    body: unknown,
    schema: z.ZodType<T>,
    signal: AbortSignal,
  ): Promise<T> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      method,
      credentials: 'include',
      cache: 'no-store',
      redirect: 'error',
      headers: { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal,
    });

    if (!response.ok) {
      const failure = unlockApiErrorResponseSchema.safeParse(await response.json().catch(() => null));

      throw new UnlockApiError(response.status, failure.success ? failure.data.error.code : 'API_ERROR');
    }

    return schema.parse(await response.json());
  }
}
