/**
 * api-server.js  —  zero external dependencies
 *
 * A lightweight HTTP server built entirely on Node.js built-ins (http, url,
 * path, fs, os). Mirrors every Electron IPC handler so the React frontend
 * can run in a mobile browser on the same WiFi network.
 */

const http = require('http')
const path = require('path')
const fs   = require('fs')
const os   = require('os')

// ── Helpers ───────────────────────────────────────────────────────────────────
// Tailscale assigns addresses in the CGNAT range 100.64.0.0/10
function isTailscale(addr) {
  const p = addr.split('.').map(Number)
  return p[0] === 100 && p[1] >= 64 && p[1] <= 127
}

// Local LAN IP — prefer common private ranges, explicitly skip the Tailscale range
function getLocalIP() {
  const ifaces = os.networkInterfaces()
  let fallback = '127.0.0.1'
  for (const name of Object.keys(ifaces)) {
    for (const iface of ifaces[name]) {
      if (iface.family !== 'IPv4' || iface.internal) continue
      if (isTailscale(iface.address)) continue
      const p = iface.address.split('.').map(Number)
      if (p[0] === 192 && p[1] === 168) return iface.address
      if (p[0] === 10) return iface.address
      if (p[0] === 172 && p[1] >= 16 && p[1] <= 31) return iface.address
      fallback = iface.address
    }
  }
  return fallback
}

// Tailscale IP (100.64.0.0/10), or null if Tailscale isn't up
function getTailscaleIP() {
  const ifaces = os.networkInterfaces()
  for (const name of Object.keys(ifaces)) {
    for (const iface of ifaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal && isTailscale(iface.address)) return iface.address
    }
  }
  return null
}

function parseJSON(str, fallback = {}) {
  try { return str ? JSON.parse(str) : fallback } catch { return fallback }
}

// Read the full request body as parsed JSON
function readBody(req) {
  return new Promise(resolve => {
    let data = ''
    req.on('data', chunk => { data += chunk })
    req.on('end',  () => { try { resolve(JSON.parse(data)) } catch { resolve({}) } })
    req.on('error',() => resolve({}))
  })
}

// Match a route pattern like /api/tasks/:id against a pathname.
// Returns a params object on match, or null on miss.
function matchRoute(pattern, pathname) {
  const pp = pattern.split('/')
  const up = pathname.split('/')
  if (pp.length !== up.length) return null
  const params = {}
  for (let i = 0; i < pp.length; i++) {
    if (pp[i].startsWith(':')) {
      params[pp[i].slice(1)] = decodeURIComponent(up[i])
    } else if (pp[i] !== up[i]) {
      return null
    }
  }
  return params
}

// MIME types for static file serving
const MIME = {
  '.html':  'text/html; charset=utf-8',
  '.js':    'application/javascript',
  '.mjs':   'application/javascript',
  '.css':   'text/css',
  '.json':  'application/json',
  '.png':   'image/png',
  '.jpg':   'image/jpeg',
  '.jpeg':  'image/jpeg',
  '.svg':   'image/svg+xml',
  '.ico':   'image/x-icon',
  '.woff':  'font/woff',
  '.woff2': 'font/woff2',
  '.ttf':   'font/ttf',
}

// ── Main export ───────────────────────────────────────────────────────────────
function startApiServer(db, port = 3001) {
  return new Promise(resolve => {
    const distPath = path.join(__dirname, '../dist')
    const routes   = []   // { method, pattern, handler }

    // Convenience: register a route
    function R(method, pattern, fn) {
      routes.push({ method, pattern, fn })
    }

    // Convenience: wrap a db call — returns the result as JSON or 500
    function db_(fn) { return fn }   // fn receives (params, query, body) → value

    // ── Projects ──────────────────────────────────────────────────────────────
    R('GET',    '/api/projects',            (p,q)   => db.getProjects())
    R('POST',   '/api/projects',            (p,q,b) => db.createProject(b))
    R('PUT',    '/api/projects/:id',        (p,q,b) => db.updateProject(+p.id, b))
    R('DELETE', '/api/projects/:id',        (p)     => db.deleteProject(+p.id))

    // ── Tasks ─────────────────────────────────────────────────────────────────
    R('GET',    '/api/tasks/summary',       ()      => db.getTasksSummary())
    R('GET',    '/api/tasks/active-subtasks',()     => db.getAllActiveSubtasks())
    R('GET',    '/api/tasks',               (p,q)   => db.getTasksByProject(q.projectId ? +q.projectId : undefined))
    R('GET',    '/api/tasks/:id',           (p)     => db.getTask(+p.id))
    R('POST',   '/api/tasks',               (p,q,b) => db.createTask(b))
    R('PUT',    '/api/tasks/:id',           (p,q,b) => db.updateTask(+p.id, b))
    R('DELETE', '/api/tasks/:id',           (p)     => db.deleteTask(+p.id))

    // ── Time Entries ──────────────────────────────────────────────────────────
    R('GET',    '/api/time-entries/active', ()      => db.getActiveTimer())
    R('GET',    '/api/time-entries',        (p,q)   => db.getTimeEntries(parseJSON(q.filters)))
    R('POST',   '/api/time-entries',        (p,q,b) => db.createTimeEntry(b))
    R('PUT',    '/api/time-entries/:id',    (p,q,b) => db.updateTimeEntry(+p.id, b))
    R('POST',   '/api/time-entries/:id/stop',(p,q,b)=> db.stopTimer(+p.id, b.endTime, b.duration))
    R('DELETE', '/api/time-entries/:id',    (p)     => db.deleteTimeEntry(+p.id))

    // ── Comments ──────────────────────────────────────────────────────────────
    R('GET',    '/api/comments',            (p,q)   => db.getComments(+q.taskId))
    R('POST',   '/api/comments',            (p,q,b) => db.createComment(b))
    R('PUT',    '/api/comments/:id',        (p,q,b) => db.updateComment(+p.id, b))
    R('DELETE', '/api/comments/:id',        (p)     => db.deleteComment(+p.id))

    // ── Dashboard / Reports ───────────────────────────────────────────────────
    R('GET',    '/api/dashboard',           (p,q)   => db.getDashboardData(+(q.tzOffset||0)))
    R('GET',    '/api/reports',             (p,q)   => db.getReportData(parseJSON(q.filters)))
    R('GET',    '/api/overdue-tasks',       ()      => db.getOverdueTasks())

    // ── Calendar ──────────────────────────────────────────────────────────────
    R('GET',    '/api/calendar-tasks',      ()      => db.getCalendarTasks())
    R('GET',    '/api/daily-summary',       ()      => db.getDailySummary())
    R('GET',    '/api/day-schedule',        (p,q)   => db.getDaySchedule(q.date))
    R('GET',    '/api/search',              (p,q)   => db.searchAll(q.q || ''))

    // ── Tags ─────────────────────────────────────────────────────────────────
    R('GET',    '/api/tags',                ()      => db.getTags())
    R('POST',   '/api/tags',                (p,q,b) => db.createTag(b))
    R('DELETE', '/api/tags/:id',            (p)     => db.deleteTag(+p.id))
    R('GET',    '/api/task-tags',           (p,q)   => db.getTaskTags(+q.taskId))
    R('PUT',    '/api/task-tags/:taskId',   (p,q,b) => db.setTaskTags(+p.taskId, b.ids))

    // ── Habits ────────────────────────────────────────────────────────────────
    R('GET',    '/api/habits',              ()      => db.getHabitData())
    R('POST',   '/api/habits/toggle',       (p,q,b) => db.toggleHabitCompletion(b.taskId, b.date))

    // ── Templates ─────────────────────────────────────────────────────────────
    R('GET',    '/api/templates',           ()      => db.getTemplates())
    R('POST',   '/api/templates',           (p,q,b) => db.saveTemplate(b.projectId, b.name))
    R('POST',   '/api/templates/:id/create',(p,q,b) => db.createProjectFromTemplate(+p.id, b))
    R('DELETE', '/api/templates/:id',       (p)     => db.deleteTemplate(+p.id))

    // ── Reviews ───────────────────────────────────────────────────────────────
    R('GET',    '/api/weekly-review',       (p,q)   => db.getWeeklyReview(+(q.tzOffset||0)))
    R('GET',    '/api/monthly-review',      ()      => db.getMonthlyReview())
    R('GET',    '/api/review-comparison',   ()      => db.getReviewComparison())
    R('GET',    '/api/project-diagram',     (p,q)   => db.getProjectDiagram(+q.projectId))
    R('POST',   '/api/dependencies',        (p,q,b) => db.addDependency(b.taskId, b.dependsOnId))
    R('POST',   '/api/dependencies/remove', (p,q,b) => db.removeDependency(b.taskId, b.dependsOnId))

    // ── Milestones ────────────────────────────────────────────────────────────
    R('GET',    '/api/milestones',          (p,q)   => db.getMilestones(+q.projectId))

    // ── Subtasks ──────────────────────────────────────────────────────────────
    R('GET',    '/api/subtasks',            (p,q)   => db.getSubtasks(+q.taskId))
    R('POST',   '/api/subtasks',            (p,q,b) => db.createSubtask(b))
    R('PUT',    '/api/subtasks/:id/toggle', (p)     => db.toggleSubtask(+p.id))
    R('PUT',    '/api/subtasks/:id',        (p,q,b) => db.updateSubtask(+p.id, b.title, b.estimate))
    R('DELETE', '/api/subtasks/:id',        (p)     => db.deleteSubtask(+p.id))

    // ── Settings ─────────────────────────────────────────────────────────────
    R('GET',    '/api/settings',            ()      => db.getAllSettings())
    R('PUT',    '/api/settings/:key',       (p,q,b) => db.setSetting(decodeURIComponent(p.key), b.value))

    // ── Notes / Journal ───────────────────────────────────────────────────────
    R('GET',    '/api/notes/recent',        ()      => db.getRecentNotes())
    R('GET',    '/api/notes/month',         (p,q)   => db.getNoteMonthDates(+q.year, +q.month))
    R('GET',    '/api/notes/:date',         (p)     => db.getNote(p.date))
    R('PUT',    '/api/notes/:date',         (p,q,b) => db.saveNote(p.date, b.content))

    // ── Time Blocks ───────────────────────────────────────────────────────────
    R('GET',    '/api/time-blocks',         (p,q)   => db.getTimeBlocks(q.date))
    R('POST',   '/api/time-blocks',         (p,q,b) => db.createTimeBlock(b))
    R('PUT',    '/api/time-blocks/:id',     (p,q,b) => db.updateTimeBlock(+p.id, b))
    R('DELETE', '/api/time-blocks/:id',     (p)     => db.deleteTimeBlock(+p.id))

    // ── Breakdowns / Charts ───────────────────────────────────────────────────
    R('GET',    '/api/breakdown/today',     ()      => db.getTodayBreakdown())
    R('GET',    '/api/breakdown/month',     ()      => db.getMonthBreakdown())
    R('GET',    '/api/completed-tasks',     ()      => db.getCompletedTasks())
    R('GET',    '/api/chart-data',          (p,q)   => db.getChartData(parseJSON(q.filters)))

    // ── WIGs / 4DX ───────────────────────────────────────────────────────────
    R('GET',    '/api/wigs',                ()      => db.getWigs())
    R('POST',   '/api/wigs',                (p,q,b) => db.createWig(b))
    R('PUT',    '/api/wigs/:id',            (p,q,b) => db.updateWig(+p.id, b))
    R('DELETE', '/api/wigs/:id',            (p)     => db.deleteWig(+p.id))
    R('GET',    '/api/scoreboard',          ()      => db.getScoreboardData())
    R('POST',   '/api/wigs/:wigId/commitment',(p,q,b)=>db.saveWigCommitment(+p.wigId, b.weekStart, b.text))
    R('GET',    '/api/weekly-commitment',   (p,q)   => db.getWeeklyCommitment(q.weekStart))
    R('PUT',    '/api/weekly-commitment',   (p,q,b) => db.saveWeeklyCommitment(b.weekStart, b.text))

    // ── Inbox ─────────────────────────────────────────────────────────────────
    R('GET',    '/api/inbox',               ()      => db.getInboxTasks())
    R('POST',   '/api/inbox/:taskId/process',(p,q,b)=> db.processInboxTask(+p.taskId, +b.projectId))

    // ── Daily Intentions ─────────────────────────────────────────────────────
    R('GET',    '/api/intentions',          (p,q)   => db.getDailyIntentions(q.date))
    R('PUT',    '/api/intentions',          (p,q,b) => db.setDailyIntentions(b.date, b.items))

    // ── Heatmap / Work type ───────────────────────────────────────────────────
    R('GET',    '/api/heatmap',             (p,q)   => db.getProductivityHeatmap(+(q.tzOffset||0)))
    R('GET',    '/api/work-type',           (p,q)   => db.getWorkTypeBreakdown(+(q.tzOffset||0)))

    // ── Daily Review ──────────────────────────────────────────────────────────
    R('GET',    '/api/daily-review',        (p,q)   => db.getDailyReview(q.date))
    R('POST',   '/api/daily-review',        (p,q,b) => db.saveDailyReview(b.date, b.data))

    // ── HTTP server ───────────────────────────────────────────────────────────
    const server = http.createServer(async (req, res) => {
      // CORS headers on every response
      res.setHeader('Access-Control-Allow-Origin',  '*')
      res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS')
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

      if (req.method === 'OPTIONS') { res.writeHead(200); res.end(); return }

      // Parse URL
      let parsedUrl
      try { parsedUrl = new URL(req.url, `http://localhost`) }
      catch { res.writeHead(400); res.end('Bad URL'); return }

      const pathname = parsedUrl.pathname
      const query    = Object.fromEntries(parsedUrl.searchParams.entries())

      // Read body for mutating methods
      const body = (req.method === 'POST' || req.method === 'PUT') ? await readBody(req) : {}

      // ── Try API routes ───────────────────────────────────────────────────
      for (const route of routes) {
        if (route.method !== req.method) continue
        const params = matchRoute(route.pattern, pathname)
        if (params === null) continue

        try {
          const result = route.fn(params, query, body)
          const json   = JSON.stringify(result ?? null)
          res.setHeader('Content-Type', 'application/json')
          res.writeHead(200)
          res.end(json)
        } catch (e) {
          console.error('[API]', route.pattern, e.message)
          res.setHeader('Content-Type', 'application/json')
          res.writeHead(500)
          res.end(JSON.stringify({ error: e.message }))
        }
        return
      }

      // ── Static file serving ──────────────────────────────────────────────
      // Only serve real files; fall back to index.html for SPA routes
      const ext      = path.extname(pathname)
      const filePath = path.join(distPath, pathname)

      if (ext && fs.existsSync(filePath)) {
        const mime = MIME[ext] || 'application/octet-stream'
        res.setHeader('Content-Type', mime)
        res.writeHead(200)
        fs.createReadStream(filePath).pipe(res)
        return
      }

      // SPA fallback — serve index.html for all other paths
      const indexPath = path.join(distPath, 'index.html')
      if (fs.existsSync(indexPath)) {
        res.setHeader('Content-Type', 'text/html; charset=utf-8')
        res.writeHead(200)
        fs.createReadStream(indexPath).pipe(res)
      } else {
        res.writeHead(404)
        res.end('Momentum dist/ not found. Run npm run build first.')
      }
    })

    // Auto-increment port on conflict
    function tryListen(p) {
      server.listen(p, '0.0.0.0', () => {
        const ip          = getLocalIP()
        const tailscaleIp = getTailscaleIP()
        const url          = `http://${ip}:${p}`
        const tailscaleUrl = tailscaleIp ? `http://${tailscaleIp}:${p}` : null
        console.log(`[Momentum] Mobile API listening at ${url}${tailscaleUrl ? ` · Tailscale ${tailscaleUrl}` : ''}`)
        resolve({ server, url, ip, tailscaleUrl, tailscaleIp, port: p })
      })
      server.once('error', err => {
        if (err.code === 'EADDRINUSE') { server.close(); tryListen(p + 1) }
        else { console.error('[Momentum] API server error:', err.message); resolve({ server: null, url: null }) }
      })
    }
    tryListen(port)
  })
}

module.exports = { startApiServer }
