import { signal } from '@preact/signals'

const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.readonly'
const TOKEN_SESSION_KEY = 'book-reader:token'
const EXPIRY_SAFETY_MARGIN_MS = 2 * 60 * 1000

interface StoredToken {
  accessToken: string
  expiresAt: number
}

export const isSignedIn = signal(false)
export const authError = signal<string | null>(null)

let tokenClient: google.accounts.oauth2.TokenClient | null = null
let currentToken: StoredToken | null = loadStoredToken()
let pendingRequest: Promise<string> | null = null

function loadStoredToken(): StoredToken | null {
  try {
    const raw = sessionStorage.getItem(TOKEN_SESSION_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as StoredToken
    if (parsed.expiresAt > Date.now()) return parsed
  } catch {
    // ignore corrupt storage
  }
  return null
}

function storeToken(token: StoredToken | null) {
  currentToken = token
  isSignedIn.value = token !== null
  if (token) {
    sessionStorage.setItem(TOKEN_SESSION_KEY, JSON.stringify(token))
  } else {
    sessionStorage.removeItem(TOKEN_SESSION_KEY)
  }
}

function ensureTokenClient(): google.accounts.oauth2.TokenClient {
  if (tokenClient) return tokenClient
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID
  if (!clientId) {
    throw new Error(
      'VITE_GOOGLE_CLIENT_ID が設定されていません。.env.local または GitHub Actions の変数を確認してください。',
    )
  }
  if (!window.google) {
    throw new Error('Google Identity Services のスクリプトが読み込まれていません。')
  }
  tokenClient = window.google.accounts.oauth2.initTokenClient({
    client_id: clientId,
    scope: DRIVE_SCOPE,
    callback: () => {
      /* overridden per-request below */
    },
  })
  return tokenClient
}

function requestToken(prompt: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const client = ensureTokenClient()
    // initTokenClient's callback is fixed at creation time in the real GIS API,
    // but it also accepts per-call overrides via requestAccessToken; we instead
    // re-create the callback by reassigning through a fresh initTokenClient call
    // is unnecessary because GIS invokes the *most recently set* callback — so we
    // rebuild the client with the desired callback each time.
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID
    tokenClient = window.google!.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: DRIVE_SCOPE,
      callback: (response) => {
        if (response.error) {
          authError.value = response.error_description ?? response.error
          reject(new Error(response.error_description ?? response.error))
          return
        }
        const token: StoredToken = {
          accessToken: response.access_token,
          expiresAt: Date.now() + response.expires_in * 1000,
        }
        storeToken(token)
        authError.value = null
        resolve(token.accessToken)
      },
      error_callback: (error) => {
        authError.value = error.message ?? error.type
        reject(new Error(error.message ?? error.type))
      },
    })
    client.requestAccessToken({ prompt })
  })
}

/** Explicit user-initiated sign-in (shows consent screen on first use). */
export function signIn(): Promise<string> {
  return requestToken('consent')
}

export function signOut() {
  if (currentToken) {
    window.google?.accounts.oauth2.revoke(currentToken.accessToken)
  }
  storeToken(null)
}

/**
 * Returns a valid access token, silently refreshing if it's expired or
 * near-expiry. Throws if silent refresh fails (e.g. session revoked) — callers
 * should catch this and prompt the user to sign in again via signIn().
 */
export async function getAccessToken(): Promise<string> {
  if (currentToken && currentToken.expiresAt - EXPIRY_SAFETY_MARGIN_MS > Date.now()) {
    return currentToken.accessToken
  }
  if (pendingRequest) return pendingRequest
  pendingRequest = requestToken('').finally(() => {
    pendingRequest = null
  })
  return pendingRequest
}

if (currentToken) {
  isSignedIn.value = true
}
