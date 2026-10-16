interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
  readonly VITE_DEMO_LOGIN?: string;
  readonly VITE_REFRESH_COOKIE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
