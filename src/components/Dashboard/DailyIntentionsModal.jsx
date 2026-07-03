import { useState, useEffect } from 'react'
import { Target, X, Star, Check, ChevronDown, ChevronRight, ListChecks } from 'lucide-react'

const PRIORITY_DOT = { urgent: 'bg-red-400', high: 'bg-orange-400', medium: 'bg-yellow-400', low: 'bg-slate-400' }
const today = () => new Date().toISOString().split('T')[0]

// Each selected MIT: { key, taskId, subtaskId?, title, parentTitle?, project_name }
// key = `task-${id}` or `sub-${id}`

export default function DailyIntentionsModal({ open, onClose, onSaved }) {
  const [tasks, setTasks]         = useState([])   // tasks with .subtasks[]
  const [selected, setSelected]   = useState([])   // array of MIT objects (max 3)
  const [expanded, setExpanded]   = useState({})   // { taskId: bool }
  const [loading, setLoading]     = useState(true)
  const [saving, setSaving]       = useState(false)
  const [saved, setSaved]         = useState(false)

  useEffect(() => {
    if (!open) return
    setSaved(false)
    ;(async () => {
      setLoading(true)
      const [allTasks, allSubtasks, intentions] = await Promise.all([
        window.api.getTasksSummary(),
        window.api.getAllActiveSubtasks(),
        window.api.getDailyIntentions(today()),
      ])

      // Attach subtasks to their parent tasks
      const taskMap = (allTasks || []).map(t => ({
        ...t,
        subtasks: (allSubtasks || []).filter(s => s.task_id === t.id && !s.done),
      }))
      setTasks(taskMap)

      // Restore previously saved intentions
      const restored = (intentions || []).map(i => ({
        key:         i.subtask_id ? `sub-${i.subtask_id}` : `task-${i.task_id}`,
        taskId:      i.task_id,
        subtaskId:   i.subtask_id || null,
        title:       i.title,
        parentTitle: i.subtask_id ? i.task_title : null,
        project_name: i.project_name,
      }))
      setSelected(restored)
      setLoading(false)
    })()
  }, [open])

  function toggleExpand(taskId) {
    setExpanded(prev => ({ ...prev, [taskId]: !prev[taskId] }))
  }

  function isSelected(key) {
    return selected.some(s => s.key === key)
  }

  function toggleTask(task) {
    const key = `task-${task.id}`
    if (isSelected(key)) {
      setSelected(prev => prev.filter(s => s.key !== key))
    } else {
      if (selected.length >= 3) return
      setSelected(prev => [...prev, {
        key,
        taskId:      task.id,
        subtaskId:   null,
        title:       task.title,
        parentTitle: null,
        project_name: task.project_name,
      }])
    }
  }

  function toggleSubtask(task, sub) {
    const key = `sub-${sub.id}`
    if (isSelected(key)) {
      setSelected(prev => prev.filter(s => s.key !== key))
    } else {
      if (selected.length >= 3) return
      setSelected(prev => [...prev, {
        key,
        taskId:      task.id,
        subtaskId:   sub.id,
        title:       sub.title,
        parentTitle: task.title,
        project_name: task.project_name,
      }])
    }
  }

  async function save() {
    setSaving(true)
    const items = selected.map(s => ({ taskId: s.taskId, subtaskId: s.subtaskId }))
    await window.api.setDailyIntentions(today(), items)
    setSaving(false)
    setSaved(true)
    setTimeout(() => { onSaved?.(); onClose() }, 700)
  }

  if (!open) return null

  const atLimit = selected.length >= 3

  return (
    <div className="fixed inset-0 z-[9998] flex items-center justify-center" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm" />
      <div className="relative w-full max-w-lg mx-4 glass-card card-shadow rounded-2xl border border-white/10 overflow-hidden">

        {/* Header */}
        <div className="flex items-center gap-3 px-6 py-4 border-b border-white/5">
          <div className="w-8 h-8 rounded-xl bg-amber-500/20 flex items-center justify-center">
            <Star size={15} className="text-amber-400" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-white">Daily Intentions</h2>
            <p className="text-xs text-slate-500">Pick up to 3 MITs — choose a task or a specific subtask</p>
          </div>
          <button onClick={onClose} className="ml-auto p-1.5 rounded-lg hover:bg-white/5 text-slate-600 hover:text-slate-400 transition-colors">
            <X size={14} />
          </button>
        </div>

        {/* Selected MITs preview */}
        {selected.length > 0 && (
          <div className="px-6 pt-4 pb-2">
            <p className="text-xs text-slate-500 font-medium uppercase tracking-wide mb-2">Your MITs today</p>
            <div className="space-y-1.5">
              {selected.map((s, i) => (
                <div key={s.key} className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
                  <span className="text-xs font-bold text-amber-400/60 w-4">#{i + 1}</span>
                  {s.subtaskId
                    ? <ListChecks size={12} className="text-amber-400 flex-shrink-0" />
                    : <Star size={12} className="text-amber-400 flex-shrink-0" />
                  }
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white truncate">{s.title}</p>
                    {s.parentTitle && (
                      <p className="text-xs text-amber-400/50 truncate">in {s.parentTitle}</p>
                    )}
                  </div>
                  <span className="text-xs text-amber-400/60 flex-shrink-0 truncate max-w-[80px]">{s.project_name}</span>
                  <button
                    onClick={() => setSelected(prev => prev.filter(x => x.key !== s.key))}
                    className="p-0.5 rounded text-slate-600 hover:text-slate-400 transition-colors flex-shrink-0"
                  >
                    <X size={11} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Task + subtask picker */}
        <div className="px-6 py-3 max-h-72 overflow-y-auto space-y-1">
          {loading ? (
            <p className="text-slate-500 text-sm py-4 text-center">Loading tasks…</p>
          ) : tasks.length === 0 ? (
            <p className="text-slate-500 text-sm py-4 text-center">No active tasks found</p>
          ) : (
            tasks.map(t => {
              const taskKey  = `task-${t.id}`
              const taskSel  = isSelected(taskKey)
              const isOpen   = expanded[t.id]
              const hasSubtasks = t.subtasks?.length > 0
              const anySubSel = t.subtasks?.some(s => isSelected(`sub-${s.id}`))

              return (
                <div key={t.id}>
                  {/* Task row */}
                  <div className={`flex items-center gap-2 px-3 py-2.5 rounded-xl transition-all ${
                    taskSel   ? 'bg-amber-500/15 border border-amber-500/30' :
                    anySubSel ? 'bg-amber-500/5  border border-amber-500/15' :
                                'border border-transparent hover:bg-white/5'
                  }`}>
                    {/* Checkbox (select whole task as MIT) */}
                    <button
                      onClick={() => toggleTask(t)}
                      disabled={atLimit && !taskSel}
                      className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                        taskSel ? 'border-amber-400 bg-amber-400' : 'border-slate-600'
                      } ${atLimit && !taskSel ? 'opacity-30 cursor-not-allowed' : ''}`}
                    >
                      {taskSel && <Check size={9} className="text-slate-900" />}
                    </button>

                    {/* Task title (clickable = select task) */}
                    <button
                      onClick={() => toggleTask(t)}
                      disabled={atLimit && !taskSel}
                      className={`flex-1 flex items-center gap-2 text-left min-w-0 ${atLimit && !taskSel ? 'opacity-30 cursor-not-allowed' : ''}`}
                    >
                      <span className="text-sm leading-none flex-shrink-0">{t.icon || '📌'}</span>
                      <span className="flex-1 text-sm text-white truncate">{t.title}</span>
                    </button>

                    <span className={`w-2 h-2 rounded-full flex-shrink-0 ${PRIORITY_DOT[t.priority]}`} />
                    <span className="text-xs text-slate-500 flex-shrink-0 max-w-[70px] truncate">{t.project_name}</span>

                    {/* Expand toggle — only if task has subtasks */}
                    {hasSubtasks && (
                      <button
                        onClick={() => toggleExpand(t.id)}
                        className="p-1 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-white/5 transition-colors flex-shrink-0"
                        title={isOpen ? 'Hide subtasks' : 'Pick a specific subtask'}
                      >
                        {isOpen ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                      </button>
                    )}
                  </div>

                  {/* Subtask rows (indented) */}
                  {hasSubtasks && isOpen && (
                    <div className="ml-6 mt-0.5 space-y-0.5 border-l border-white/5 pl-3">
                      {t.subtasks.map(s => {
                        const subKey = `sub-${s.id}`
                        const subSel = isSelected(subKey)
                        return (
                          <button
                            key={s.id}
                            onClick={() => toggleSubtask(t, s)}
                            disabled={atLimit && !subSel}
                            className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-all ${
                              subSel  ? 'bg-amber-500/15 border border-amber-500/30' :
                                        'hover:bg-white/5 border border-transparent'
                            } ${atLimit && !subSel ? 'opacity-30 cursor-not-allowed' : ''}`}
                          >
                            <div className={`w-3.5 h-3.5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all ${subSel ? 'border-amber-400 bg-amber-400' : 'border-slate-600'}`}>
                              {subSel && <Check size={8} className="text-slate-900" />}
                            </div>
                            <ListChecks size={11} className="text-slate-500 flex-shrink-0" />
                            <span className="flex-1 text-xs text-slate-300 truncate">{s.title}</span>
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-white/5">
          <span className="text-xs text-slate-600">{selected.length}/3 MITs selected</span>
          <div className="flex gap-2">
            <button onClick={onClose} className="px-4 py-2 text-sm rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 transition-colors">
              Cancel
            </button>
            <button
              onClick={save}
              disabled={saving || selected.length === 0}
              className={`px-5 py-2 text-sm rounded-xl font-medium transition-all ${
                saved            ? 'bg-emerald-500 text-white' :
                selected.length > 0 ? 'bg-amber-500 hover:bg-amber-400 text-slate-900' :
                                  'bg-white/5 text-slate-600 cursor-not-allowed'
              }`}
            >
              {saved ? '✓ Saved!' : saving ? 'Saving…' : 'Set Intentions'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
