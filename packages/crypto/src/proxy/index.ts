import { applicationsProxy } from './applications';
import { emailsProxy } from './emails';
import { filesProxy } from './files';
import { cryptoRuntime } from './runtime';
import { searchProxy } from './search';
import { vaultProxy } from './vault';

/**
 * Flat public facade; the shared runtime retains the same object identity.
 */
export const CryptoProxy = Object.assign(cryptoRuntime, {
  ...applicationsProxy,
  ...filesProxy,
  ...emailsProxy,
  ...vaultProxy,
  ...searchProxy,
});
