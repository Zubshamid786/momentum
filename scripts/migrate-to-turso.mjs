// migrate-to-turso.mjs — one-time upload of the local Momentum database to Turso.
//
// Usage:
//   TURSO_DATABASE_URL=libsql://your-db-xxx.turso.io \
//   TURSO_AUTH_TOKEN=eyJ... \
//   node scripts/migrate-to-turso.mjs
//
// Reads the desktop app's SQLite file, mirrors its exact schema (tables + indexes)
// into Turso, then copies every row preserving ids. Refuses to run against a
// non-empty target unless FORCE=1.
import { DatabaseSync } from 'node:sqlite'
import { createClient } from '@libsql/client'
import os from 'node:os'
import path from 'node:path'
import fs from 'node:fs'

const url   = process.env.TURSO_DATABASE_URL
const token = process.env.TURSO_AUTH_TOKEN
if (!url || !token) {
  console.error('Set TURSO_DATABASE_URL and TURSO_AUTH_TOKEN env vars first.')
  process.exit(1)
}

const dbPath = process.env.DB_PATH ||
  path.join(os.homedir(), 'Library/Application Support/productivity-tracker/productivity.db')
if (!fs.existsSync(dbPath)) {
  console.error('Local database not found at:', dbPath, '\nOverride with DB_PATH=...')
  process.exit(1)
}

const local = new DatabaseSync(dbPath, { readOnly: true })
const turso = createClient({ url, authToken: token })

// FK-safe order: parents before children
const TABLE_ORDER = [
  'projects', 'tasks', 'subtasks', 'time_entries', 'comments',
  'tags', 'task_tags', 'habit_completions', 'templates', 'settings',
  'notes', 'time_blocks', 'milestones', 'daily_intentions', 'daily_reviews',
  'wigs', 'wig_commitments', 'weekly_commitments', 'task_dependencies',
]

const schemaRows = local.prepare(`
  SELECT name, type, sql FROM sqlite_master
  WHERE sql IS NOT NULL AND name NOT LIKE 'sqlite_%'
`).all()

const tables  = schemaRows.filter(r => r.type === 'table')
const indexes = schemaRows.filter(r => r.type === 'index')
const known   = new Set(tables.map(t => t.name))
const ordered = [
  ...TABLE_ORDER.filter(t => known.has(t)),
  ...tables.map(t => t.name).filter(t => !TABLE_ORDER.includes(t)),
]

console.log(`Local DB: ${dbPath}`)
console.log(`Tables:   ${ordered.join(', ')}`)

// ── 1. Mirror schema ──────────────────────────────────────────────────────────
for (const t of tables) {
  const ddl = t.sql.replace(/^CREATE TABLE\s+/i, 'CREATE TABLE IF NOT EXISTS ')
  await turso.execute(ddl)
}
for (const ix of indexes) {
  const ddl = ix.sql.replace(/^CREATE( UNIQUE)? INDEX\s+/i, 'CREATE$1 INDEX IF NOT EXISTS ')
  await turso.execute(ddl)
}
console.log('Schema mirrored ✓')

// ── 2. Safety check / wipe ────────────────────────────────────────────────────
if (process.env.WIPE === '1') {
  // Children before parents so FKs don't block the deletes
  for (const table of [...ordered].reverse()) {
    await turso.execute(`DELETE FROM ${table}`)
  }
  console.log('Target wiped ✓ (fresh snapshot)')
} else {
  const probe = await turso.execute(`SELECT COUNT(*) AS n FROM ${ordered[0]}`)
  if (Number(probe.rows[0].n) > 0 && process.env.FORCE !== '1') {
    console.error(`Target already has data in "${ordered[0]}" — aborting. Re-run with WIPE=1 for a fresh snapshot, or FORCE=1 to append.`)
    process.exit(1)
  }
}

// ── 3. Copy data ──────────────────────────────────────────────────────────────
let grand = 0
for (const table of ordered) {
  const rows = local.prepare(`SELECT * FROM ${table}`).all()
  if (!rows.length) { console.log(`${table}: 0 rows`); continue }

  const cols = Object.keys(rows[0])
  const sql  = `INSERT OR IGNORE INTO ${table} (${cols.join(', ')}) VALUES (${cols.map(() => '?').join(', ')})`

  const CHUNK = 50
  for (let i = 0; i < rows.length; i += CHUNK) {
    const batch = rows.slice(i, i + CHUNK).map(r => ({
      sql,
      args: cols.map(c => r[c] === undefined ? null : r[c]),
    }))
    await turso.batch(batch, 'write')
  }
  grand += rows.length
  console.log(`${table}: ${rows.length} rows ✓`)
}

// ── 4. Verify ─────────────────────────────────────────────────────────────────
console.log('\nVerification (local → turso):')
let mismatches = 0
for (const table of ordered) {
  const l = local.prepare(`SELECT COUNT(*) AS n FROM ${table}`).get().n
  const r = Number((await turso.execute(`SELECT COUNT(*) AS n FROM ${table}`)).rows[0].n)
  const ok = l === r
  if (!ok) mismatches++
  console.log(`  ${table}: ${l} → ${r} ${ok ? '✓' : '✗ MISMATCH'}`)
}
console.log(mismatches === 0
  ? `\nDone — ${grand} rows migrated, all counts match ✓`
  : `\nDone with ${mismatches} count mismatches — investigate before relying on the cloud copy.`)
