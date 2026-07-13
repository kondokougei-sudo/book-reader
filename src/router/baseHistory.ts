import type { CustomHistory, Location } from 'preact-router'

// Vite's `base` (e.g. '/book-reader/') means the real browser pathname is
// prefixed with the repo path, but our route definitions ("/library",
// "/read/:fileId", ...) are app-relative. This adapter translates between
// the two so preact-router keeps working regardless of the deployed base path.
const BASE = import.meta.env.BASE_URL.replace(/\/$/, '')

function toAppPath(pathname: string): string {
  if (BASE && pathname.startsWith(BASE)) {
    const rest = pathname.slice(BASE.length)
    return rest === '' ? '/' : rest
  }
  return pathname
}

function toRealPath(appPath: string): string {
  const normalized = appPath.startsWith('/') ? appPath : `/${appPath}`
  return BASE + normalized
}

function currentLocation(): Location {
  return { pathname: toAppPath(window.location.pathname), search: window.location.search }
}

export const baseAwareHistory: CustomHistory = {
  get location() {
    return currentLocation()
  },
  listen(callback) {
    const handler = () => callback(currentLocation())
    window.addEventListener('popstate', handler)
    return () => window.removeEventListener('popstate', handler)
  },
  push(path) {
    window.history.pushState(null, '', toRealPath(path))
  },
  replace(path) {
    window.history.replaceState(null, '', toRealPath(path))
  },
}
