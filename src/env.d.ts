/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_CATALYST_ZAID: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
