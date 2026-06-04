/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_OME_API_BASE: string
  readonly VITE_OME_API_USER: string
  readonly VITE_OME_API_PASS: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

interface Window {
  __ENV__?: {
    VITE_OME_API_BASE?: string
    VITE_OME_API_USER?: string
    VITE_OME_API_PASS?: string
  }
}
