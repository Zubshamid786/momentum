// bootstrapApi.js — decides which data backend powers window.api, in priority order:
//
//   1. 'turso'    — cloud creds stored (works in BOTH the browser and the desktop
//                   app; on desktop this overrides the local database so every
//                   device shares one cloud DB)
//   2. 'electron' — desktop preload bridge, local SQLite (no cloud creds saved)
//   3. 'rest'     — served from the Mac's built-in server (WiFi / Tailscale PWA)
//   4. 'setup'    — nothing available → show the CloudSetup screen
//
// Note: the preload exposes window.electronApi (not window.api) because
// contextBridge properties are read-only — window.api must stay assignable
// so cloud mode can take over on desktop.
import { getStoredCreds, connect, clearCreds } from '../data/queryClient'

const SCHEMA_FLAG = 'momentum_turso_schema_r1'

export async function bootstrapApi() {
  // 1. Turso cloud mode — highest priority everywhere once connected
  const creds = getStoredCreds()
  if (creds) {
    try {
      connect(creds)
      const { buildTursoApi, initSchema } = await import('../data/tursoApi')
      // Idempotent schema init — run once per browser, cheap flag check after
      if (!localStorage.getItem(SCHEMA_FLAG)) {
        await initSchema()
        localStorage.setItem(SCHEMA_FLAG, '1')
      }
      window.api = buildTursoApi()
      return 'turso'
    } catch (err) {
      console.error('[Momentum] Turso connection failed:', err)
      // Auth revoked / DB deleted → clear and fall through
      clearCreds()
      localStorage.removeItem(SCHEMA_FLAG)
    }
  }

  // 2. Electron desktop — local SQLite over IPC
  if (window.electronApi) {
    window.api = window.electronApi
    return 'electron'
  }

  // 3. REST polyfill — only if this origin actually serves the Momentum API
  try {
    const ctrl = new AbortController()
    const t = setTimeout(() => ctrl.abort(), 1500)
    const res = await fetch(window.location.origin + '/api/projects', { signal: ctrl.signal })
    clearTimeout(t)
    // Must be real JSON — SPA-fallback hosts (vite dev, Netlify, etc.) answer
    // unknown paths with index.html + 200, which is NOT the Momentum API
    const isJson = (res.headers.get('content-type') || '').includes('json')
    if (res.ok && isJson) {
      await import('./apiPolyfill')   // installs REST-backed window.api on import
      return 'rest'
    }
  } catch (_) { /* no server on this origin */ }

  // 4. Nothing available → first-run cloud setup
  return 'setup'
}
