/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Catalyst Zoho Application ID — differs between Development and Production. */
  readonly VITE_CATALYST_ZAID: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
