import { useState, useEffect, useCallback } from 'react'
import { Inbox, ArrowRight, Plus, CheckCircle2, ChevronDown, Loader2, Trash2 } from 'lucide-react'

function fmtDate(d) {
  if (!d) return ''
  return new Date(d + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

const PRIORITY_COLORS = {
  urgent: 'bg-red-500/15 text-red-600 dark:text-red-300 border border-red-500/25',
  high:   'bg-orange-500/15 text-orange-600 dark:text-orange-300 border border-orange-500/25',
  medium: 'bg-yellow-500/15 text-yellow-700 dark:text-yellow-300 border border-yellow-500/25',
  low:    'bg-th-raised text-th-text3 border border-th-border',
}

export default function InboxView() {
  const [tasks, setTasks]       = useState([])
  const [projects, setProjects] = useState([])
  const [loading, setLoading]   = useState(true)
  const [processing, setProcessing] = useState(null)
  const [showMove, setShowMove] = useState(null)
  const [newTitle, setNewTitle] = useState('')
  const [adding, setAdding]     = useState(false)
  const [inboxId, setInboxId]   = useState(null)

  const load = useCallback(async () => {
    const [t, p] = await Promise.all([
      window.api.getInboxTasks(),
      window.api.getProjects(),
    ])
    setTasks(t || [])
    const nonInbox = (p || []).filter(pr => !pr.is_inbox && pr.status === 'active')
    setProjects(nonInbox)
    if (t?.length) setInboxId(t[0].project_id)
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  async function addTask() {
    const title = newTitle.trim()
    if (!title) return
    let pid = inboxId
    if (!pid) {
      const all = await window.api.getProjects()
      const inbox = all?.find(p => p.is_inbox)
      pid = inbox?.id
      setInboxId(pid)
    }
    if (!pid) return
    await window.api.createTask({ project_id: pid, title, status: 'todo', priority: 'medium' })
    setNewTitle('')
    setAdding(false)
    load()
  }

  async function moveTask(taskId, projectId) {
    setProcessing(taskId)
    setShowMove(null)
    await window.api.processInboxTask(taskId, projectId)
    setProcessing(null)
    load()
  }

  async function deleteTask(taskId) {
    await window.api.deleteTask(taskId)
    load()
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-th-bg/40">

      {/* Header */}
      <div className="flex items-center justify-between px-8 py-6 border-b border-th-border/60">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-indigo-500/15 flex items-center justify-center">
            <Inbox size={18} className="text-indigo-500 dark:text-indigo-400" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-th-text1">Quick Capture Inbox</h1>
            <p className="text-xs text-th-text4 mt-0.5">Capture ideas fast → process them into projects</p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span className="px-2.5 py-1 rounded-full bg-indigo-500/15 text-indigo-600 dark:text-indigo-300 font-medium text-xs">
            {tasks.length} unprocessed
          </span>
        </div>
      </div>

      {/* Quick-add bar */}
      <div className="px-8 py-4 border-b border-th-border/50">
        {adding ? (
          <div className="flex gap-2">
            <input
              autoFocus
              value={newTitle}
              onChange={e => setNewTitle(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') addTask(); if (e.key === 'Escape') setAdding(false) }}
              placeholder="What's on your mind? Press Enter to capture…"
              className="flex-1 bg-th-raised border border-th-border rounded-xl px-4 py-2.5 text-sm text-th-text1 placeholder:text-th-text4 focus:outline-none focus:border-indigo-500/60"
            />
            <button onClick={addTask} className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition-colors">
              Capture
            </button>
            <button onClick={() => setAdding(false)} className="px-4 py-2.5 rounded-xl bg-th-raised hover:bg-th-card text-th-text3 text-sm transition-colors border border-th-border">
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={() => setAdding(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-dashed border-th-border text-th-text4 hover:text-th-text1 hover:border-indigo-500/50 hover:bg-indigo-500/5 transition-all w-full text-sm"
          >
            <Plus size={15} />
            <span>Capture a thought, task, or idea…</span>
            <span className="ml-auto text-xs text-th-text5">⌘K from anywhere</span>
          </button>
        )}
      </div>

      {/* Task list */}
      <div className="flex-1 overflow-y-auto px-8 py-4 space-y-2">
        {loading ? (
          <div className="flex items-center justify-center py-20 text-th-text4">
            <Loader2 size={20} className="animate-spin mr-2" /> Loading…
          </div>
        ) : tasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
            <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 flex items-center justify-center">
              <CheckCircle2 size={28} className="text-indigo-400/60" />
            </div>
            <p className="text-th-text2 font-medium">Inbox zero — great job!</p>
            <p className="text-th-text4 text-sm max-w-xs">Every captured idea has been processed. Use the bar above to capture your next thought.</p>
          </div>
        ) : (
          tasks.map(task => (
            <div
              key={task.id}
              className="bg-th-card border border-th-border/60 rounded-xl px-4 py-3.5 flex items-start gap-3 group transition-all duration-150 hover:border-th-border hover:bg-th-raised/40"
            >
              {/* Icon */}
              <div className="w-7 h-7 rounded-lg bg-indigo-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-base leading-none">{task.icon || '📝'}</span>
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <p className="text-sm text-th-text1 font-medium leading-snug">{task.title}</p>
                {task.due_date && (
                  <p className="text-xs text-th-text4 mt-0.5">Due {fmtDate(task.due_date)}</p>
                )}
                {task.description && (
                  <p className="text-xs text-th-text4 mt-1 line-clamp-1">{task.description}</p>
                )}
              </div>

              {/* Priority badge */}
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${PRIORITY_COLORS[task.priority] || PRIORITY_COLORS.medium}`}>
                {task.priority}
              </span>

              {/* Actions */}
              <div className="flex items-center gap-1 flex-shrink-0">
                <div className="relative">
                  <button
                    onClick={() => setShowMove(showMove === task.id ? null : task.id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium transition-colors"
                  >
                    {processing === task.id ? (
                      <Loader2 size={12} className="animate-spin" />
                    ) : (
                      <>
                        <ArrowRight size={12} />
                        Process
                        <ChevronDown size={10} />
                      </>
                    )}
                  </button>

                  {showMove === task.id && (
                    <div className="absolute right-0 top-full mt-1.5 z-50 bg-th-surface border border-th-border rounded-xl shadow-xl overflow-hidden min-w-[200px]">
                      <div className="px-3 py-2 text-xs text-th-text4 border-b border-th-border font-medium uppercase tracking-wide">
                        Move to project
                      </div>
                      {projects.length === 0 ? (
                        <div className="px-3 py-3 text-xs text-th-text4">No active projects</div>
                      ) : (
                        projects.map(p => (
                          <button
                            key={p.id}
                            onClick={() => moveTask(task.id, p.id)}
                            className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-th-text2 hover:bg-th-raised transition-colors text-left"
                          >
                            <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: p.color }} />
                            <span className="truncate">{p.name}</span>
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>

                <button
                  onClick={() => deleteTask(task.id)}
                  className="p-1.5 rounded-lg hover:bg-red-500/15 text-th-text5 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Tips */}
      <div className="px-8 py-4 border-t border-th-border/50">
        <p className="text-xs text-th-text4">
          <span className="text-th-text3 font-medium">GTD tip:</span> Process your inbox daily — capture everything here, then decide: do it (2 min), delegate it, defer it, or file it.
        </p>
      </div>
    </div>
  )
}
