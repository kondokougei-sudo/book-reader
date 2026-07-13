/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_GOOGLE_CLIENT_ID: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

// Minimal typing for the Google Identity Services script loaded via <script>
// in index.html (accounts.google.com/gsi/client). We only type what we use.
declare namespace google.accounts.oauth2 {
  interface TokenResponse {
    access_token: string
    expires_in: number
    error?: string
    error_description?: string
  }

  interface TokenClientConfig {
    client_id: string
    scope: string
    prompt?: string
    callback: (response: TokenResponse) => void
    error_callback?: (error: { type: string; message?: string }) => void
  }

  interface TokenClient {
    requestAccessToken: (overrideConfig?: { prompt?: string }) => void
  }

  function initTokenClient(config: TokenClientConfig): TokenClient
  function revoke(accessToken: string, done?: () => void): void
}

interface Window {
  google?: typeof google
}
