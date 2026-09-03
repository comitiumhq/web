import type { Plugin } from 'vite';

/** Replace browser-only modules with lightweight stubs during SSR builds. */
const PRIVY_MODULE = '@privy-io/react-auth';
const CLIENT_ONLY_MODULES = ['pdfjs-dist', 'react-pdf', PRIVY_MODULE];

const PRIVY_SSR_STUB = `
const unavailable = async () => {
  throw new Error('Privy wallet APIs are unavailable during SSR');
};
const getAccessToken = unavailable;
const getIdentityToken = unavailable;
const privyState = Object.freeze({
  authenticated: false,
  getAccessToken,
  isModalOpen: false,
  login: unavailable,
  logout: unavailable,
  ready: false,
  user: null,
});
const walletsState = Object.freeze({ ready: false, wallets: [] });
const emailLoginState = Object.freeze({ status: 'initial' });
const passkeyState = Object.freeze({ status: 'initial' });
const PrivyProvider = ({ children }) => children;
const useAuthorizationSignature = () => ({ generateAuthorizationSignature: unavailable });
const useConnectWallet = () => ({ connectWallet: unavailable });
const useCreateWallet = () => ({ createWallet: unavailable });
const useIdentityToken = () => ({ identityToken: null });
const useLinkAccount = () => ({ linkGoogle: unavailable });
const useLinkEmail = () => ({ linkWithCode: unavailable, sendCode: unavailable, state: emailLoginState });
const useLinkWithPasskey = () => ({ linkWithPasskey: unavailable, state: passkeyState });
const useLoginWithEmail = () => ({
  loginWithCode: unavailable,
  sendCode: unavailable,
  state: emailLoginState,
});
const useLoginWithOAuth = () => ({
  initOAuth: unavailable,
  loading: false,
  state: Object.freeze({ status: 'initial' }),
});
const useLoginWithPasskey = () => ({ loginWithPasskey: unavailable, state: passkeyState });
const useUnlinkOAuth = () => ({ unlink: unavailable });
const useUpdateEmail = () => ({ sendCode: unavailable, state: emailLoginState, verifyCode: unavailable });
const usePrivy = () => privyState;
const useUser = () => ({ refreshUser: unavailable, user: null });
const useWallets = () => walletsState;
const useSendTransaction = () => ({ sendTransaction: unavailable });
const useSignMessage = () => ({ signMessage: unavailable });
const useSignTypedData = () => ({ signTypedData: unavailable });
export {
  getAccessToken,
  getIdentityToken,
  PrivyProvider,
  useAuthorizationSignature,
  useConnectWallet,
  useCreateWallet,
  useIdentityToken,
  useLinkAccount,
  useLinkEmail,
  useLinkWithPasskey,
  useLoginWithEmail,
  useLoginWithOAuth,
  useLoginWithPasskey,
  usePrivy,
  useSendTransaction,
  useSignMessage,
  useSignTypedData,
  useUser,
  useUnlinkOAuth,
  useUpdateEmail,
  useWallets,
};
`;

function isClientOnlyModule(id: string) {
  return CLIENT_ONLY_MODULES.some((moduleId) => id === moduleId || id.startsWith(`${moduleId}/`));
}

export function ssrExclude(): Plugin {
  return {
    name: 'ssr-exclude-client-only',
    enforce: 'pre',
    resolveId(id, _importer, options) {
      if (options?.ssr && isClientOnlyModule(id)) {
        return { id: `\0empty:${id}`, moduleSideEffects: false };
      }
    },
    load(id) {
      if (!id.startsWith('\0empty:')) {
        return;
      }

      if (id === `\0empty:${PRIVY_MODULE}`) {
        return PRIVY_SSR_STUB;
      }

      if (id.endsWith('.css')) {
        return '';
      }

      const noop = 'const noop = () => null;';
      const obj = 'const obj = { GlobalWorkerOptions: {} };';

      return [
        noop,
        obj,
        'export { noop as Document, noop as Page, obj as pdfjs };',
        'export { obj as GlobalWorkerOptions, noop as getDocument };',
        'export default obj;',
      ].join('\n');
    },
  };
}
