const Database = require('better-sqlite3')
const path = require('path')

const dbPath = '/Users/zubairhamid/Library/Application Support/productivity-tracker/productivity.db'
const db = new Database(dbPath)
db.pragma('journal_mode = WAL')
db.pragma('foreign_keys = ON')

// ─── Create Project ───────────────────────────────────────────────────────────
const project = db.prepare(`
  INSERT INTO projects (name, description, color, status)
  VALUES (?, ?, ?, 'active')
`).run(
  'MIT No-Code AI Mastery',
  'Complete the MIT No-Code AI & Machine Learning curriculum and earn the certificate of completion. May 25 – Aug 24, 2026 · 6–12 hrs/week.',
  '#7c3aed'
)
const projectId = project.lastInsertRowid
console.log(`✅ Project created  id=${projectId}`)

// ─── Create Milestones ────────────────────────────────────────────────────────
const insertMilestone = db.prepare(`
  INSERT INTO milestones (project_id, title, due_date, description)
  VALUES (@project_id, @title, @due_date, @description)
`)

const milestones = [
  { title: 'Pre-work: Foundations',                   due: '2026-05-25', desc: 'Setup tools and brush up on math & stats basics.' },
  { title: 'Week 1: The AI & Gen AI Landscape',        due: '2026-06-01', desc: 'AI evolution, org data strategy, product strategy, quiz ≥80%.' },
  { title: 'Week 2: Data Exploration & Clustering',    due: '2026-06-08', desc: 'Clustering, K-means, PCA, hands-on KNIME, quiz ≥80%.' },
  { title: 'Week 3: Regression & Prediction',          due: '2026-06-15', desc: 'Linear regression, cross-validation, RapidMiner hands-on, quiz ≥80%.' },
  { title: 'Week 4: Classification & Decision Systems',due: '2026-06-22', desc: 'Decision trees, random forests, confusion matrix, quiz ≥80%.' },
  { title: 'PROJECT 1 — ML Classification',            due: '2026-06-29', desc: 'Sales Leads Conversion Prediction — EdTech dataset.' },
  { title: 'Week 6: Recommendation Systems',           due: '2026-07-06', desc: 'Collaborative & content-based filtering, Yelp hands-on, quiz ≥80%.' },
  { title: 'Week 7: Neural Networks & Deep Learning',  due: '2026-07-13', desc: 'NN basics, backprop, Teachable Machine digit recognition, quiz ≥80%.' },
  { title: 'Week 8: Computer Vision',                  due: '2026-07-20', desc: 'CNNs, transfer learning, image classifier, quiz ≥80%.' },
  { title: 'PROJECT 2 — Neural Networks',              due: '2026-07-27', desc: 'Design, build, and explain deep learning solution.' },
  { title: 'Week 10: Generative AI Foundations',       due: '2026-08-03', desc: 'LLMs, Transformers, prompting, quiz ≥80%.' },
  { title: 'Week 11: Business Applications of Gen AI', due: '2026-08-10', desc: 'RAG, Agentic AI, n8n workflow, Project 3 submission, quiz ≥80%.' },
  { title: 'Week 12: Ethical & Responsible AI',        due: '2026-08-17', desc: 'AI bias, privacy/GDPR, causality vs correlation, quiz ≥80%.' },
  { title: 'Self-Paced Bonus Modules',                 due: '2026-08-17', desc: 'Text processing, sentiment analysis, time series, ARIMA.' },
  { title: 'Certification & Next Steps',               due: '2026-08-24', desc: 'Verify scores, download certificate, update LinkedIn, plan next track.' },
]

const milestoneIds = {}
for (const m of milestones) {
  const r = insertMilestone.run({ project_id: projectId, title: m.title, due_date: m.due, description: m.desc })
  milestoneIds[m.title] = r.lastInsertRowid
  console.log(`  📍 Milestone: ${m.title}  (${m.due})`)
}

// ─── Create Tasks ─────────────────────────────────────────────────────────────
const insertTask = db.prepare(`
  INSERT INTO tasks
    (project_id, title, description, status, priority, due_date, start_date, recurrence, notify_before, icon, estimate)
  VALUES
    (@project_id, @title, @description, @status, @priority, @due_date, @start_date, @recurrence, @notify_before, @icon, @estimate)
`)

function task(title, dueDate, { priority='medium', icon='', description='', startDate=null } = {}) {
  return { project_id: projectId, title, description, status: 'todo', priority,
    due_date: dueDate, start_date: startDate, recurrence: 'none',
    notify_before: 10, icon, estimate: 0 }
}

const tasks = [
  // ── Pre-work (due May 25)
  task('Watch AI history overview',              '2026-05-25', { icon: '📺' }),
  task('Set up KNIME',                           '2026-05-25', { icon: '⚙️' }),
  task('Set up RapidMiner',                      '2026-05-25', { icon: '⚙️' }),
  task('Build first AI workflow',                '2026-05-25', { icon: '🔧' }),
  task('Tutor session: math & stats basics',     '2026-05-25', { icon: '🧑‍🏫', priority: 'high' }),

  // ── Week 1 (due Jun 1)
  task('Study AI evolution timeline',            '2026-06-01', { icon: '📖' }),
  task('Study how organisations use data',       '2026-06-01', { icon: '📖' }),
  task('Study AI product strategy',              '2026-06-01', { icon: '📖' }),
  task('Tutor session: Week 1 review',           '2026-06-01', { icon: '🧑‍🏫', priority: 'high' }),
  task('Pass Week 1 quiz (≥80%)',                '2026-06-01', { icon: '✅', priority: 'high' }),

  // ── Week 2 (due Jun 8)
  task('Study clustering concepts',              '2026-06-08', { icon: '📖' }),
  task('Study K-means & PCA',                    '2026-06-08', { icon: '📖' }),
  task('Hands-on: cluster data in KNIME',        '2026-06-08', { icon: '💻', priority: 'high' }),
  task('Pass Week 2 quiz (≥80%)',                '2026-06-08', { icon: '✅', priority: 'high' }),

  // ── Week 3 (due Jun 15)
  task('Study linear regression',                '2026-06-15', { icon: '📖' }),
  task('Study cross-validation methods',         '2026-06-15', { icon: '📖' }),
  task('Hands-on: hospital stay prediction in RapidMiner', '2026-06-15', { icon: '💻', priority: 'high' }),
  task('Pass Week 3 quiz (≥80%)',                '2026-06-15', { icon: '✅', priority: 'high' }),

  // ── Week 4 (due Jun 22)
  task('Study decision trees',                   '2026-06-22', { icon: '📖' }),
  task('Study random forests',                   '2026-06-22', { icon: '📖' }),
  task('Study confusion matrix',                 '2026-06-22', { icon: '📖' }),
  task('Hands-on: hotel booking cancellation model', '2026-06-22', { icon: '💻', priority: 'high' }),
  task('Pass Week 4 quiz (≥80%)',                '2026-06-22', { icon: '✅', priority: 'high' }),

  // ── PROJECT 1 (due Jun 29)
  task('Load EdTech leads dataset',              '2026-06-29', { icon: '📂', priority: 'high' }),
  task('Clean and preprocess data',              '2026-06-29', { icon: '🔧', priority: 'high' }),
  task('Build and compare ML models',            '2026-06-29', { icon: '🤖', priority: 'high' }),
  task('Submit: Sales Leads Conversion Prediction', '2026-06-29', { icon: '🚀', priority: 'urgent' }),

  // ── Week 6 (due Jul 6)
  task('Study collaborative filtering',          '2026-07-06', { icon: '📖' }),
  task('Study content-based methods',            '2026-07-06', { icon: '📖' }),
  task('Hands-on: Yelp recommendation system',   '2026-07-06', { icon: '💻', priority: 'high' }),
  task('Pass Week 6 quiz (≥80%)',                '2026-07-06', { icon: '✅', priority: 'high' }),

  // ── Week 7 (due Jul 13)
  task('Study neural network basics',            '2026-07-13', { icon: '📖' }),
  task('Study how networks learn',               '2026-07-13', { icon: '📖' }),
  task('Hands-on: digit recognition in Teachable Machine', '2026-07-13', { icon: '💻', priority: 'high' }),
  task('Pass Week 7 quiz (≥80%)',                '2026-07-13', { icon: '✅', priority: 'high' }),

  // ── Week 8 (due Jul 20)
  task('Study CNNs visually',                    '2026-07-20', { icon: '📖' }),
  task('Study transfer learning',                '2026-07-20', { icon: '📖' }),
  task('Hands-on: image classifier in Teachable Machine', '2026-07-20', { icon: '💻', priority: 'high' }),
  task('Pass Week 8 quiz (≥80%)',                '2026-07-20', { icon: '✅', priority: 'high' }),

  // ── PROJECT 2 (due Jul 27)
  task('Design deep learning solution',          '2026-07-27', { icon: '🎨', priority: 'high' }),
  task('Build and train model',                  '2026-07-27', { icon: '🤖', priority: 'high' }),
  task('Summarise results for non-technical audience', '2026-07-27', { icon: '📝', priority: 'high' }),
  task('Submit Project 2 — Neural Networks',     '2026-07-27', { icon: '🚀', priority: 'urgent' }),

  // ── Week 10 (due Aug 3)
  task('Study how LLMs work',                    '2026-08-03', { icon: '📖' }),
  task('Study Transformer architecture',         '2026-08-03', { icon: '📖' }),
  task('Practice zero-shot & few-shot prompting','2026-08-03', { icon: '💬', priority: 'high' }),
  task('Hands-on: advanced prompting in ChatGPT & Gemini', '2026-08-03', { icon: '💻', priority: 'high' }),
  task('Pass Week 10 quiz (≥80%)',               '2026-08-03', { icon: '✅', priority: 'high' }),

  // ── Week 11 (due Aug 10)
  task('Study RAG pipelines',                    '2026-08-10', { icon: '📖' }),
  task('Study Agentic AI',                       '2026-08-10', { icon: '📖' }),
  task('Hands-on: build workflow in n8n',        '2026-08-10', { icon: '💻', priority: 'high' }),
  task('Submit PROJECT 3 — GenAI Marketing Content', '2026-08-10', { icon: '🚀', priority: 'urgent' }),
  task('Pass Week 11 quiz (≥80%)',               '2026-08-10', { icon: '✅', priority: 'high' }),

  // ── Week 12 (due Aug 17)
  task('Study AI bias types',                    '2026-08-17', { icon: '📖' }),
  task('Study privacy & GDPR',                   '2026-08-17', { icon: '📖' }),
  task('Study causality vs correlation',         '2026-08-17', { icon: '📖' }),
  task('Pass final module quiz (≥80%)',           '2026-08-17', { icon: '✅', priority: 'high' }),

  // ── Bonus Modules (due Aug 17)
  task('Bonus: Text processing & sentiment analysis in KNIME', '2026-08-17', { icon: '⭐', priority: 'low' }),
  task('Bonus: Time series & ARIMA modeling',    '2026-08-17', { icon: '⭐', priority: 'low' }),

  // ── Certification (due Aug 24)
  task('Verify all module scores ≥80%',          '2026-08-24', { icon: '🔍', priority: 'high' }),
  task('Download MIT certificate',               '2026-08-24', { icon: '🎓', priority: 'urgent' }),
  task('Update LinkedIn with certificate and 3 projects', '2026-08-24', { icon: '💼', priority: 'high' }),
  task('Plan next learning track',               '2026-08-24', { icon: '🗺️', priority: 'medium' }),
]

for (const t of tasks) {
  insertTask.run(t)
}
console.log(`✅ ${tasks.length} tasks created`)

// ─── Recurring Reminders ──────────────────────────────────────────────────────
// First Sunday on or after May 25, 2026 → May 31 (check: May 25 is a Monday)
// First Friday on or after May 25, 2026 → May 29

const sundayTask = db.prepare(`
  INSERT INTO tasks
    (project_id, title, description, status, priority, due_date, start_date, recurrence, notify_before, icon, estimate)
  VALUES
    (?, ?, ?, 'todo', 'medium', '2026-05-31', '2026-05-25', 'weekly', 30, '🧑‍🏫', 0)
`).run(
  projectId,
  'Weekly AI tutor session — review concepts & prep for next week',
  'Every Sunday: review what was studied this week and prepare questions and focus areas for the coming week with AI tutor.'
)

const fridayTask = db.prepare(`
  INSERT INTO tasks
    (project_id, title, description, status, priority, due_date, start_date, recurrence, notify_before, icon, estimate)
  VALUES
    (?, ?, ?, 'todo', 'medium', '2026-05-29', '2026-05-25', 'weekly', 30, '📋', 0)
`).run(
  projectId,
  'Weekly progress review — mark completed tasks',
  "Every Friday: review the week's progress, mark completed tasks, note blockers or carry-overs."
)

console.log(`✅ 2 recurring reminders created (Sunday tutor + Friday review)`)
console.log(`\n🎉 Done! Project "MIT No-Code AI Mastery" fully loaded.`)
console.log(`   Project ID: ${projectId}`)
console.log(`   Milestones: ${milestones.length}`)
console.log(`   Tasks:      ${tasks.length + 2}  (incl. 2 recurring)`)

db.close()
