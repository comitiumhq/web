/// <reference types="vite/client" />
/// <reference types="@tanstack/react-start" />

interface ImportMetaEnv {
  readonly VITE_ENVIRONMENT: string;
  readonly VITE_API: string;
  readonly VITE_APP_ORIGIN?: string;
  readonly VITE_MY_ORIGIN?: string;
  readonly VITE_PUBLIC_SITE_ORIGIN: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
