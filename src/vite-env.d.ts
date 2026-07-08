/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_STATIC_SNAPSHOT?: string
  readonly VITE_ACTIVITY_ENDPOINT?: string
  readonly VITE_SUPABASE_URL?: string
  readonly VITE_SUPABASE_ANON_KEY?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
