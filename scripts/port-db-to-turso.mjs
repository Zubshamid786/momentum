// Transforms electron/database.js (better-sqlite3, sync) into
// src/data/tursoDb.js (libsql over HTTPS, async).
//
// Mechanical rules:
//   db.prepare(<sql>).all(args)  → (await q.all(<sql>, [args]))
//   db.prepare(<sql>).get(args)  → (await q.get(<sql>, [args]))
//   db.prepare(<sql>).run(args)  → (await q.run(<sql>, args|[args]))
//   db.exec(<sql>)               → await q.exec(<sql>)
//   function X(...)              → async function X(...)
// Top-level init code (schema + migrations) is wrapped in initSchema().
// Three known special cases are patched explicitly at the end.
import fs from 'node:fs'

const SRC = 'electron/database.js'
const OUT = 'src/data/tursoDb.js'

let src = fs.readFileSync(SRC, 'utf8')
const lines = src.split('\n')

// ── 1. Split: header (drop) / init block (wrap) / body (functions) ───────────
const firstFnIdx = lines.findIndex(l => /^function /.test(l))
if (firstFnIdx < 0) throw new Error('no top-level function found')

// header = everything up to the first db.exec / migration statement
// find end of the require/const header (first line that starts init work)
let initStart = lines.findIndex(l => /db\.exec\(|db\.pragma\(/.test(l))
if (initStart < 0) throw new Error('no init start found')

const initBlock = lines.slice(initStart, firstFnIdx).join('\n')
let   body      = lines.slice(firstFnIdx).join('\n')

// ── 2. Transform helpers ──────────────────────────────────────────────────────
const SQL_LIT = '(`[\\s\\S]*?`|\'(?:[^\'\\\\]|\\\\.)*\'|"(?:[^"\\\\]|\\\\.)*")'
const ARGS    = '((?:[^()]|\\([^()]*\\))*)'   // args, tolerating one nesting level

function wrapArgs(method, args) {
  const a = args.trim()
  if (!a) return ''
  if (a.startsWith('{')) return ', ' + a            // named params object → pass through
  return ', [' + a + ']'                            // positional → array
}

function transform(code) {
  // db.prepare(<lit>).all/get/run(<args>)
  code = code.replace(
    new RegExp('db\\.prepare\\(\\s*' + SQL_LIT + '\\s*\\)\\.(all|get|run)\\(' + ARGS + '\\)', 'g'),
    (_, sql, method, args) => `(await q.${method}(${sql}${wrapArgs(method, args)}))`
  )
  // db.prepare(<identifier>).all/get/run(<args>)  — dynamic SQL vars
  code = code.replace(
    new RegExp('db\\.prepare\\(([A-Za-z_$][\\w$]*)\\)\\.(all|get|run)\\(' + ARGS + '\\)', 'g'),
    (_, sqlVar, method, args) => `(await q.${method}(${sqlVar}${wrapArgs(method, args)}))`
  )
  // db.exec(<lit or identifier>)
  code = code.replace(
    new RegExp('db\\.exec\\(\\s*' + SQL_LIT + '\\s*\\)', 'g'),
    (_, sql) => `await q.exec(${sql})`
  )
  code = code.replace(/db\.exec\(([A-Za-z_$][\w$]*)\)/g, 'await q.exec($1)')
  return code
}

let init = transform(initBlock)
body = transform(body)

// ── 3. Async-ify functions ────────────────────────────────────────────────────
body = body.replace(/^function /gm, 'async function ')
// the one intra-module call
body = body.replace(/const inbox = getInboxProject\(\)/, 'const inbox = await getInboxProject()')

// drop pragmas (not applicable over HTTP)
init = init.replace(/^.*db\.pragma\(.*$\n?/gm, '')

// ── 4. Exports: module.exports → export default ──────────────────────────────
body = body.replace(/module\.exports\s*=\s*{/, 'export default {\n  initSchema,')

// ── 5. Assemble ───────────────────────────────────────────────────────────────
const out = `// AUTO-GENERATED from electron/database.js by scripts/port-db-to-turso.mjs
// Async port of the full data layer, running SQL against Turso (libsql over HTTPS).
// Do not edit electron/database.js and this file independently — regenerate.
import { q } from './queryClient.js'

export async function initSchema() {
${init.split('\n').map(l => '  ' + l).join('\n')}
}

${body}
`
fs.writeFileSync(OUT, out)
console.log('Wrote', OUT, '—', out.split('\n').length, 'lines')

// Report leftovers that need manual attention
const leftovers = []
out.split('\n').forEach((l, i) => {
  if (/\bdb\./.test(l)) leftovers.push(`${i + 1}: ${l.trim()}`)
})
console.log(leftovers.length ? 'MANUAL FIXES NEEDED:\n' + leftovers.join('\n') : 'No db.* leftovers ✓')
