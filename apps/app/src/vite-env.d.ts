/// <reference types="vite/client" />
/// <reference types="@tanstack/react-start" />

interface ImportMetaEnv {
  readonly VITE_PRIVY_APP_ID: string;
  readonly VITE_BASE_RPC_URL: string;
  readonly VITE_FILEBASE_GATEWAY_BASE_URL: string;
  readonly VITE_ENVIRONMENT: string;
  readonly VITE_API: string;
  readonly VITE_PUBLIC_SITE_ORIGIN?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
