// Post-transform patches for src/data/tursoDb.js — fixes the known cases the
// mechanical transform gets wrong. Idempotent: run after port-db-to-turso.mjs.
import fs from 'node:fs'

const FILE = 'src/data/tursoDb.js'
let s = fs.readFileSync(FILE, 'utf8')
let applied = []

function patch(name, from, to) {
  if (typeof from === 'string' ? s.includes(from) : from.test(s)) {
    s = s.replace(from, to)
    applied.push(name)
  } else {
    console.error('PATCH DID NOT MATCH:', name)
    process.exitCode = 1
  }
}

// A. Named-params objects wrongly wrapped in arrays
patch('createProject [data]',
  `VALUES (@name, @description, @color, @status)\`, [data]))`,
  `VALUES (@name, @description, @color, @status)\`, data))`)
patch('createComment [data]',
  `VALUES (@task_id, @content)', [data]))`,
  `VALUES (@task_id, @content)', data))`)
patch('createTag [data]',
  `VALUES (@name, @color)', [data]))`,
  `VALUES (@name, @color)', data))`)
s = s.split('`, [params]))').join('`, params))')          // getTimeEntries + getReportData (5 sites)
applied.push('[params] → params (all)')

// B. Rewrite the mangled createProjectFromTemplate
patch('createProjectFromTemplate', new RegExp(
  String.raw`async function createProjectFromTemplate\(templateId, projectData\) \{[\s\S]*?\n\}`),
`async function createProjectFromTemplate(templateId, projectData) {
  const tmpl = (await q.get('SELECT * FROM templates WHERE id = ?', [templateId]))
  if (!tmpl) return null
  const { tasks } = JSON.parse(tmpl.structure)
  const proj = (await q.run(\`
    INSERT INTO projects (name, description, color, status)
    VALUES (@name, @description, @color, 'active')
  \`, projectData))
  const projectId = proj.lastInsertRowid
  for (const t of tasks) {
    await q.run(\`
      INSERT INTO tasks (project_id, title, description, priority, icon, estimate, recurrence, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'todo')
    \`, [projectId, t.title, t.description || '', t.priority, t.icon || '', t.estimate || 0, t.recurrence || 'none'])
  }
  return (await q.get('SELECT * FROM projects WHERE id = ?', [projectId]))
}`)

// C. deleteTemplate leftover
patch('deleteTemplate',
  `db.prepare('DELETE FROM templates WHERE id = ?').run(id)`,
  `await q.run('DELETE FROM templates WHERE id = ?', [id])`)

// D. getWeeklyReview thisWeekTime (mangled by greedy match)
patch('thisWeekTime', new RegExp(
  String.raw`const thisWeekTime = db\.prepare\(\`([^\`]*)\`, \[monday, sunday\]\)\)\.total`),
  'const thisWeekTime = (await q.get(`$1`, [monday, sunday])).total')

// E. setTaskTags loop
patch('setTaskTags', new RegExp(
  String.raw`const ins = db\.prepare\('INSERT OR IGNORE INTO task_tags \(task_id, tag_id\) VALUES \(\?, \?\)'\)\n  for \(const tagId of tagIds\) ins\.run\(taskId, tagId\)`),
`for (const tagId of tagIds) {
    await q.run('INSERT OR IGNORE INTO task_tags (task_id, tag_id) VALUES (?, ?)', [taskId, tagId])
  }`)

// F. getDependencyAncestors reused statement
patch('getDependencyAncestors', new RegExp(
  String.raw`const stmt  = db\.prepare\('SELECT depends_on_id FROM task_dependencies WHERE task_id = \?'\)\n  while \(stack\.length\) \{\n    const cur = stack\.pop\(\)\n    for \(const \{ depends_on_id \} of stmt\.all\(cur\)\) \{`),
`while (stack.length) {
    const cur = stack.pop()
    const rows = await q.all('SELECT depends_on_id FROM task_dependencies WHERE task_id = ?', [cur])
    for (const { depends_on_id } of rows) {`)

// G. setDailyIntentions transaction → sequential awaits
patch('setDailyIntentions', new RegExp(
  String.raw`const del = db\.prepare\('DELETE FROM daily_intentions WHERE date = \?'\)\n  const ins = db\.prepare\('INSERT INTO daily_intentions \(date, task_id, subtask_id, position\) VALUES \(\?, \?, \?, \?\)'\)\n  db\.transaction\(\(\) => \{\n    del\.run\(date\)\n    items\.forEach\(\(item, i\) => \{\n      const taskId    = typeof item === 'object' \? item\.taskId    : item\n      const subtaskId = typeof item === 'object' \? \(item\.subtaskId \|\| null\) : null\n      ins\.run\(date, taskId, subtaskId, i\)\n    \}\)\n  \}\)\(\)`),
`await q.run('DELETE FROM daily_intentions WHERE date = ?', [date])
  for (let i = 0; i < items.length; i++) {
    const item = items[i]
    const taskId    = typeof item === 'object' ? item.taskId    : item
    const subtaskId = typeof item === 'object' ? (item.subtaskId || null) : null
    await q.run('INSERT INTO daily_intentions (date, task_id, subtask_id, position) VALUES (?, ?, ?, ?)', [date, taskId, subtaskId, i])
  }`)

// H. updateTimeBlock mixed named+positional args → all named
patch('updateTimeBlock', new RegExp(
  String.raw`UPDATE time_blocks SET start_time = @start_time, end_time = @end_time WHERE id = \?\n  \`, \[data, id\]\)\)`),
`UPDATE time_blocks SET start_time = @start_time, end_time = @end_time WHERE id = @id
  \`, { start_time: data.start_time, end_time: data.end_time, id }))`)

// I. ASI protection: statement lines starting with "(await q." get a leading ";"
s = s.replace(/^(\s*)\(await q\./gm, '$1;(await q.')
applied.push('ASI ; prefix')

fs.writeFileSync(FILE, s)
console.log('Applied:', applied.join(', '))

const leftovers = s.split('\n').map((l, i) => /\bdb\./.test(l) ? `${i + 1}: ${l.trim()}` : null).filter(Boolean)
console.log(leftovers.length ? 'STILL LEFT:\n' + leftovers.join('\n') : 'No db.* leftovers ✓')
