// AUTO-GENERATED from electron/database.js by scripts/port-db-to-turso.mjs
// Async port of the full data layer, running SQL against Turso (libsql over HTTPS).
// Do not edit electron/database.js and this file independently — regenerate.
import { q } from './queryClient.js'

export async function initSchema() {
  
  await q.exec(`
    CREATE TABLE IF NOT EXISTS projects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT DEFAULT '',
      color TEXT DEFAULT '#6366f1',
      status TEXT DEFAULT 'active',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );
  
    CREATE TABLE IF NOT EXISTS tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      description TEXT DEFAULT '',
      status TEXT DEFAULT 'todo',
      priority TEXT DEFAULT 'medium',
      due_date TEXT,
      recurrence TEXT DEFAULT 'none',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    );
  
    CREATE TABLE IF NOT EXISTS time_entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      task_id INTEGER NOT NULL,
      project_id INTEGER NOT NULL,
      start_time TEXT NOT NULL,
      end_time TEXT,
      duration INTEGER DEFAULT 0,
      notes TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    );
  
    CREATE TABLE IF NOT EXISTS comments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      task_id INTEGER NOT NULL,
      content TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
    );
  `)
  
  // Migrations
  try { await q.exec("ALTER TABLE tasks ADD COLUMN recurrence TEXT DEFAULT 'none'") } catch (_) {}
  try { await q.exec("ALTER TABLE tasks ADD COLUMN due_time TEXT") } catch (_) {}
  try { await q.exec("ALTER TABLE tasks ADD COLUMN notify_before INTEGER DEFAULT 10") } catch (_) {}
  try { await q.exec("ALTER TABLE tasks ADD COLUMN start_date TEXT") } catch (_) {}
  try { await q.exec("ALTER TABLE tasks ADD COLUMN icon TEXT DEFAULT ''") } catch (_) {}
  try { await q.exec("ALTER TABLE tasks ADD COLUMN estimate INTEGER DEFAULT 0") } catch (_) {}
  try { await q.exec("ALTER TABLE tasks ADD COLUMN start_time TEXT") } catch (_) {}
  try { await q.exec("ALTER TABLE subtasks ADD COLUMN estimate INTEGER DEFAULT 0") } catch (_) {}
  // New feature migrations
  try { await q.exec("ALTER TABLE projects ADD COLUMN is_inbox INTEGER DEFAULT 0") } catch (_) {}
  try { await q.exec("ALTER TABLE time_entries ADD COLUMN work_type TEXT DEFAULT 'deep'") } catch (_) {}
  
  // New tables
  await q.exec(`
    CREATE TABLE IF NOT EXISTS tags (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      color TEXT DEFAULT '#6366f1'
    );
    CREATE TABLE IF NOT EXISTS task_tags (
      task_id INTEGER NOT NULL,
      tag_id INTEGER NOT NULL,
      PRIMARY KEY (task_id, tag_id),
      FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
      FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS habit_completions (
      task_id INTEGER NOT NULL,
      date TEXT NOT NULL,
      PRIMARY KEY (task_id, date),
      FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS templates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      structure TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS subtasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      task_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      done INTEGER DEFAULT 0,
      position INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS task_dependencies (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      task_id INTEGER NOT NULL,        -- the dependent task (blocked until depends_on_id is done)
      depends_on_id INTEGER NOT NULL,  -- must finish before task_id can start
      created_at TEXT DEFAULT (datetime('now')),
      UNIQUE(task_id, depends_on_id),
      FOREIGN KEY (task_id)       REFERENCES tasks(id) ON DELETE CASCADE,
      FOREIGN KEY (depends_on_id) REFERENCES tasks(id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS notes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL UNIQUE,
      content TEXT DEFAULT '',
      updated_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS time_blocks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      label TEXT NOT NULL DEFAULT '',
      start_time TEXT NOT NULL,
      end_time TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS milestones (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      due_date TEXT,
      description TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    );
  `)
  
  // ── 4DX Tables ────────────────────────────────────────────────────────────────
  await q.exec(`
    CREATE TABLE IF NOT EXISTS daily_intentions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      task_id INTEGER NOT NULL,
      position INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS daily_reviews (
      date TEXT PRIMARY KEY,
      carries_over TEXT DEFAULT '',
      notes TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS wigs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      project_id INTEGER,
      target_date TEXT,
      lag_label TEXT DEFAULT 'Tasks completed',
      lead_label TEXT DEFAULT 'Hours logged',
      lead_target REAL DEFAULT 2,
      lead_type TEXT DEFAULT 'hours',
      status TEXT DEFAULT 'active',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL
    );
    CREATE TABLE IF NOT EXISTS wig_commitments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      wig_id INTEGER,
      week_start TEXT NOT NULL,
      commitment TEXT NOT NULL DEFAULT '',
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (wig_id) REFERENCES wigs(id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS weekly_commitments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      week_start TEXT NOT NULL UNIQUE,
      commitment TEXT NOT NULL DEFAULT '',
      created_at TEXT DEFAULT (datetime('now'))
    );
  `)
  
  // ── WIG functions ──────────────────────────────────────────────────────────────
  
  await ensureSeedData()
}

async function getWigs() {
  return (await q.all(`
    SELECT w.*, p.name AS project_name, p.color AS project_color
    FROM wigs w
    LEFT JOIN projects p ON p.id = w.project_id
    ORDER BY w.created_at DESC
  `))
}

async function createWig(data) {
  const r = (await q.run(`
    INSERT INTO wigs (title, project_id, target_date, lag_label, lead_label, lead_target, lead_type)
    VALUES (@title, @project_id, @target_date, @lag_label, @lead_label, @lead_target, @lead_type)
  `, { project_id: null, target_date: null, lag_label: 'Tasks completed', lead_label: 'Hours logged', lead_target: 2, lead_type: 'hours', ...data }))
  return (await q.get('SELECT * FROM wigs WHERE id = ?', [r.lastInsertRowid]))
}

async function updateWig(id, data) {
  const fields = Object.keys(data).map(k => `${k} = @${k}`).join(', ')
  ;(await q.run(`UPDATE wigs SET ${fields}, updated_at = datetime('now') WHERE id = @id`, { ...data, id }))
  return (await q.get('SELECT * FROM wigs WHERE id = ?', [id]))
}

async function deleteWig(id) {
  ;(await q.run('DELETE FROM wigs WHERE id = ?', [id]))
}

async function getScoreboardData() {
  const wigs = (await q.all(`
    SELECT w.*, p.name AS project_name, p.color AS project_color
    FROM wigs w
    LEFT JOIN projects p ON p.id = w.project_id
    WHERE w.status = 'active'
    ORDER BY w.created_at ASC
  `))

  const monday = (() => {
    const now = new Date()
    const d = new Date(now)
    const day = d.getDay()
    d.setDate(d.getDate() - (day === 0 ? 6 : day - 1))
    return d.toISOString().split('T')[0]
  })()

  return await Promise.all(wigs.map(async wig => {
    // Lag measure: task completion % for linked project
    let lagCurrent = 0, lagTotal = 0
    if (wig.project_id) {
      const t = (await q.get(`
        SELECT COUNT(*) AS total,
               SUM(CASE WHEN status = 'done' THEN 1 ELSE 0 END) AS done
        FROM tasks WHERE project_id = ?
      `, [wig.project_id]))
      lagTotal = t.total || 0
      lagCurrent = t.done || 0
    }

    // Lead measure: this week's hours or tasks
    let leadActual = 0
    if (wig.lead_type === 'hours' && wig.project_id) {
      const r = (await q.get(`
        SELECT COALESCE(SUM(duration), 0) AS total FROM time_entries
        WHERE project_id = ? AND date(start_time) >= ?
      `, [wig.project_id, monday]))
      leadActual = parseFloat((r.total / 3600).toFixed(2))
    } else if (wig.lead_type === 'tasks' && wig.project_id) {
      const r = (await q.get(`
        SELECT COUNT(*) AS cnt FROM tasks
        WHERE project_id = ? AND status = 'done' AND date(updated_at) >= ?
      `, [wig.project_id, monday]))
      leadActual = r.cnt
    }

    // 6-week sparkline of lead measure
    const weeks = []
    for (let i = 5; i >= 0; i--) {
      const wStart = new Date(monday)
      wStart.setDate(wStart.getDate() - i * 7)
      const wEnd = new Date(wStart)
      wEnd.setDate(wEnd.getDate() + 6)
      const ws = wStart.toISOString().split('T')[0]
      const we = wEnd.toISOString().split('T')[0]

      let val = 0
      if (wig.lead_type === 'hours' && wig.project_id) {
        const r = (await q.get(`
          SELECT COALESCE(SUM(duration), 0) AS total FROM time_entries
          WHERE project_id = ? AND date(start_time) >= ? AND date(start_time) <= ?
        `, [wig.project_id, ws, we]))
        val = parseFloat((r.total / 3600).toFixed(2))
      } else if (wig.lead_type === 'tasks' && wig.project_id) {
        const r = (await q.get(`
          SELECT COUNT(*) AS cnt FROM tasks
          WHERE project_id = ? AND status = 'done' AND date(updated_at) >= ? AND date(updated_at) <= ?
        `, [wig.project_id, ws, we]))
        val = r.cnt
      }
      weeks.push({ week: ws, value: val })
    }

    // This week's commitment
    const commitment = (await q.get(`
      SELECT commitment FROM wig_commitments WHERE wig_id = ? AND week_start = ?
    `, [wig.id, monday]))

    return {
      ...wig,
      lagCurrent, lagTotal,
      lagPct: lagTotal > 0 ? Math.round((lagCurrent / lagTotal) * 100) : 0,
      leadActual,
      leadTarget: wig.lead_target,
      weekStart: monday,
      commitment: commitment?.commitment || '',
      history: weeks,
    }
  }))
}

async function saveWigCommitment(wigId, weekStart, commitment) {
  ;(await q.run(`
    INSERT INTO wig_commitments (wig_id, week_start, commitment)
    VALUES (?, ?, ?)
    ON CONFLICT DO UPDATE SET commitment = excluded.commitment
  `, [wigId, weekStart, commitment]))
}

// ── Weekly review commitments ─────────────────────────────────────────────────

async function getWeeklyCommitment(weekStart) {
  return (await q.get('SELECT * FROM weekly_commitments WHERE week_start = ?', [weekStart])) || null
}

async function saveWeeklyCommitment(weekStart, commitment) {
  ;(await q.run(`
    INSERT INTO weekly_commitments (week_start, commitment) VALUES (?, ?)
    ON CONFLICT(week_start) DO UPDATE SET commitment = excluded.commitment
  `, [weekStart, commitment]))
}

// Seed + migrations that must run after connect — called from initSchema()
async function ensureSeedData() {
  const inbox = (await q.get("SELECT id FROM projects WHERE is_inbox = 1"))
  if (!inbox) {
    await q.run("INSERT INTO projects (name, color, status, is_inbox) VALUES ('Inbox', '#6366f1', 'active', 1)")
  }
  try {
    const cols = (await q.all("PRAGMA table_info(time_blocks)")).map(c => c.name)
    if (!cols.includes('task_id')) {
      await q.run('ALTER TABLE time_blocks ADD COLUMN task_id INTEGER REFERENCES tasks(id) ON DELETE SET NULL')
    }
  } catch (_) {}
}

// ── Projects ──────────────────────────────────────────────────────────────────

async function getProjects() {
  return (await q.all(`
    SELECT p.*,
      COUNT(DISTINCT t.id) AS task_count,
      SUM(CASE WHEN t.status = 'done' THEN 1 ELSE 0 END) AS completed_tasks,
      COALESCE(SUM(te.duration), 0) AS total_time,
      COALESCE(SUM(CASE WHEN date(te.start_time) = date('now') THEN te.duration ELSE 0 END), 0) AS today_time
    FROM projects p
    LEFT JOIN tasks t ON t.project_id = p.id
    LEFT JOIN time_entries te ON te.project_id = p.id
    GROUP BY p.id
    ORDER BY p.created_at DESC
  `))
}

async function createProject(data) {
  const result = (await q.run(`INSERT INTO projects (name, description, color, status) VALUES (@name, @description, @color, @status)`, data))
  return (await q.get('SELECT * FROM projects WHERE id = ?', [result.lastInsertRowid]))
}

async function updateProject(id, data) {
  const fields = Object.keys(data).map(k => `${k} = @${k}`).join(', ')
  ;(await q.run(`UPDATE projects SET ${fields}, updated_at = datetime('now') WHERE id = @id`, { ...data, id }))
  return (await q.get('SELECT * FROM projects WHERE id = ?', [id]))
}

async function deleteProject(id) {
  ;(await q.run('DELETE FROM projects WHERE id = ?', [id]))
  return { success: true }
}

// ── Tasks ──────────────────────────────────────────────────────────────────────

async function getTasksByProject(projectId) {
  return (await q.all(`
    SELECT t.*,
      COALESCE(SUM(te.duration), 0) AS total_time,
      COALESCE(SUM(CASE WHEN date(te.start_time) = date('now') THEN te.duration ELSE 0 END), 0) AS today_time,
      (SELECT COUNT(*) FROM comments c WHERE c.task_id = t.id) AS comment_count,
      (SELECT COUNT(*) FROM subtasks s WHERE s.task_id = t.id) AS subtask_count,
      (SELECT COUNT(*) FROM subtasks s WHERE s.task_id = t.id AND s.done = 1) AS subtask_done
    FROM tasks t
    LEFT JOIN time_entries te ON te.task_id = t.id
    WHERE t.project_id = ?
    GROUP BY t.id
    ORDER BY
      COALESCE(t.start_date, t.due_date, '9999-12-31') ASC,
      CASE t.priority WHEN 'urgent' THEN 0 WHEN 'high' THEN 1 WHEN 'medium' THEN 2 WHEN 'low' THEN 3 END,
      t.created_at ASC
  `, [projectId]))
}

async function getTask(id) {
  return (await q.get(`
    SELECT t.*, p.name AS project_name, p.color AS project_color,
      COALESCE(SUM(te.duration), 0) AS total_time
    FROM tasks t
    LEFT JOIN projects p ON p.id = t.project_id
    LEFT JOIN time_entries te ON te.task_id = t.id
    WHERE t.id = ?
    GROUP BY t.id
  `, [id]))
}

async function getNextDueDate(dueDateStr, recurrence) {
  if (!dueDateStr) return null
  const date = new Date(dueDateStr + 'T12:00:00')
  if (recurrence === 'daily')   date.setDate(date.getDate() + 1)
  else if (recurrence === 'weekly')  date.setDate(date.getDate() + 7)
  else if (recurrence === 'monthly') date.setMonth(date.getMonth() + 1)
  else return null
  return date.toISOString().split('T')[0]
}

async function createTask(data) {
  const result = (await q.run(`
    INSERT INTO tasks
      (project_id, title, description, status, priority,
       due_date, due_time, start_date, start_time,
       recurrence, notify_before, icon, estimate)
    VALUES
      (@project_id, @title, @description, @status, @priority,
       @due_date, @due_time, @start_date, @start_time,
       @recurrence, @notify_before, @icon, @estimate)
  `, {
    recurrence: 'none', notify_before: 10, icon: '', estimate: 0,
    due_time: null, start_date: null, start_time: null,
    ...data,
  }))
  return getTask(result.lastInsertRowid)
}

async function updateTask(id, data) {
  const task = (await q.get('SELECT * FROM tasks WHERE id = ?', [id]))
  const fields = Object.keys(data).map(k => `${k} = @${k}`).join(', ')
  ;(await q.run(`UPDATE tasks SET ${fields}, updated_at = datetime('now') WHERE id = @id`, { ...data, id }))

  // Auto-create next recurrence when marking done
  if (data.status === 'done' && task?.recurrence && task.recurrence !== 'none') {
    const nextDue = getNextDueDate(task.due_date, task.recurrence)
    if (nextDue) {
      // Only create if no identical future occurrence already exists
      const existing = (await q.get(`SELECT id FROM tasks WHERE project_id=? AND title=? AND recurrence=? AND status!='done' AND due_date>=?`, [task.project_id, task.title, task.recurrence, nextDue]))
      if (!existing) {
        ;(await q.run(`
          INSERT INTO tasks
            (project_id, title, description, status, priority, due_date, due_time,
             recurrence, notify_before, start_date, icon, estimate)
          VALUES (?, ?, ?, 'todo', ?, ?, ?, ?, ?, NULL, ?, ?)
        `, [task.project_id, task.title, task.description || '', task.priority,
          nextDue, task.due_time || null, task.recurrence,
          task.notify_before ?? 10, task.icon || '', task.estimate || 0]))
      }
    }
  }

  return getTask(id)
}

async function deleteTask(id) {
  ;(await q.run('DELETE FROM tasks WHERE id = ?', [id]))
  return { success: true }
}

// ── Time Entries ───────────────────────────────────────────────────────────────

async function getTimeEntries(filters = {}) {
  let where = []
  const params = {}
  if (filters.taskId)    { where.push('te.task_id = @taskId');                   params.taskId = filters.taskId }
  if (filters.projectId) { where.push('te.project_id = @projectId');             params.projectId = filters.projectId }
  if (filters.date)      { where.push("date(te.start_time) = @date");            params.date = filters.date }
  if (filters.from)      { where.push("date(te.start_time) >= @from");           params.from = filters.from }
  if (filters.to)        { where.push("date(te.start_time) <= @to");             params.to = filters.to }
  const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : ''
  return (await q.all(`
    SELECT te.*, t.title AS task_title, p.name AS project_name, p.color AS project_color
    FROM time_entries te
    JOIN tasks t ON t.id = te.task_id
    JOIN projects p ON p.id = te.project_id
    ${whereClause}
    ORDER BY te.start_time DESC
  `, params))
}

async function getActiveTimer() {
  return (await q.get(`
    SELECT te.*, t.title AS task_title, p.name AS project_name, p.color AS project_color
    FROM time_entries te
    JOIN tasks t ON t.id = te.task_id
    JOIN projects p ON p.id = te.project_id
    WHERE te.end_time IS NULL
    ORDER BY te.start_time DESC LIMIT 1
  `))
}

async function createTimeEntry(data) {
  const result = (await q.run(`
    INSERT INTO time_entries (task_id, project_id, start_time, end_time, duration, notes)
    VALUES (@task_id, @project_id, @start_time, @end_time, @duration, @notes)
  `, { end_time: null, duration: 0, notes: '', ...data }))
  return (await q.get('SELECT * FROM time_entries WHERE id = ?', [result.lastInsertRowid]))
}

async function updateTimeEntry(id, data) {
  const fields = Object.keys(data).map(k => `${k} = @${k}`).join(', ')
  ;(await q.run(`UPDATE time_entries SET ${fields} WHERE id = @id`, { ...data, id }))
  return (await q.get('SELECT * FROM time_entries WHERE id = ?', [id]))
}

async function stopTimer(id, endTime, duration) {
  ;(await q.run('UPDATE time_entries SET end_time = ?, duration = ? WHERE id = ?', [endTime, duration, id]))
  return (await q.get('SELECT * FROM time_entries WHERE id = ?', [id]))
}

async function deleteTimeEntry(id) {
  ;(await q.run('DELETE FROM time_entries WHERE id = ?', [id]))
  return { success: true }
}

// ── Comments ───────────────────────────────────────────────────────────────────

async function getComments(taskId) {
  return (await q.all('SELECT * FROM comments WHERE task_id = ? ORDER BY created_at ASC', [taskId]))
}

async function createComment(data) {
  const result = (await q.run('INSERT INTO comments (task_id, content) VALUES (@task_id, @content)', data))
  return (await q.get('SELECT * FROM comments WHERE id = ?', [result.lastInsertRowid]))
}

async function updateComment(id, data) {
  ;(await q.run(`UPDATE comments SET content = @content, updated_at = datetime('now') WHERE id = @id`, { ...data, id }))
  return (await q.get('SELECT * FROM comments WHERE id = ?', [id]))
}

async function deleteComment(id) {
  ;(await q.run('DELETE FROM comments WHERE id = ?', [id]))
  return { success: true }
}

// ── Notifications ──────────────────────────────────────────────────────────────

async function getOverdueTasks() {
  return (await q.all(`
    SELECT t.*, p.name AS project_name, p.color AS project_color
    FROM tasks t
    JOIN projects p ON p.id = t.project_id
    WHERE t.status != 'done'
      AND t.due_date IS NOT NULL
      AND date(t.due_date) < date('now')
      AND p.status = 'active'
    ORDER BY t.due_date ASC
  `))
}

// ── Dashboard ──────────────────────────────────────────────────────────────────

async function getDashboardData(tzOffset = 0) {
  const localNow     = new Date(Date.now() + tzOffset * 60000)
  const todayStr     = localNow.toISOString().split('T')[0]
  const weekAgoStr   = new Date(Date.now() + tzOffset * 60000 - 6 * 864e5).toISOString().split('T')[0]
  const thisMonth    = todayStr.slice(0, 7)
  const sh           = `datetime(start_time,'${tzOffset >= 0 ? '+' : ''}${tzOffset} minutes')`
  const todayTime    = (await q.get(`SELECT COALESCE(SUM(duration),0) AS value FROM time_entries WHERE date(${sh})=?`, [todayStr])).value
  const weekTime     = (await q.get(`SELECT COALESCE(SUM(duration),0) AS value FROM time_entries WHERE date(${sh})>=?`, [weekAgoStr])).value
  const monthTime    = (await q.get(`SELECT COALESCE(SUM(duration),0) AS value FROM time_entries WHERE strftime('%Y-%m',${sh})=?`, [thisMonth])).value
  const tasksCompleted  = (await q.get(`SELECT COUNT(*) AS value FROM tasks WHERE status='done'`)).value
  const tasksInProgress = (await q.get(`SELECT COUNT(*) AS value FROM tasks WHERE status='in_progress'`)).value
  const activeProjects  = (await q.get(`SELECT COUNT(*) AS value FROM projects WHERE status='active'`)).value

  const recentEntries = (await q.all(`
    SELECT te.*, t.title AS task_title, p.name AS project_name, p.color AS project_color
    FROM time_entries te JOIN tasks t ON t.id=te.task_id JOIN projects p ON p.id=te.project_id
    WHERE te.end_time IS NOT NULL ORDER BY te.start_time DESC LIMIT 8
  `))

  const weeklyHours = (await q.all(`
    SELECT date(${sh}) AS day, COALESCE(SUM(duration),0) AS total
    FROM time_entries WHERE date(${sh})>=?
    GROUP BY date(${sh}) ORDER BY day ASC
  `, [weekAgoStr]))

  const upcomingTasks = (await q.all(`
    SELECT t.*, p.name AS project_name, p.color AS project_color, COALESCE(SUM(te.duration),0) AS total_time
    FROM tasks t JOIN projects p ON p.id=t.project_id LEFT JOIN time_entries te ON te.task_id=t.id
    WHERE t.status!='done' AND p.status='active'
    GROUP BY t.id
    ORDER BY CASE t.priority WHEN 'urgent' THEN 0 WHEN 'high' THEN 1 WHEN 'medium' THEN 2 WHEN 'low' THEN 3 END, t.due_date ASC NULLS LAST
    LIMIT 6
  `))

  return { todayTime, weekTime, monthTime, tasksCompleted, tasksInProgress, activeProjects, recentEntries, weeklyHours, upcomingTasks }
}

// ── Reports ────────────────────────────────────────────────────────────────────

async function getReportData(filters = {}) {
  const { from, to, projectId } = filters
  const projectFilter = projectId ? 'AND te.project_id = @projectId' : ''
  const params = { from, to, projectId }

  const entries = (await q.all(`
    SELECT te.*, t.title AS task_title, p.name AS project_name, p.color AS project_color
    FROM time_entries te JOIN tasks t ON t.id=te.task_id JOIN projects p ON p.id=te.project_id
    WHERE te.end_time IS NOT NULL AND date(te.start_time)>=@from AND date(te.start_time)<=@to ${projectFilter}
    ORDER BY te.start_time DESC
  `, params))

  const byProject = (await q.all(`
    SELECT p.id, p.name, p.color, COALESCE(SUM(te.duration),0) AS total
    FROM time_entries te JOIN projects p ON p.id=te.project_id
    WHERE te.end_time IS NOT NULL AND date(te.start_time)>=@from AND date(te.start_time)<=@to ${projectFilter}
    GROUP BY p.id ORDER BY total DESC
  `, params))

  const byDay = (await q.all(`
    SELECT date(te.start_time) AS day, COALESCE(SUM(te.duration),0) AS total
    FROM time_entries te
    WHERE te.end_time IS NOT NULL AND date(te.start_time)>=@from AND date(te.start_time)<=@to ${projectFilter}
    GROUP BY date(te.start_time) ORDER BY day ASC
  `, params))

  const totalTime = entries.reduce((s, e) => s + e.duration, 0)
  const completedTasks = (await q.get(`
    SELECT COUNT(DISTINCT t.id) AS value FROM tasks t JOIN time_entries te ON te.task_id=t.id
    WHERE t.status='done' AND date(te.start_time)>=@from AND date(te.start_time)<=@to ${projectFilter}
  `, params)).value

  return { entries, byProject, byDay, totalTime, completedTasks }
}

// ── Tile drill-downs ───────────────────────────────────────────────────────────

async function getTodayBreakdown() {
  const byProject = (await q.all(`
    SELECT p.id, p.name, p.color, COALESCE(SUM(te.duration), 0) AS total
    FROM time_entries te JOIN projects p ON p.id = te.project_id
    WHERE date(te.start_time) = date('now') AND te.end_time IS NOT NULL
    GROUP BY p.id ORDER BY total DESC
  `))
  const byTask = (await q.all(`
    SELECT t.id, t.title, p.name AS project_name, p.color AS project_color,
      COALESCE(SUM(te.duration), 0) AS total
    FROM time_entries te JOIN tasks t ON t.id = te.task_id JOIN projects p ON p.id = te.project_id
    WHERE date(te.start_time) = date('now') AND te.end_time IS NOT NULL
    GROUP BY t.id ORDER BY total DESC
  `))
  return { byProject, byTask }
}

async function getMonthBreakdown() {
  const byProject = (await q.all(`
    SELECT p.id, p.name, p.color, COALESCE(SUM(te.duration), 0) AS total
    FROM time_entries te JOIN projects p ON p.id = te.project_id
    WHERE strftime('%Y-%m', te.start_time) = strftime('%Y-%m', 'now') AND te.end_time IS NOT NULL
    GROUP BY p.id ORDER BY total DESC
  `))
  const byTask = (await q.all(`
    SELECT t.id, t.title, p.name AS project_name, p.color AS project_color,
      COALESCE(SUM(te.duration), 0) AS total
    FROM time_entries te JOIN tasks t ON t.id = te.task_id JOIN projects p ON p.id = te.project_id
    WHERE strftime('%Y-%m', te.start_time) = strftime('%Y-%m', 'now') AND te.end_time IS NOT NULL
    GROUP BY t.id ORDER BY total DESC
  `))
  const byDay = (await q.all(`
    SELECT date(te.start_time) AS day, COALESCE(SUM(te.duration), 0) AS total
    FROM time_entries te
    WHERE strftime('%Y-%m', te.start_time) = strftime('%Y-%m', 'now') AND te.end_time IS NOT NULL
    GROUP BY date(te.start_time) ORDER BY day ASC
  `))
  return { byProject, byTask, byDay }
}

async function getCompletedTasks() {
  return (await q.all(`
    SELECT t.*, p.name AS project_name, p.color AS project_color
    FROM tasks t JOIN projects p ON p.id = t.project_id
    WHERE t.status = 'done'
    ORDER BY t.updated_at DESC
  `))
}

async function getChartData({ from, to, tzOffset = 0 }) {
  // tzOffset is minutes from UTC (e.g. UTC+5 = 300). Shift timestamps to local date.
  const shift = `datetime(start_time, '${tzOffset >= 0 ? '+' : ''}${tzOffset} minutes')`
  return (await q.all(`
    SELECT date(${shift}) AS day, COALESCE(SUM(duration), 0) AS total
    FROM time_entries WHERE end_time IS NOT NULL
    AND date(${shift}) >= ? AND date(${shift}) <= ?
    GROUP BY date(${shift}) ORDER BY day ASC
  `, [from, to]))
}

async function getCalendarTasks() {
  return (await q.all(`
    SELECT t.*, p.name AS project_name, p.color AS project_color,
      COALESCE(SUM(te.duration), 0) AS total_time
    FROM tasks t
    JOIN projects p ON p.id = t.project_id
    LEFT JOIN time_entries te ON te.task_id = t.id
    WHERE p.status = 'active'
    GROUP BY t.id
    ORDER BY t.due_date ASC,
      CASE t.priority WHEN 'urgent' THEN 0 WHEN 'high' THEN 1 WHEN 'medium' THEN 2 WHEN 'low' THEN 3 END
  `))
}

async function getTasksSummary() {
  // Returns non-done tasks sorted by urgency: overdue first, then due today, then in_progress, then by priority
  return (await q.all(`
    SELECT t.*, p.name AS project_name, p.color AS project_color
    FROM tasks t JOIN projects p ON p.id = t.project_id
    WHERE t.status != 'done' AND p.status = 'active'
    ORDER BY
      CASE WHEN t.due_date IS NOT NULL AND t.due_date < date('now') THEN 0 ELSE 1 END,
      CASE WHEN t.due_date = date('now') THEN 0 ELSE 1 END,
      CASE t.status WHEN 'in_progress' THEN 0 WHEN 'blocked' THEN 1 WHEN 'todo' THEN 2 END,
      CASE t.priority WHEN 'urgent' THEN 0 WHEN 'high' THEN 1 WHEN 'medium' THEN 2 WHEN 'low' THEN 3 END,
      t.due_date ASC NULLS LAST
    LIMIT 12
  `))
}

async function getDaySchedule(date) {
  // All time entries for the given date with task + project info
  return (await q.all(`
    SELECT te.*, t.title AS task_title, t.icon AS task_icon,
      p.name AS project_name, p.color AS project_color
    FROM time_entries te
    JOIN tasks t ON t.id = te.task_id
    JOIN projects p ON p.id = te.project_id
    WHERE date(te.start_time) = ? AND te.end_time IS NOT NULL
    ORDER BY te.start_time ASC
  `, [date]))
}

async function getUpcomingDeadlines() {
  return (await q.all(`
    SELECT t.*, p.name AS project_name
    FROM tasks t JOIN projects p ON p.id = t.project_id
    WHERE t.status != 'done'
      AND t.due_date IS NOT NULL
      AND t.due_time IS NOT NULL
      AND p.status = 'active'
  `))
}

async function getDailySummary() {
  const overdue = (await q.all(`
    SELECT t.id, t.title, t.icon, t.status, t.priority, t.due_date, t.due_time, t.project_id,
      p.name AS project_name, p.color AS project_color,
      (SELECT COUNT(*) FROM subtasks s WHERE s.task_id = t.id) AS subtask_count,
      (SELECT COUNT(*) FROM subtasks s WHERE s.task_id = t.id AND s.done = 1) AS subtask_done
    FROM tasks t JOIN projects p ON p.id = t.project_id
    WHERE t.status != 'done' AND t.due_date < date('now') AND p.status = 'active'
      AND (t.start_date IS NULL OR t.start_date <= date('now'))
    ORDER BY CASE t.priority WHEN 'urgent' THEN 0 WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END
    LIMIT 10
  `))

  const dueToday = (await q.all(`
    SELECT t.id, t.title, t.icon, t.status, t.priority, t.due_date, t.due_time, t.project_id,
      p.name AS project_name, p.color AS project_color,
      (SELECT COUNT(*) FROM subtasks s WHERE s.task_id = t.id) AS subtask_count,
      (SELECT COUNT(*) FROM subtasks s WHERE s.task_id = t.id AND s.done = 1) AS subtask_done
    FROM tasks t JOIN projects p ON p.id = t.project_id
    WHERE t.status != 'done' AND t.due_date = date('now') AND p.status = 'active'
      AND (t.start_date IS NULL OR t.start_date <= date('now'))
    ORDER BY CASE t.priority WHEN 'urgent' THEN 0 WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END
    LIMIT 10
  `))

  const inProgress = (await q.all(`
    SELECT t.id, t.title, t.icon, t.status, t.priority, t.due_time, t.project_id,
      p.name AS project_name, p.color AS project_color,
      (SELECT COUNT(*) FROM subtasks s WHERE s.task_id = t.id) AS subtask_count,
      (SELECT COUNT(*) FROM subtasks s WHERE s.task_id = t.id AND s.done = 1) AS subtask_done
    FROM tasks t JOIN projects p ON p.id = t.project_id
    WHERE t.status = 'in_progress' AND p.status = 'active'
      AND (t.start_date IS NULL OR t.start_date <= date('now'))
    ORDER BY CASE t.priority WHEN 'urgent' THEN 0 WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END
    LIMIT 8
  `))

  const todayTime = (await q.get(`
    SELECT COALESCE(SUM(duration), 0) AS value FROM time_entries WHERE date(start_time) = date('now')
  `)).value

  const todayEntries = (await q.all(`
    SELECT t.id AS task_id, t.title AS task_title, t.icon,
           p.name AS project_name, p.color AS project_color,
           COALESCE(SUM(te.duration), 0) AS total_time
    FROM time_entries te
    JOIN tasks t ON t.id = te.task_id
    JOIN projects p ON p.id = t.project_id
    WHERE date(te.start_time) = date('now') AND te.duration > 0
    GROUP BY t.id
    ORDER BY total_time DESC
    LIMIT 8
  `))

  const completedTasks = (await q.all(`
    SELECT t.id, t.title, t.icon, t.updated_at,
           p.name AS project_name, p.color AS project_color
    FROM tasks t
    JOIN projects p ON p.id = t.project_id
    WHERE t.status = 'done'
      AND date(t.updated_at) = date('now')
      AND p.status = 'active'
    ORDER BY t.updated_at DESC
    LIMIT 50
  `))

  // Count derives from the same list so badge / focal / list always agree
  const completedToday = completedTasks.length

  return { overdue, dueToday, inProgress, completedToday, todayTime, todayEntries, completedTasks }
}

// ── Search ─────────────────────────────────────────────────────────────────────

async function searchAll(query) {
  const pat = `%${query}%`
  const tasks = (await q.all(`
    SELECT t.id, t.title, t.status, t.priority, t.due_date, t.icon,
      p.id AS project_id, p.name AS project_name, p.color AS project_color
    FROM tasks t JOIN projects p ON p.id = t.project_id
    WHERE (t.title LIKE ? OR t.description LIKE ?) AND p.status = 'active'
    ORDER BY CASE t.status WHEN 'done' THEN 1 ELSE 0 END,
      CASE t.priority WHEN 'urgent' THEN 0 WHEN 'high' THEN 1 WHEN 'medium' THEN 2 WHEN 'low' THEN 3 END
    LIMIT 20
  `, [pat, pat]))
  const projects = (await q.all(`
    SELECT id, name, color, status, task_count
    FROM (
      SELECT p.id, p.name, p.color, p.status, COUNT(t.id) AS task_count
      FROM projects p LEFT JOIN tasks t ON t.project_id = p.id
      WHERE p.name LIKE ?
      GROUP BY p.id
    ) LIMIT 8
  `, [pat]))
  return { tasks, projects }
}

// ── Tags ───────────────────────────────────────────────────────────────────────

async function getTags() {
  return (await q.all('SELECT * FROM tags ORDER BY name ASC'))
}

async function createTag(data) {
  const result = (await q.run('INSERT OR IGNORE INTO tags (name, color) VALUES (@name, @color)', data))
  return (await q.get('SELECT * FROM tags WHERE name = ?', [data.name]))
}

async function deleteTag(id) {
  ;(await q.run('DELETE FROM tags WHERE id = ?', [id]))
  return { success: true }
}

async function getTaskTags(taskId) {
  return (await q.all(`
    SELECT tg.* FROM tags tg
    JOIN task_tags tt ON tt.tag_id = tg.id
    WHERE tt.task_id = ?
  `, [taskId]))
}

async function setTaskTags(taskId, tagIds) {
  ;(await q.run('DELETE FROM task_tags WHERE task_id = ?', [taskId]))
  for (const tagId of tagIds) {
    await q.run('INSERT OR IGNORE INTO task_tags (task_id, tag_id) VALUES (?, ?)', [taskId, tagId])
  }
  return getTaskTags(taskId)
}

// ── Habits ─────────────────────────────────────────────────────────────────────

async function getHabitData() {
  const habits = (await q.all(`
    SELECT t.id, t.title, t.icon, p.color AS project_color
    FROM tasks t JOIN projects p ON p.id = t.project_id
    WHERE t.recurrence = 'daily' AND t.status != 'done' AND p.status = 'active'
    ORDER BY t.created_at ASC
  `))
  const completions = (await q.all(`
    SELECT task_id, date FROM habit_completions
    WHERE date >= date('now', '-13 days')
  `))
  return { habits, completions }
}

async function toggleHabitCompletion(taskId, date) {
  const existing = (await q.get('SELECT 1 FROM habit_completions WHERE task_id = ? AND date = ?', [taskId, date]))
  if (existing) {
    ;(await q.run('DELETE FROM habit_completions WHERE task_id = ? AND date = ?', [taskId, date]))
    return { done: false }
  } else {
    ;(await q.run('INSERT OR IGNORE INTO habit_completions (task_id, date) VALUES (?, ?)', [taskId, date]))
    return { done: true }
  }
}

// ── Templates ─────────────────────────────────────────────────────────────────

async function getTemplates() {
  return (await q.all('SELECT * FROM templates ORDER BY created_at DESC'))
}

async function saveTemplate(projectId, name) {
  const tasks = (await q.all(`
    SELECT title, description, priority, icon, estimate, recurrence
    FROM tasks WHERE project_id = ? AND status != 'done'
  `, [projectId]))
  const project = (await q.get('SELECT name, color FROM projects WHERE id = ?', [projectId]))
  const structure = JSON.stringify({ project, tasks })
  const result = (await q.run('INSERT INTO templates (name, structure) VALUES (?, ?)', [name, structure]))
  return (await q.get('SELECT * FROM templates WHERE id = ?', [result.lastInsertRowid]))
}

async function createProjectFromTemplate(templateId, projectData) {
  const tmpl = (await q.get('SELECT * FROM templates WHERE id = ?', [templateId]))
  if (!tmpl) return null
  const { tasks } = JSON.parse(tmpl.structure)
  const proj = (await q.run(`
    INSERT INTO projects (name, description, color, status)
    VALUES (@name, @description, @color, 'active')
  `, projectData))
  const projectId = proj.lastInsertRowid
  for (const t of tasks) {
    await q.run(`
      INSERT INTO tasks (project_id, title, description, priority, icon, estimate, recurrence, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'todo')
    `, [projectId, t.title, t.description || '', t.priority, t.icon || '', t.estimate || 0, t.recurrence || 'none'])
  }
  return (await q.get('SELECT * FROM projects WHERE id = ?', [projectId]))
}

async function deleteTemplate(id) {
  await q.run('DELETE FROM templates WHERE id = ?', [id])
  return { success: true }
}

// ── Weekly Review ─────────────────────────────────────────────────────────────

async function getWeeklyReview(tzOffset = 0) {
  const sh = `datetime(start_time,'${tzOffset >= 0 ? '+' : ''}${tzOffset} minutes')`

  // Compute local week bounds using tzOffset
  const localNow   = new Date(Date.now() + tzOffset * 60000)
  const localDay   = localNow.getUTCDay() // 0=Sun in shifted UTC = local day
  const diffToMon  = (localDay + 6) % 7
  const localMonday  = new Date(Date.now() + tzOffset * 60000 - diffToMon * 864e5)
  const monday       = localMonday.toISOString().split('T')[0]
  const sunday       = new Date(+localMonday + 6 * 864e5).toISOString().split('T')[0]
  const prevMonday   = new Date(+localMonday - 7 * 864e5).toISOString().split('T')[0]
  const prevSunday   = new Date(+localMonday - 1 * 864e5).toISOString().split('T')[0]

  const thisWeekTime = (await q.get(`SELECT COALESCE(SUM(duration),0) AS total FROM time_entries WHERE end_time IS NOT NULL AND date(${sh}) >= ? AND date(${sh}) <= ?`, [monday, sunday])).total
  const lastWeekTime = (await q.get(`SELECT COALESCE(SUM(duration),0) AS total FROM time_entries WHERE end_time IS NOT NULL AND date(${sh}) >= ? AND date(${sh}) <= ?`, [prevMonday, prevSunday])).total

  const shTask = `datetime(t.updated_at,'${tzOffset >= 0 ? '+' : ''}${tzOffset} minutes')`
  const completedTasks = (await q.all(`
    SELECT t.id, t.title, t.icon, t.priority, p.name AS project_name, p.color AS project_color
    FROM tasks t JOIN projects p ON p.id = t.project_id
    WHERE t.status = 'done'
      AND date(${shTask}) >= ?
      AND date(${shTask}) <= ?
    ORDER BY t.updated_at DESC
  `, [monday, sunday]))

  const carriedOver = (await q.all(`
    SELECT t.id, t.title, t.icon, t.priority, t.due_date, p.name AS project_name, p.color AS project_color
    FROM tasks t JOIN projects p ON p.id = t.project_id
    WHERE t.status != 'done' AND t.due_date IS NOT NULL AND t.due_date < ?
    ORDER BY t.due_date ASC LIMIT 10
  `, [localNow.toISOString().split('T')[0]]))

  const byProject = (await q.all(`
    SELECT p.id, p.name, p.color, COALESCE(SUM(te.duration),0) AS total
    FROM time_entries te JOIN projects p ON p.id = te.project_id
    WHERE te.end_time IS NOT NULL AND date(${sh}) >= ? AND date(${sh}) <= ?
    GROUP BY p.id ORDER BY total DESC
  `, [monday, sunday]))

  const byDay = (await q.all(`
    SELECT date(${sh}) AS day, COALESCE(SUM(duration),0) AS total
    FROM time_entries WHERE end_time IS NOT NULL AND date(${sh}) >= ? AND date(${sh}) <= ?
    GROUP BY date(${sh}) ORDER BY day ASC
  `, [monday, sunday]))

  return { thisWeekTime, lastWeekTime, completedTasks, carriedOver, byProject, byDay, monday, sunday }
}

// ── Milestones ────────────────────────────────────────────────────────────────

async function getMilestones(projectId) {
  return (await q.all(`
    SELECT m.*,
      (SELECT COUNT(*) FROM tasks t WHERE t.project_id = m.project_id AND t.due_date = m.due_date) AS total_tasks,
      (SELECT COUNT(*) FROM tasks t WHERE t.project_id = m.project_id AND t.due_date = m.due_date AND t.status = 'done') AS done_tasks
    FROM milestones m
    WHERE m.project_id = ?
    ORDER BY m.due_date ASC
  `, [projectId]))
}

// ── Subtasks ──────────────────────────────────────────────────────────────────

async function getSubtasks(taskId) {
  return (await q.all('SELECT * FROM subtasks WHERE task_id = ? ORDER BY position, created_at', [taskId]))
}

// All pending subtasks for active tasks — used by MIT picker
async function getAllActiveSubtasks() {
  return (await q.all(`
    SELECT s.*
    FROM subtasks s
    JOIN tasks t ON t.id = s.task_id
    WHERE s.done = 0 AND t.status != 'done'
    ORDER BY s.task_id, s.position, s.created_at
  `))
}

async function createSubtask(data) {
  const pos = (await q.get('SELECT COALESCE(MAX(position),0)+1 AS n FROM subtasks WHERE task_id = ?', [data.task_id])).n
  const r = (await q.run('INSERT INTO subtasks (task_id, title, position) VALUES (@task_id, @title, @position)', { ...data, position: pos }))
  return (await q.get('SELECT * FROM subtasks WHERE id = ?', [r.lastInsertRowid]))
}

async function toggleSubtask(id) {
  ;(await q.run('UPDATE subtasks SET done = 1 - done WHERE id = ?', [id]))
  return (await q.get('SELECT * FROM subtasks WHERE id = ?', [id]))
}

async function updateSubtask(id, title, estimate) {
  if (estimate !== undefined) {
    ;(await q.run('UPDATE subtasks SET title = ?, estimate = ? WHERE id = ?', [title, estimate, id]))
  } else {
    ;(await q.run('UPDATE subtasks SET title = ? WHERE id = ?', [title, id]))
  }
  return (await q.get('SELECT * FROM subtasks WHERE id = ?', [id]))
}

async function deleteSubtask(id) {
  ;(await q.run('DELETE FROM subtasks WHERE id = ?', [id]))
  return { success: true }
}

// ── Settings ──────────────────────────────────────────────────────────────────

const SETTING_DEFAULTS = {
  pomodoro_work_min:       '25',
  pomodoro_break_min:      '5',
  pomodoro_long_break_min: '15',
  pomodoro_long_after:     '4',
  pomodoro_sound:          '1',
  work_start_hour:         '9',
  default_notify_before:   '10',
  daily_hour_goal:         '0',
  weekly_hour_goal:        '0',
}

async function getAllSettings() {
  const rows = (await q.all('SELECT key, value FROM settings'))
  const map = { ...SETTING_DEFAULTS }
  rows.forEach(r => { map[r.key] = r.value })
  return map
}

async function setSetting(key, value) {
  ;(await q.run('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value', [key, String(value)]))
  return { key, value: String(value) }
}

// ── Notes / Journal ───────────────────────────────────────────────────────────

async function getNote(date) {
  return (await q.get('SELECT * FROM notes WHERE date = ?', [date])) || { date, content: '' }
}

async function saveNote(date, content) {
  ;(await q.run(`
    INSERT INTO notes (date, content, updated_at) VALUES (?, ?, datetime('now'))
    ON CONFLICT(date) DO UPDATE SET content = excluded.content, updated_at = excluded.updated_at
  `, [date, content]))
  return (await q.get('SELECT * FROM notes WHERE date = ?', [date]))
}

async function getRecentNotes(limit = 30) {
  return (await q.all(`
    SELECT date, SUBSTR(content, 1, 120) AS preview, updated_at
    FROM notes WHERE content != ''
    ORDER BY date DESC LIMIT ?
  `, [limit]))
}

async function getNoteMonthDates(year, month) {
  const from = `${year}-${String(month).padStart(2,'0')}-01`
  const to   = `${year}-${String(month).padStart(2,'0')}-31`
  return (await q.all(`
    SELECT date FROM notes WHERE content != '' AND date >= ? AND date <= ?
  `, [from, to])).map(r => r.date)
}

// ── Time Blocks ────────────────────────────────────────────────────────────────

async function getTimeBlocks(date) {
  return (await q.all(`
    SELECT tb.*,
      t.title AS task_title, t.icon AS task_icon,
      p.name AS project_name, p.color AS project_color
    FROM time_blocks tb
    LEFT JOIN tasks t ON t.id = tb.task_id
    LEFT JOIN projects p ON p.id = t.project_id
    WHERE tb.date = ? ORDER BY tb.start_time ASC
  `, [date]))
}

async function createTimeBlock(data) {
  const r = (await q.run(`
    INSERT INTO time_blocks (date, label, start_time, end_time, task_id)
    VALUES (@date, @label, @start_time, @end_time, @task_id)
  `, { task_id: null, ...data }))
  return (await q.get(`
    SELECT tb.*,
      t.title AS task_title, t.icon AS task_icon,
      p.name AS project_name, p.color AS project_color
    FROM time_blocks tb
    LEFT JOIN tasks t ON t.id = tb.task_id
    LEFT JOIN projects p ON p.id = t.project_id
    WHERE tb.id = ?
  `, [r.lastInsertRowid]))
}

async function updateTimeBlock(id, data) {
  ;(await q.run(`
    UPDATE time_blocks SET start_time = @start_time, end_time = @end_time WHERE id = @id
  `, { start_time: data.start_time, end_time: data.end_time, id }))
  return (await q.get(`
    SELECT tb.*,
      t.title AS task_title, t.icon AS task_icon,
      p.name AS project_name, p.color AS project_color
    FROM time_blocks tb
    LEFT JOIN tasks t ON t.id = tb.task_id
    LEFT JOIN projects p ON p.id = t.project_id
    WHERE tb.id = ?
  `, [id]))
}

async function deleteTimeBlock(id) {
  ;(await q.run('DELETE FROM time_blocks WHERE id = ?', [id]))
  return { success: true }
}

// ── Monthly Review ────────────────────────────────────────────────────────────

async function getMonthlyReview() {
  const now = new Date()
  const y = now.getFullYear(), m = now.getMonth()
  const firstDay = new Date(y, m, 1)
  const lastDay  = new Date(y, m + 1, 0)
  const firstStr = firstDay.toISOString().split('T')[0]
  const lastStr  = lastDay.toISOString().split('T')[0]

  const prevFirst = new Date(y, m - 1, 1).toISOString().split('T')[0]
  const prevLast  = new Date(y, m, 0).toISOString().split('T')[0]

  const thisMonthTime = (await q.get(`SELECT COALESCE(SUM(duration),0) AS v FROM time_entries WHERE end_time IS NOT NULL AND date(start_time)>=? AND date(start_time)<=?`, [firstStr, lastStr])).v

  const lastMonthTime = (await q.get(`SELECT COALESCE(SUM(duration),0) AS v FROM time_entries WHERE end_time IS NOT NULL AND date(start_time)>=? AND date(start_time)<=?`, [prevFirst, prevLast])).v

  const completedTasks = (await q.all(`
    SELECT t.*, p.name AS project_name, p.color AS project_color
    FROM tasks t JOIN projects p ON p.id = t.project_id
    WHERE t.status='done' AND t.updated_at >= ? AND t.updated_at <= ?
    ORDER BY t.updated_at DESC
  `, [firstStr + ' 00:00:00', lastStr + ' 23:59:59']))

  const byProject = (await q.all(`
    SELECT p.id, p.name, p.color, COALESCE(SUM(te.duration),0) AS total
    FROM time_entries te JOIN projects p ON p.id = te.project_id
    WHERE te.end_time IS NOT NULL AND date(te.start_time)>=? AND date(te.start_time)<=?
    GROUP BY p.id ORDER BY total DESC
  `, [firstStr, lastStr]))

  const byDay = (await q.all(`
    SELECT date(start_time) AS day, COALESCE(SUM(duration),0) AS total
    FROM time_entries WHERE end_time IS NOT NULL AND date(start_time)>=? AND date(start_time)<=?
    GROUP BY date(start_time) ORDER BY day ASC
  `, [firstStr, lastStr]))

  return { thisMonthTime, lastMonthTime, completedTasks, byProject, byDay, firstStr, lastStr }
}

// ── Review Comparison ─────────────────────────────────────────────────────────

async function getReviewComparison() {
  const now = new Date()
  // Week comparison
  const dow = (now.getDay() + 6) % 7
  const thisMonday  = new Date(now); thisMonday.setDate(now.getDate() - dow); thisMonday.setHours(0,0,0,0)
  const lastMonday  = new Date(thisMonday); lastMonday.setDate(thisMonday.getDate() - 7)
  const thisSunday  = new Date(thisMonday); thisSunday.setDate(thisMonday.getDate() + 6)
  const lastSunday  = new Date(lastMonday); lastSunday.setDate(lastMonday.getDate() + 6)

  const fmt = d => d.toISOString().split('T')[0]
  const [tw0, tw1] = [fmt(thisMonday), fmt(thisSunday)]
  const [lw0, lw1] = [fmt(lastMonday), fmt(lastSunday)]

  // Month comparison
  const y = now.getFullYear(), mo = now.getMonth()
  const [tm0, tm1] = [fmt(new Date(y,mo,1)), fmt(new Date(y,mo+1,0))]
  const [lm0, lm1] = [fmt(new Date(y,mo-1,1)), fmt(new Date(y,mo,0))]

  const sumTime = async (from, to) => (await q.get(`SELECT COALESCE(SUM(duration),0) AS v FROM time_entries WHERE end_time IS NOT NULL AND date(start_time)>=? AND date(start_time)<=?`, [from, to])).v

  const countDone = async (from, to) => (await q.get(`SELECT COUNT(*) AS v FROM tasks WHERE status='done' AND date(updated_at)>=? AND date(updated_at)<=?`, [from, to])).v

  const weekDays = async (mon, sun) => (await q.all(`
    SELECT date(start_time) AS day, COALESCE(SUM(duration),0) AS total
    FROM time_entries WHERE end_time IS NOT NULL AND date(start_time)>=? AND date(start_time)<=?
    GROUP BY date(start_time) ORDER BY day ASC
  `, [mon, sun]))

  return {
    week: {
      current: { time: await sumTime(tw0,tw1), tasks: await countDone(tw0,tw1), days: await weekDays(tw0,tw1), from: tw0, to: tw1 },
      previous:{ time: await sumTime(lw0,lw1), tasks: await countDone(lw0,lw1), days: await weekDays(lw0,lw1), from: lw0, to: lw1 },
    },
    month: {
      current: { time: await sumTime(tm0,tm1), tasks: await countDone(tm0,tm1), from: tm0, to: tm1 },
      previous:{ time: await sumTime(lm0,lm1), tasks: await countDone(lm0,lm1), from: lm0, to: lm1 },
    },
  }
}

// ── Project Diagram ───────────────────────────────────────────────────────────

async function getProjectDiagram(projectId) {
  const tasks = (await q.all(`
    SELECT t.*,
      COALESCE(SUM(te.duration),0) AS total_time,
      (SELECT COUNT(*) FROM subtasks s WHERE s.task_id = t.id) AS subtask_count,
      (SELECT COUNT(*) FROM subtasks s WHERE s.task_id = t.id AND s.done = 1) AS subtask_done
    FROM tasks t
    LEFT JOIN time_entries te ON te.task_id = t.id AND te.end_time IS NOT NULL
    WHERE t.project_id = ?
    GROUP BY t.id
    ORDER BY CASE t.status WHEN 'done' THEN 2 ELSE 0 END, t.priority, t.created_at
  `, [projectId]))

  const subtasks = (await q.all(`
    SELECT s.*, COALESCE(0,0) AS total_time
    FROM subtasks s
    JOIN tasks t ON t.id = s.task_id
    WHERE t.project_id = ?
    ORDER BY s.task_id, s.position
  `, [projectId]))

  const dependencies = (await q.all(`
    SELECT d.task_id, d.depends_on_id
    FROM task_dependencies d
    JOIN tasks t1 ON t1.id = d.task_id
    JOIN tasks t2 ON t2.id = d.depends_on_id
    WHERE t1.project_id = ? AND t2.project_id = ?
  `, [projectId, projectId]))

  const project = (await q.get('SELECT * FROM projects WHERE id = ?', [projectId]))

  return { project, tasks, subtasks, dependencies }
}

// ── Task dependencies ────────────────────────────────────────────────────────

// All tasks that `taskId` transitively depends on (its prerequisite ancestors)
async function getDependencyAncestors(taskId) {
  const seen  = new Set()
  const stack = [taskId]
  while (stack.length) {
    const cur = stack.pop()
    const rows = await q.all('SELECT depends_on_id FROM task_dependencies WHERE task_id = ?', [cur])
    for (const { depends_on_id } of rows) {
      if (!seen.has(depends_on_id)) { seen.add(depends_on_id); stack.push(depends_on_id) }
    }
  }
  return seen
}

// Add "task_id depends on depends_on_id" (depends_on_id must finish first)
async function addDependency(taskId, dependsOnId) {
  taskId = +taskId; dependsOnId = +dependsOnId
  if (taskId === dependsOnId) return { success: false, error: 'A task cannot depend on itself' }
  // A cycle forms if depends_on_id already (transitively) depends on task_id
  if (getDependencyAncestors(dependsOnId).has(taskId))
    return { success: false, error: 'That would create a circular dependency' }
  try {
    ;(await q.run('INSERT OR IGNORE INTO task_dependencies (task_id, depends_on_id) VALUES (?, ?)', [taskId, dependsOnId]))
    return { success: true }
  } catch (e) {
    return { success: false, error: String(e.message || e) }
  }
}

async function removeDependency(taskId, dependsOnId) {
  ;(await q.run('DELETE FROM task_dependencies WHERE task_id = ? AND depends_on_id = ?', [+taskId, +dependsOnId]))
  return { success: true }
}

// ── Inbox ─────────────────────────────────────────────────────────────────────

async function getInboxProject() {
  return (await q.get("SELECT * FROM projects WHERE is_inbox = 1"))
}

async function getInboxTasks() {
  const inbox = await getInboxProject()
  if (!inbox) return []
  return (await q.all(`
    SELECT t.*, p.name AS project_name, p.color AS project_color
    FROM tasks t JOIN projects p ON p.id = t.project_id
    WHERE t.project_id = ? AND t.status != 'done'
    ORDER BY t.created_at DESC
  `, [inbox.id]))
}

async function processInboxTask(taskId, projectId) {
  ;(await q.run("UPDATE tasks SET project_id = ?, updated_at = datetime('now') WHERE id = ?", [projectId, taskId]))
  return (await q.get('SELECT * FROM tasks WHERE id = ?', [taskId]))
}

// ── Daily Intentions (MITs) ───────────────────────────────────────────────────

async function getDailyIntentions(date) {
  return (await q.all(`
    SELECT
      di.*,
      t.title        AS task_title,
      t.icon         AS icon,
      t.status       AS task_status,
      t.priority,
      p.name         AS project_name,
      p.color        AS project_color,
      s.title        AS subtask_title,
      s.done         AS subtask_done,
      -- unified display title
      CASE WHEN di.subtask_id IS NOT NULL THEN s.title ELSE t.title END AS title,
      -- unified done flag: subtask-level or task-level
      CASE
        WHEN di.subtask_id IS NOT NULL THEN COALESCE(s.done, 0)
        ELSE (CASE WHEN t.status = 'done' THEN 1 ELSE 0 END)
      END AS is_done
    FROM daily_intentions di
    JOIN tasks t ON t.id = di.task_id
    JOIN projects p ON p.id = t.project_id
    LEFT JOIN subtasks s ON s.id = di.subtask_id
    WHERE di.date = ?
    ORDER BY di.position ASC
  `, [date]))
}

async function setDailyIntentions(date, items) {
  // items = [{ taskId, subtaskId? }, ...]
  await q.run('DELETE FROM daily_intentions WHERE date = ?', [date])
  for (let i = 0; i < items.length; i++) {
    const item = items[i]
    const taskId    = typeof item === 'object' ? item.taskId    : item
    const subtaskId = typeof item === 'object' ? (item.subtaskId || null) : null
    await q.run('INSERT INTO daily_intentions (date, task_id, subtask_id, position) VALUES (?, ?, ?, ?)', [date, taskId, subtaskId, i])
  }
}

// ── Productivity Heatmap ──────────────────────────────────────────────────────

async function getProductivityHeatmap(tzOffset = 0) {
  const sh = `datetime(start_time,'${tzOffset >= 0 ? '+' : ''}${tzOffset} minutes')`
  return (await q.all(`
    SELECT
      CAST(strftime('%w', ${sh}) AS INTEGER) AS dow,
      CAST(strftime('%H', ${sh}) AS INTEGER) AS hour,
      COALESCE(SUM(duration), 0) AS total,
      COUNT(*) AS sessions
    FROM time_entries
    WHERE end_time IS NOT NULL AND duration >= 60
    GROUP BY dow, hour
  `))
}

// ── Deep/Shallow work ─────────────────────────────────────────────────────────

async function getWorkTypeBreakdown(tzOffset = 0) {
  const sh = `datetime(start_time,'${tzOffset >= 0 ? '+' : ''}${tzOffset} minutes')`
  const monday = (() => {
    const now = new Date(Date.now() + tzOffset * 60000)
    const d = new Date(now)
    const day = d.getUTCDay()
    d.setUTCDate(d.getUTCDate() - (day === 0 ? 6 : day - 1))
    return d.toISOString().split('T')[0]
  })()
  return (await q.all(`
    SELECT work_type, COALESCE(SUM(duration), 0) AS total
    FROM time_entries
    WHERE end_time IS NOT NULL AND date(${sh}) >= ?
    GROUP BY work_type
  `, [monday]))
}

// ── Daily Review ──────────────────────────────────────────────────────────────

async function getDailyReview(date) {
  return (await q.get('SELECT * FROM daily_reviews WHERE date = ?', [date])) || null
}

async function saveDailyReview(date, data) {
  ;(await q.run(`
    INSERT INTO daily_reviews (date, carries_over, notes)
    VALUES (?, ?, ?)
    ON CONFLICT(date) DO UPDATE SET carries_over = excluded.carries_over, notes = excluded.notes
  `, [date, data.carries_over || '', data.notes || '']))
}

// ── module.exports ─────────────────────────────────────────────────────────────

export default {
  initSchema,
  getProjects, createProject, updateProject, deleteProject,
  getTasksByProject, getTask, createTask, updateTask, deleteTask,
  getTimeEntries, getActiveTimer, createTimeEntry, updateTimeEntry, stopTimer, deleteTimeEntry,
  getComments, createComment, updateComment, deleteComment,
  getDashboardData, getReportData, getOverdueTasks,
  getTodayBreakdown, getMonthBreakdown, getCompletedTasks, getChartData, getUpcomingDeadlines, getCalendarTasks, getDailySummary,
  getTasksSummary, getDaySchedule,
  searchAll, getTags, createTag, deleteTag, getTaskTags, setTaskTags,
  getHabitData, toggleHabitCompletion,
  getTemplates, saveTemplate, createProjectFromTemplate, deleteTemplate,
  getWeeklyReview,
  getMilestones,
  getSubtasks, getAllActiveSubtasks, createSubtask, toggleSubtask, updateSubtask, deleteSubtask,
  getAllSettings, setSetting,
  getNote, saveNote, getRecentNotes, getNoteMonthDates,
  getTimeBlocks, createTimeBlock, updateTimeBlock, deleteTimeBlock,
  getMonthlyReview, getReviewComparison, getProjectDiagram,
  addDependency, removeDependency,
  getWigs, createWig, updateWig, deleteWig,
  getScoreboardData, saveWigCommitment,
  getWeeklyCommitment, saveWeeklyCommitment,
  getInboxProject, getInboxTasks, processInboxTask,
  getDailyIntentions, setDailyIntentions,
  getProductivityHeatmap, getWorkTypeBreakdown,
  getDailyReview, saveDailyReview,
}

