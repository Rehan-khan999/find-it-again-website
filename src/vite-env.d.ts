/// <reference types="vite/client" />

// Type declarations for Vite PWA virtual modules to satisfy TS
declare module 'virtual:pwa-register' {
  export function registerSW(options?: {
    immediate?: boolean
    onNeedRefresh?: () => void
    onOfflineReady?: () => void
  }): (reloadPage?: boolean) => void
}

declare module 'virtual:pwa-register/with-sw' {
  export function registerSW(options?: {
    immediate?: boolean
    onNeedRefresh?: () => void
    onOfflineReady?: () => void
  }): (reloadPage?: boolean) => void
}

declare module 'virtual:pwa-register/simple' {
  export function registerSW(options?: { immediate?: boolean }): () => void
}
