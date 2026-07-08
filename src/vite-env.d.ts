/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_STATIC_SNAPSHOT?: string
  readonly VITE_ACTIVITY_ENDPOINT?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
