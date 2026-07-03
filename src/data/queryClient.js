// queryClient.js — thin async SQL layer over Turso (libsql via HTTPS).
// Exposes the same q.all / q.get / q.run / q.exec shape that tursoDb.js expects,
// mirroring better-sqlite3 semantics (named @params, lastInsertRowid, etc.).
import { createClient } from '@libsql/client/web'

let client = null

const LS_URL   = 'momentum_turso_url'
const LS_TOKEN = 'momentum_turso_token'

export function getStoredCreds() {
  const url   = localStorage.getItem(LS_URL)
  const token = localStorage.getItem(LS_TOKEN)
  return url && token ? { url, token } : null
}

export function storeCreds(url, token) {
  localStorage.setItem(LS_URL, url.trim())
  localStorage.setItem(LS_TOKEN, token.trim())
}

export function clearCreds() {
  localStorage.removeItem(LS_URL)
  localStorage.removeItem(LS_TOKEN)
}

export function connect({ url, token }) {
  // libsql:// URLs are dialed over HTTPS from the browser
  const httpUrl = url.replace(/^libsql:\/\//, 'https://')
  client = createClient({ url: httpUrl, authToken: token, intMode: 'number' })
  return client
}

// Strip undefined values: libsql rejects them (better-sqlite3 tolerated extras)
function cleanArgs(args) {
  if (args == null) return undefined
  if (Array.isArray(args)) return args.map(v => (v === undefined ? null : v))
  const out = {}
  for (const [k, v] of Object.entries(args)) if (v !== undefined) out[k] = v
  return out
}

// libsql rows are array-like; build clean plain objects keyed by column name
function toObjects(rs) {
  const cols = rs.columns
  return rs.rows.map(r => {
    const o = {}
    for (let i = 0; i < cols.length; i++) o[cols[i]] = r[i]
    return o
  })
}

async function execute(sql, args) {
  if (!client) throw new Error('Not connected to Turso')
  return client.execute(args !== undefined ? { sql, args } : sql)
}

export const q = {
  async all(sql, args) {
    return toObjects(await execute(sql, cleanArgs(args)))
  },
  async get(sql, args) {
    const rows = toObjects(await execute(sql, cleanArgs(args)))
    return rows[0]
  },
  async run(sql, args) {
    const rs = await execute(sql, cleanArgs(args))
    return {
      lastInsertRowid: rs.lastInsertRowid != null ? Number(rs.lastInsertRowid) : undefined,
      changes: rs.rowsAffected,
    }
  },
  // Multi-statement DDL (schema init) and single ALTERs
  async exec(sql) {
    if (!client) throw new Error('Not connected to Turso')
    return client.executeMultiple(sql)
  },
}
