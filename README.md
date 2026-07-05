# Momentum — Technical Guide

A personal productivity tracker: projects, tasks, subtasks, time tracking, Pomodoro, planning calendar, journal, reports, and 4DX goals. One codebase runs as a macOS desktop app, an installable Android/iOS PWA, and a plain web app — all sharing a single cloud database.

**Live app:** https://zubshamid786.github.io/momentum/

---

## Architecture

The core idea: every UI component talks to a single abstraction, `window.api` (~75 async functions). At startup, `src/utils/bootstrapApi.js` decides which backend implements it, in priority order:

```
┌─────────────────────────────────────────────────────────────┐
│                     React UI (src/)                         │
│                 always calls window.api.*                    │
└──────────────────────────┬──────────────────────────────────┘
                           │  bootstrapApi.js picks ONE:
     ┌─────────────────────┼─────────────────────┬────────────────┐
     ▼ 1. Turso creds?     ▼ 2. Electron?        ▼ 3. Mac server? │ 4. else
┌───────────────┐   ┌───────────────────┐   ┌──────────────────┐  │
│ tursoApi.js   │   │ window.electronApi │   │ apiPolyfill.js   │  ▼
│ SQL over HTTPS│   │ IPC → main process │   │ REST → :3001     │  CloudSetup
│ → Turso cloud │   │ → local SQLite     │   │ → Mac's SQLite   │  screen
└───────────────┘   └───────────────────┘   └──────────────────┘
```

| Mode | When | Data lives in |
|---|---|---|
| **turso** | Turso creds saved in localStorage (any platform) | Turso cloud (libsql), shared across devices |
| **electron** | Desktop app, no cloud creds | Local SQLite via better-sqlite3 |
| **rest** | Browser served from the Mac (WiFi/Tailscale PWA) | The Mac's local SQLite |
| **setup** | Nothing available | — shows the connect screen |

**Why `window.electronApi` and not `window.api` in the preload:** `contextBridge.exposeInMainWorld` creates read-only properties. `window.api` must stay assignable so cloud mode can take over on desktop; the bootstrap maps `window.api = window.electronApi` when local mode wins.

## Stack

- **UI:** React 18, Vite, Tailwind CSS (custom `th-*` theme tokens, dark/light)
- **Desktop shell:** Electron + better-sqlite3 (local DB) + a built-in HTTP API server (`electron/api-server.js`) for the WiFi/Tailscale PWA mode
- **Cloud DB:** [Turso](https://turso.tech) (libsql — SQLite-compatible, HTTPS), region `aws-ap-south-1` (Mumbai)
- **Hosting:** GitHub Pages, `gh-pages` branch
- **Charts:** Recharts · **DnD:** @dnd-kit · **Icons:** lucide-react

## Project structure

```
electron/
  main.js            Electron main process + all IPC handlers
  preload.js         contextBridge → window.electronApi
  database.js        ★ SOURCE OF TRUTH for all SQL (better-sqlite3, sync)
  api-server.js      HTTP mirror of the API for the mobile/Tailscale PWA
src/
  data/
    tursoDb.js       ★ AUTO-GENERATED async port of database.js — do not hand-edit
    queryClient.js   libsql bridge: q.all/get/run/exec, creds in localStorage
    tursoApi.js      maps the window.api surface → tursoDb functions
  utils/
    bootstrapApi.js  backend selection (see Architecture)
    apiPolyfill.js   REST-backed window.api for Mac-server mode
  components/        feature folders (Dashboard, Projects, Calendar, …)
  components/Setup/CloudSetup.jsx   first-run Turso connect screen
scripts/
  port-db-to-turso.mjs    regenerates tursoDb.js from database.js
  patch-turso-port.mjs    post-transform fixes (run after the port script)
  migrate-to-turso.mjs    one-time local→cloud data copy (WIPE=1 for fresh snapshot)
  deploy-pages.sh         build + publish to GitHub Pages
```

## The generated data layer (important)

`src/data/tursoDb.js` is **generated**, not written. All SQL lives once, in `electron/database.js`. After changing any query there:

```bash
node scripts/port-db-to-turso.mjs && node scripts/patch-turso-port.mjs
npx vite build   # will surface any await-in-non-async misses
```

The transform converts sync better-sqlite3 calls to `await q.*` calls. Known hand-patched cases (encoded in the patch script): the one transaction (`setDailyIntentions`), reused prepared statements, named-vs-positional arg mixes, and `.map()` callbacks containing awaits. If you add new code using those patterns, extend the patch script.

## Development

```bash
npm install
npm run dev          # Electron + Vite dev (desktop)
npx vite             # web-only dev server (boots to CloudSetup without creds)
```

## Builds & deploys

| Target | Command | Output |
|---|---|---|
| Web (GitHub Pages) | `bash scripts/deploy-pages.sh` | live in ~1 min |
| Desktop DMG | `npm run build` | `release/Momentum-1.0.0-arm64.dmg` (+x64) |

Pages deploys force-push `dist/` to the `gh-pages` branch (no CI — the Actions workflow in `.github/` is gitignored because the current `gh` token lacks `workflow` scope; run `gh auth refresh -s workflow` and un-ignore it to switch to push-to-deploy).

If a Pages deploy doesn't appear after ~5 min, the build may be stuck server-side:
```bash
gh api repos/Zubshamid786/momentum/pages/builds/latest --jq .status
gh api repos/Zubshamid786/momentum/pages/builds -X POST    # force rebuild
```

## Cloud data & credentials

- Credentials (Turso URL + token) are entered once per device and stored **only in that device's localStorage** — never in the repo (which is public).
- Schema is created idempotently on first connect (`initSchema()`), gated by a localStorage flag.
- Fresh cloud snapshot from the Mac's local DB:
  ```bash
  WIPE=1 TURSO_DATABASE_URL=libsql://… TURSO_AUTH_TOKEN=… node scripts/migrate-to-turso.mjs
  ```
  (Uses Node's built-in `node:sqlite` — better-sqlite3's binary is often left x64 by Electron builds.)
- Token revocation: Turso dashboard → revoke → generate new → re-enter on each device (Settings → Cloud Sync, or the setup screen).

## Hard-won gotchas

1. **Tailwind `md:` breakpoints are unreliable in the Android PWA.** For layout switching use a ResizeObserver on the container (see `MountainView.jsx`) or explicit props (see `TaskDetail`'s `panel` prop).
2. **SQLite `date('now')` is UTC.** Date-only timestamps must be anchored at *noon local* so they land on the correct calendar day in every timezone (see manual time entry).
3. **PWA on a subpath needs relative manifest paths** — `start_url: "./"`, `scope: "./"`, and real 192/512 PNG icons, or Android installs a Chrome-badged shortcut instead of a WebAPK.
4. **`(await …)` statement lines need a leading `;`** in the generated code — ASI can glue them to the previous line as a call expression.
5. **libsql rejects `undefined` args** (better-sqlite3 tolerated extra named params) — `queryClient.cleanArgs` strips them.
