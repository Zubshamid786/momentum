import React, { useEffect, useState, useRef } from 'react'
import { X, Play, Square, Plus, Trash2, Pencil, Check, Send, Calendar, AlertCircle, Timer, ChevronLeft } from 'lucide-react'
import { ICON_CATEGORIES } from '../../constants/taskIcons'
import { useToast } from '../UI/Toast'

function IconPicker({ value, onChange }) {
  const [open, setOpen] = useState(false)
  const [tab, setTab]   = useState(0)
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="w-8 h-8 flex items-center justify-center rounded-lg border border-th-border bg-th-raised text-lg hover:border-brand-500 transition-colors"
        title="Change icon"
      >
        {value || <span className="text-th-text5 text-xs">+</span>}
      </button>
      {open && (
        <div className="absolute top-10 left-0 z-50 bg-th-surface border border-th-border rounded-xl shadow-xl w-72" style={{ maxHeight: 300 }}>
          <div className="flex overflow-x-auto border-b border-th-border px-2 pt-1.5 gap-0.5 scrollbar-none">
            {ICON_CATEGORIES.map((cat, i) => (
              <button
                key={cat.label}
                type="button"
                onClick={() => setTab(i)}
                className={`shrink-0 px-2 py-1 text-xs rounded-t-md transition-colors ${tab === i ? 'text-brand-400 border-b-2 border-brand-400' : 'text-th-text4 hover:text-th-text2'}`}
              >
                {cat.label}
              </button>
            ))}
          </div>
          <div className="p-2 grid grid-cols-8 gap-1 overflow-y-auto" style={{ maxHeight: 210 }}>
            <button
              type="button"
              onClick={() => { onChange(''); setOpen(false) }}
              className="h-8 w-8 flex items-center justify-center rounded-lg text-th-text5 hover:bg-th-raised text-xs transition-colors"
            >✕</button>
            {ICON_CATEGORIES[tab].icons.map(icon => (
              <button
                key={icon}
                type="button"
                onClick={() => { onChange(icon); setOpen(false) }}
                className={`h-8 w-8 flex items-center justify-center rounded-lg text-lg hover:bg-th-raised transition-colors ${value === icon ? 'bg-brand-500/20 ring-1 ring-brand-500' : ''}`}
              >
                {icon}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
import { useApp } from '../../context/AppContext'
import { formatDuration, formatDurationLong, formatDateTime, isOverdue, isDueToday } from '../../utils/formatTime'
import TagPicker from '../UI/TagPicker'

const STATUS_OPTIONS    = ['todo', 'in_progress', 'blocked', 'done']
const PRIORITY_OPTIONS  = ['low', 'medium', 'high', 'urgent']
const RECURRENCE_OPTIONS = ['none', 'daily', 'weekly', 'monthly']
const STATUS_LABEL    = { todo: 'To Do', in_progress: 'In Progress', done: 'Done', blocked: 'Blocked' }
const PRIORITY_LABEL  = { low: 'Low', medium: 'Medium', high: 'High', urgent: 'Urgent' }
const RECURRENCE_LABEL = { none: 'None', daily: 'Daily', weekly: 'Weekly', monthly: 'Monthly' }

const STATUS_STYLE = {
  todo:        'bg-th-raised text-th-text3',
  in_progress: 'bg-blue-500/20 text-blue-400',
  done:        'bg-green-500/20 text-green-400',
  blocked:     'bg-red-500/20 text-red-400',
}
const PRIORITY_STYLE = {
  low:    'bg-th-raised text-th-text3',
  medium: 'bg-yellow-500/20 text-yellow-400',
  high:   'bg-orange-500/20 text-orange-400',
  urgent: 'bg-red-500/20 text-red-400',
}

// Minutes → "1h 30m" / "2h" / "45m"
function fmtMins(mins) {
  const h = Math.floor(mins / 60), m = mins % 60
  if (h && m) return `${h}h ${m}m`
  if (h) return `${h}h`
  return `${m}m`
}

// Inline hours + minutes estimate editor for a subtask (stored as total minutes)
function SubtaskEstimate({ subtask, onSave }) {
  const e0 = subtask.estimate || 0
  const [h, setH] = useState(e0 >= 60 ? String(Math.floor(e0 / 60)) : '')
  const [m, setM] = useState(e0 % 60 ? String(e0 % 60) : '')
  useEffect(() => {
    const e = subtask.estimate || 0
    setH(e >= 60 ? String(Math.floor(e / 60)) : '')
    setM(e % 60 ? String(e % 60) : '')
  }, [subtask.estimate])
  const commit = () => onSave((parseInt(h) || 0) * 60 + (parseInt(m) || 0))
  const cls = "w-8 bg-th-raised border border-th-border rounded px-1 py-0.5 text-xs text-th-text3 text-center focus:outline-none focus:border-brand-500"
  return (
    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity shrink-0"
      onClick={e => e.stopPropagation()}>
      <input type="number" min="0" placeholder="0" value={h} onChange={e => setH(e.target.value)} onBlur={commit} className={cls} title="Hours" />
      <span className="text-2xs text-th-text5">h</span>
      <input type="number" min="0" max="59" placeholder="0" value={m} onChange={e => setM(e.target.value)} onBlur={commit} className={cls} title="Minutes" />
      <span className="text-2xs text-th-text5">m</span>
    </div>
  )
}

export default function TaskDetail({ taskId, projectId, projectColor, onClose, onUpdated, onOpenFocusPomodoro, panel = false }) {
  const { state, startTimer, stopTimer, loadOverdueTasks } = useApp()
  const { activeTimer, timerSeconds } = state
  const { showToast } = useToast()

  const [task, setTask]             = useState(null)
  const [timeEntries, setTimeEntries] = useState([])
  const [comments, setComments]     = useState([])
  const [subtasks, setSubtasks]     = useState([])
  const [editTitle, setEditTitle]   = useState(false)
  const [titleVal, setTitleVal]     = useState('')
  const [editDesc, setEditDesc]     = useState(false)
  const [descVal, setDescVal]       = useState('')
  const [newComment, setNewComment] = useState('')
  const [editingComment, setEditingComment] = useState(null)
  const [editCommentVal, setEditCommentVal] = useState('')
  const [showManualEntry, setShowManualEntry] = useState(false)
  const [manualEntry, setManualEntry] = useState({ date: '', hours: '', minutes: '', startTime: '', notes: '' })
  const [showManualStartTime, setShowManualStartTime] = useState(false)
  const [newSubtask, setNewSubtask] = useState('')
  const [editingSubtask, setEditingSubtask] = useState(null)
  const [editSubtaskVal, setEditSubtaskVal] = useState('')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)
  // Local state for h/m estimate fields — committed on blur to avoid rapid API calls
  const [estH, setEstH] = useState('')
  const [estM, setEstM] = useState('')

  const isRunning = activeTimer?.task_id === taskId

  async function loadAll() {
    const [t, te, c, st] = await Promise.all([
      window.api.getTask(taskId),
      window.api.getTimeEntries({ taskId }),
      window.api.getComments(taskId),
      window.api.getSubtasks(taskId),
    ])
    setTask(t); setTitleVal(t?.title || ''); setDescVal(t?.description || '')
    setTimeEntries(te); setComments(c); setSubtasks(st || [])
    // Sync estimate fields from DB value (stored in seconds)
    const secs = t?.estimate || 0
    setEstH(secs > 0 ? String(Math.floor(secs / 3600)) : '')
    setEstM(secs > 0 ? String(Math.floor((secs % 3600) / 60)) : '')
  }

  useEffect(() => { loadAll() }, [taskId])

  async function updateField(field, value) {
    await window.api.updateTask(taskId, { [field]: value })
    loadAll(); onUpdated()
    // Rescheduling or completing a task changes overdue status — refresh the bell
    loadOverdueTasks?.()
  }

  async function handleTitleSave() {
    if (titleVal.trim() && titleVal !== task.title) await updateField('title', titleVal.trim())
    setEditTitle(false)
  }

  async function handleDescSave() { await updateField('description', descVal); setEditDesc(false) }

  async function handleTimerToggle() {
    if (isRunning) await stopTimer()
    else await startTimer({ id: taskId, project_id: projectId })
    loadAll(); onUpdated()
  }

  async function handlePomodoro() {
    if (!isRunning) await startTimer({ id: taskId, project_id: projectId })
    loadAll(); onUpdated()
    onOpenFocusPomodoro?.()
  }

  function handleDeleteEntry(entry) {
    setTimeEntries(prev => prev.filter(e => e.id !== entry.id))
    let undone = false
    showToast('Time entry deleted', {
      onUndo: () => { undone = true; setTimeEntries(prev => [...prev, entry].sort((a, b) => a.id - b.id)) },
      duration: 5000,
    })
    setTimeout(async () => { if (!undone) { await window.api.deleteTimeEntry(entry.id); onUpdated() } }, 5000)
  }

  async function handleManualEntry(e) {
    e.preventDefault()
    const { date, hours, minutes, startTime, notes } = manualEntry
    const h        = parseInt(hours)   || 0
    const m        = parseInt(minutes) || 0
    const duration = h * 3600 + m * 60
    if (!date || duration <= 0) return

    let start, end
    if (startTime) {
      start = new Date(`${date}T${startTime}:00`)
      end   = new Date(start.getTime() + duration * 1000)
    } else {
      // Anchor at noon local — stays within the same UTC date for all UTC±12 timezones,
      // so date(start_time) = date('now') queries always match correctly
      start = new Date(`${date}T12:00:00`)
      end   = new Date(start.getTime() + duration * 1000)
    }

    await window.api.createTimeEntry({
      task_id: taskId, project_id: projectId,
      start_time: start.toISOString(), end_time: end.toISOString(),
      duration, notes,
    })
    setManualEntry({ date: '', hours: '', minutes: '', startTime: '', notes: '' })
    setShowManualStartTime(false)
    setShowManualEntry(false); loadAll(); onUpdated()
  }

  async function handleAddComment(e) {
    e.preventDefault()
    if (!newComment.trim()) return
    await window.api.createComment({ task_id: taskId, content: newComment.trim() })
    setNewComment(''); loadAll()
  }

  async function handleEditComment(id) {
    await window.api.updateComment(id, { content: editCommentVal.trim() })
    setEditingComment(null); loadAll()
  }

  async function handleDeleteComment(id) { await window.api.deleteComment(id); loadAll() }

  async function handleAddSubtask(e) {
    e.preventDefault()
    if (!newSubtask.trim()) return
    await window.api.createSubtask({ task_id: taskId, title: newSubtask.trim() })
    setNewSubtask(''); loadAll()
  }

  async function handleToggleSubtask(id) { await window.api.toggleSubtask(id); loadAll() }

  async function handleEditSubtask(id) {
    if (!editSubtaskVal.trim()) return
    await window.api.updateSubtask(id, editSubtaskVal.trim())
    setEditingSubtask(null); loadAll()
  }

  async function handleDeleteSubtask(id) { await window.api.deleteSubtask(id); loadAll() }

  async function handleDeleteTask() {
    setDeleting(true)
    await window.api.deleteTask(taskId)
    setDeleting(false)
    onUpdated()
    loadOverdueTasks?.()
    onClose()
  }

  if (!task) return null

  const overdue  = isOverdue(task.due_date)
  const dueToday = isDueToday(task.due_date)

  const inputCls = "w-full bg-th-raised border border-th-border rounded-lg px-3 py-2 text-xs text-th-text1 focus:outline-none focus:border-brand-500 transition-colors"

  return (
    <div className={panel
      ? "relative w-[420px] shrink-0 bg-th-surface border-l border-th-border flex flex-col overflow-hidden"
      : "fixed inset-x-0 bottom-0 top-14 z-[150] w-full bg-th-surface flex flex-col overflow-hidden shadow-2xl"
    }>
      {/* Header */}
      <div className="flex items-center justify-between px-4 border-b border-th-border shrink-0" style={{ minHeight: 52 }}>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: projectColor }} />
          <span className="text-xs text-th-text4 font-medium">Task Detail</span>
        </div>
        <button
          onClick={onClose}
          className="flex items-center gap-1.5 text-brand-400 font-semibold active:opacity-60 transition-opacity"
          style={{ minHeight: 44, minWidth: 44, justifyContent: 'flex-end' }}
        >
          <span className="text-sm">Close</span>
          <X size={18} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Title */}
        <div className="px-5 py-4 border-b border-th-border">
          <div className="flex items-start gap-2.5">
            <IconPicker value={task.icon || ''} onChange={icon => updateField('icon', icon)} />
            <div className="flex-1 min-w-0">
              {editTitle ? (
                <div className="flex gap-2">
                  <input autoFocus className="flex-1 bg-th-raised border border-brand-500 rounded-lg px-3 py-2 text-sm text-th-text1 focus:outline-none"
                    value={titleVal} onChange={e => setTitleVal(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') handleTitleSave(); if (e.key === 'Escape') setEditTitle(false) }} />
                  <button onClick={handleTitleSave} className="p-2 bg-brand-500 text-white rounded-lg hover:bg-brand-600"><Check size={14} /></button>
                </div>
              ) : (
                <div className="flex items-start gap-2 group cursor-pointer" onClick={() => setEditTitle(true)}>
                  <h2 className="text-base font-semibold text-th-text1 flex-1 leading-snug">{task.title}</h2>
                  <Pencil size={14} className="text-th-text5 group-hover:text-th-text3 transition-colors mt-0.5 shrink-0" />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Meta */}
        <div className="px-5 py-4 border-b border-th-border space-y-3">
          <div className="flex items-center gap-3">
            <span className="text-xs text-th-text4 w-20 shrink-0">Status</span>
            <select className={`text-xs font-medium px-3 py-1.5 rounded-lg border-0 focus:outline-none cursor-pointer ${STATUS_STYLE[task.status]}`}
              value={task.status} onChange={e => updateField('status', e.target.value)}>
              {STATUS_OPTIONS.map(s => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-th-text4 w-20 shrink-0">Priority</span>
            <select className={`text-xs font-medium px-3 py-1.5 rounded-lg border-0 focus:outline-none cursor-pointer ${PRIORITY_STYLE[task.priority]}`}
              value={task.priority} onChange={e => updateField('priority', e.target.value)}>
              {PRIORITY_OPTIONS.map(p => <option key={p} value={p}>{PRIORITY_LABEL[p]}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-th-text4 w-20 shrink-0">Start Date</span>
            <div className="flex items-center gap-2">
              <input type="date" className="bg-th-raised border border-th-border rounded-lg px-2.5 py-1.5 text-xs text-th-text2 focus:outline-none focus:border-brand-500"
                value={task.start_date || ''} onChange={e => updateField('start_date', e.target.value || null)} />
              <input type="time" className="bg-th-raised border border-th-border rounded-lg px-2.5 py-1.5 text-xs text-th-text2 focus:outline-none focus:border-brand-500"
                value={task.start_time || ''} onChange={e => updateField('start_time', e.target.value || null)}
                title="Start time of day" />
            </div>
          </div>
          <div className="flex items-start gap-3">
            <span className="text-xs text-th-text4 w-20 shrink-0 pt-1.5">Due Date</span>
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <input type="date" className="bg-th-raised border border-th-border rounded-lg px-2.5 py-1.5 text-xs text-th-text2 focus:outline-none focus:border-brand-500"
                  value={task.due_date || ''} onChange={e => updateField('due_date', e.target.value || null)} />
                <input type="time" className="bg-th-raised border border-th-border rounded-lg px-2.5 py-1.5 text-xs text-th-text2 focus:outline-none focus:border-brand-500"
                  value={task.due_time || ''} onChange={e => updateField('due_time', e.target.value || null)} />
              </div>
              {overdue  && <span className="flex items-center gap-1 text-xs text-red-400"><AlertCircle size={12} />Overdue</span>}
              {dueToday && !overdue && <span className="text-xs text-yellow-400">Today</span>}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-th-text4 w-20 shrink-0">Notify</span>
            <div className="flex items-center gap-1.5">
              <input type="number" min="1" max="120"
                className="w-16 bg-th-raised border border-th-border rounded-lg px-2.5 py-1.5 text-xs text-th-text2 focus:outline-none focus:border-brand-500"
                value={task.notify_before ?? 10}
                onChange={e => updateField('notify_before', parseInt(e.target.value) || 10)} />
              <span className="text-xs text-th-text4">min before deadline</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-th-text4 w-20 shrink-0">Recurrence</span>
            <select className="bg-th-raised border border-th-border rounded-lg px-2.5 py-1.5 text-xs text-th-text2 focus:outline-none focus:border-brand-500"
              value={task.recurrence || 'none'} onChange={e => updateField('recurrence', e.target.value)}>
              {RECURRENCE_OPTIONS.map(r => <option key={r} value={r}>{RECURRENCE_LABEL[r]}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-th-text4 w-20 shrink-0">Estimate</span>
            <div className="flex items-center gap-2 flex-1 min-w-0">
              {/* Hours field */}
              <div className="flex items-center gap-1">
                <input
                  type="number" min="0" max="999" step="1" placeholder="0"
                  className="w-12 bg-th-raised border border-th-border rounded-lg px-2 py-1.5 text-xs text-th-text2 text-center focus:outline-none focus:border-brand-500"
                  value={estH}
                  onChange={e => setEstH(e.target.value)}
                  onBlur={() => {
                    const secs = ((parseInt(estH) || 0) * 3600) + ((parseInt(estM) || 0) * 60)
                    updateField('estimate', secs)
                  }}
                />
                <span className="text-xs text-th-text5">h</span>
              </div>
              {/* Minutes field */}
              <div className="flex items-center gap-1">
                <input
                  type="number" min="0" max="59" step="5" placeholder="0"
                  className="w-12 bg-th-raised border border-th-border rounded-lg px-2 py-1.5 text-xs text-th-text2 text-center focus:outline-none focus:border-brand-500"
                  value={estM}
                  onChange={e => setEstM(e.target.value)}
                  onBlur={() => {
                    const clampedM = Math.min(59, parseInt(estM) || 0)
                    setEstM(clampedM > 0 ? String(clampedM) : '')
                    const secs = ((parseInt(estH) || 0) * 3600) + (clampedM * 60)
                    updateField('estimate', secs)
                  }}
                />
                <span className="text-xs text-th-text5">m</span>
              </div>
              {/* Progress bar when both estimate and logged time exist */}
              {task.estimate > 0 && task.total_time > 0 && (
                <div className="flex items-center gap-1.5 flex-1 min-w-0">
                  <div className="flex-1 h-1.5 bg-th-raised rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all ${task.total_time > task.estimate ? 'bg-red-400' : 'bg-brand-500'}`}
                      style={{ width: `${Math.min(task.total_time / task.estimate * 100, 100)}%` }} />
                  </div>
                  <span className="text-xs text-th-text5 shrink-0">
                    {Math.round(task.total_time / task.estimate * 100)}%
                  </span>
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-th-text4 w-20 shrink-0">Total Time</span>
            <span className="text-xs font-medium text-th-text2">{formatDuration(task.total_time || 0)}</span>
          </div>
          <div className="flex items-start gap-3">
            <span className="text-xs text-th-text4 w-20 shrink-0 pt-0.5">Tags</span>
            <TagPicker taskId={taskId} />
          </div>
        </div>

        {/* Description */}
        <div className="px-5 py-4 border-b border-th-border">
          <p className="text-xs font-semibold text-th-text4 uppercase tracking-wider mb-2">Description</p>
          {editDesc ? (
            <div className="space-y-2">
              <textarea autoFocus rows={4} className="w-full bg-th-raised border border-brand-500 rounded-lg px-3 py-2.5 text-sm text-th-text1 focus:outline-none resize-none"
                value={descVal} onChange={e => setDescVal(e.target.value)} />
              <div className="flex gap-2">
                <button onClick={handleDescSave} className="px-3 py-1.5 bg-brand-500 text-white text-xs rounded-lg hover:bg-brand-600">Save</button>
                <button onClick={() => setEditDesc(false)} className="px-3 py-1.5 bg-th-raised text-th-text2 text-xs rounded-lg hover:bg-th-raised/70">Cancel</button>
              </div>
            </div>
          ) : (
            <div onClick={() => setEditDesc(true)} className="group cursor-pointer">
              {task.description
                ? <p className="text-sm text-th-text2 whitespace-pre-wrap leading-relaxed group-hover:text-th-text1 transition-colors">{task.description}</p>
                : <p className="text-sm text-th-text5 italic group-hover:text-th-text4 transition-colors">Click to add description...</p>}
            </div>
          )}
        </div>

        {/* Subtasks */}
        <div className="px-5 py-4 border-b border-th-border">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold text-th-text4 uppercase tracking-wider">Subtasks</p>
            {subtasks.length > 0 && (
              <span className="text-xs text-th-text5">
                {subtasks.filter(s => s.done).length}/{subtasks.length}
              </span>
            )}
          </div>

          {subtasks.length > 0 && (
            <div className="mb-3 space-y-1.5">
              {subtasks.map(st => (
                <div key={st.id} className="flex items-center gap-2 group">
                  <button type="button" onClick={() => handleToggleSubtask(st.id)}
                    className={`w-4 h-4 rounded border shrink-0 flex items-center justify-center transition-colors ${
                      st.done ? 'bg-brand-500 border-brand-500' : 'border-th-border hover:border-brand-500'
                    }`}>
                    {st.done ? <Check size={10} className="text-white" strokeWidth={3} /> : null}
                  </button>

                  {editingSubtask === st.id ? (
                    <input autoFocus value={editSubtaskVal}
                      onChange={e => setEditSubtaskVal(e.target.value)}
                      onBlur={() => handleEditSubtask(st.id)}
                      onKeyDown={e => { if (e.key === 'Enter') handleEditSubtask(st.id); if (e.key === 'Escape') setEditingSubtask(null) }}
                      className="flex-1 bg-th-raised border border-brand-500 rounded px-2 py-0.5 text-xs text-th-text1 focus:outline-none" />
                  ) : (
                    <span
                      onClick={() => { setEditingSubtask(st.id); setEditSubtaskVal(st.title) }}
                      className={`flex-1 text-sm cursor-text ${st.done ? 'line-through text-th-text5' : 'text-th-text2 hover:text-th-text1'} transition-colors`}
                    >{st.title}</span>
                  )}

                  {/* Estimate badge */}
                  {st.estimate > 0 && (
                    <span className="text-xs text-th-text5 font-mono shrink-0">
                      {fmtMins(st.estimate)}
                    </span>
                  )}

                  {/* Quick estimate editor (hours + minutes) on hover */}
                  <SubtaskEstimate
                    subtask={st}
                    onSave={async mins => { await window.api.updateSubtask(st.id, st.title, mins); loadAll() }}
                  />

                  <button type="button" onClick={() => handleDeleteSubtask(st.id)}
                    className="opacity-0 group-hover:opacity-100 text-th-text5 hover:text-red-400 transition-all">
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
              {/* Total estimate */}
              {subtasks.some(s => s.estimate > 0) && (
                <div className="flex justify-end pt-1 border-t border-th-border/40">
                  <span className="text-xs text-th-text4">
                    Total estimate: {fmtMins(subtasks.reduce((s, st) => s + (st.estimate || 0), 0))}
                  </span>
                </div>
              )}
            </div>
          )}

          <form onSubmit={handleAddSubtask} className="flex items-center gap-2">
            <input value={newSubtask} onChange={e => setNewSubtask(e.target.value)}
              placeholder="Add a subtask…"
              className="flex-1 bg-th-raised/50 border border-th-border rounded-lg px-3 py-1.5 text-xs text-th-text1 placeholder-th-text5 focus:outline-none focus:border-brand-500 transition-colors" />
            <button type="submit" disabled={!newSubtask.trim()}
              className="px-3 py-1.5 bg-brand-500/20 text-brand-400 hover:bg-brand-500/30 rounded-lg text-xs font-medium transition-colors disabled:opacity-40">
              Add
            </button>
          </form>
        </div>

        {/* Timer */}
        <div className="px-5 py-4 border-b border-th-border">
          <p className="text-xs font-semibold text-th-text4 uppercase tracking-wider mb-3">Time Tracker</p>
          <div className="flex items-center gap-3 mb-3 flex-wrap">
            <button onClick={handleTimerToggle}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isRunning ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30' : 'bg-brand-500/20 text-brand-400 hover:bg-brand-500/30'
              }`}>
              {isRunning ? <Square size={14} fill="currentColor" /> : <Play size={14} fill="currentColor" />}
              {isRunning ? 'Stop Timer' : 'Start Timer'}
            </button>
            <button onClick={handlePomodoro}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium bg-th-raised text-th-text3 hover:bg-brand-500/20 hover:text-brand-400 transition-colors"
              title="Start Pomodoro session">
              <Timer size={14} /> Pomodoro
            </button>
            {isRunning && <span className="text-sm font-mono font-semibold text-green-400 tabular-nums">{formatDurationLong(timerSeconds)}</span>}
          </div>
          <button onClick={() => setShowManualEntry(v => !v)} className="text-xs text-th-text4 hover:text-th-text2 transition-colors flex items-center gap-1.5">
            <Plus size={12} />Add manual entry
          </button>
          {showManualEntry && (
            <form onSubmit={handleManualEntry} className="mt-3 p-3 bg-th-raised/50 rounded-lg space-y-2.5">
              {/* Date */}
              <input type="date" className={inputCls} value={manualEntry.date}
                onChange={e => setManualEntry(m => ({ ...m, date: e.target.value }))} required />

              {/* Duration — h / m inputs like estimate */}
              <div>
                <p className="text-xs text-th-text5 mb-1">Duration</p>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1 flex-1">
                    <input
                      type="number" min="0" max="23" placeholder="0"
                      className={`${inputCls} text-center`}
                      value={manualEntry.hours}
                      onChange={e => setManualEntry(m => ({ ...m, hours: e.target.value }))}
                    />
                    <span className="text-xs text-th-text4 shrink-0">h</span>
                  </div>
                  <div className="flex items-center gap-1 flex-1">
                    <input
                      type="number" min="0" max="59" placeholder="0"
                      className={`${inputCls} text-center`}
                      value={manualEntry.minutes}
                      onChange={e => setManualEntry(m => ({ ...m, minutes: e.target.value }))}
                    />
                    <span className="text-xs text-th-text4 shrink-0">m</span>
                  </div>
                </div>
              </div>

              {/* Optional start-time anchor */}
              <button
                type="button"
                onClick={() => setShowManualStartTime(v => !v)}
                className="text-xs text-th-text5 hover:text-th-text3 transition-colors flex items-center gap-1"
              >
                <span className={`transition-transform duration-150 ${showManualStartTime ? 'rotate-90' : ''}`}>▶</span>
                {showManualStartTime ? 'Hide start time' : 'Specify start time (optional — for day timeline)'}
              </button>

              {showManualStartTime && (
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <div className="flex-1">
                      <p className="text-xs text-th-text5 mb-1">Start</p>
                      <input type="time" className={inputCls} value={manualEntry.startTime}
                        onChange={e => setManualEntry(m => ({ ...m, startTime: e.target.value }))} />
                    </div>
                    {manualEntry.startTime && (parseInt(manualEntry.hours) || parseInt(manualEntry.minutes)) && (
                      <div className="flex-1">
                        <p className="text-xs text-th-text5 mb-1">End (auto)</p>
                        <div className={`${inputCls} text-th-text4 cursor-default`}>
                          {(() => {
                            const h = parseInt(manualEntry.hours) || 0
                            const m = parseInt(manualEntry.minutes) || 0
                            const end = new Date(`2000-01-01T${manualEntry.startTime}:00`)
                            end.setSeconds(end.getSeconds() + h * 3600 + m * 60)
                            return end.toTimeString().slice(0, 5)
                          })()}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <input placeholder="Notes (optional)" className={inputCls} value={manualEntry.notes}
                onChange={e => setManualEntry(m => ({ ...m, notes: e.target.value }))} />
              <div className="flex gap-2">
                <button type="submit"
                  disabled={!manualEntry.date || (!(parseInt(manualEntry.hours) || 0) && !(parseInt(manualEntry.minutes) || 0))}
                  className="flex-1 px-3 py-2 bg-brand-500 text-white text-xs rounded-lg hover:bg-brand-600 disabled:opacity-40">
                  Log Time
                </button>
                <button type="button" onClick={() => { setShowManualEntry(false); setShowManualStartTime(false) }}
                  className="flex-1 px-3 py-2 bg-th-raised text-th-text3 text-xs rounded-lg hover:bg-th-raised/70">
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Time entries */}
        {timeEntries.length > 0 && (
          <div className="px-5 py-4 border-b border-th-border">
            <p className="text-xs font-semibold text-th-text4 uppercase tracking-wider mb-3">Time Entries ({timeEntries.length})</p>
            <div className="space-y-2">
              {timeEntries.map(entry => (
                <div key={entry.id} className="flex items-center gap-2 group">
                  <div className="flex-1 min-w-0 bg-th-raised/50 rounded-lg px-3 py-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-th-text2">{formatDuration(entry.duration)}</span>
                      <span className="text-xs text-th-text5">{formatDateTime(entry.start_time)}</span>
                    </div>
                    {entry.notes && <p className="text-xs text-th-text4 mt-0.5 truncate">{entry.notes}</p>}
                  </div>
                  <button onClick={() => handleDeleteEntry(entry)} className="p-1 text-th-text5 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100">
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Comments */}
        <div className="px-5 py-4">
          <p className="text-xs font-semibold text-th-text4 uppercase tracking-wider mb-3">Comments ({comments.length})</p>
          <div className="space-y-3 mb-4">
            {comments.map(comment => (
              <div key={comment.id} className="group">
                {editingComment === comment.id ? (
                  <div className="space-y-2">
                    <textarea autoFocus rows={2} className="w-full bg-th-raised border border-brand-500 rounded-lg px-3 py-2 text-sm text-th-text1 focus:outline-none resize-none"
                      value={editCommentVal} onChange={e => setEditCommentVal(e.target.value)} />
                    <div className="flex gap-2">
                      <button onClick={() => handleEditComment(comment.id)} className="px-3 py-1.5 bg-brand-500 text-white text-xs rounded-lg hover:bg-brand-600">Save</button>
                      <button onClick={() => setEditingComment(null)} className="px-3 py-1.5 bg-th-raised text-th-text3 text-xs rounded-lg">Cancel</button>
                    </div>
                  </div>
                ) : (
                  <div className="bg-th-raised/50 rounded-lg px-3 py-2.5">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs text-th-text4">{formatDateTime(comment.created_at)}</span>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => { setEditingComment(comment.id); setEditCommentVal(comment.content) }} className="p-1 text-th-text5 hover:text-th-text2 rounded"><Pencil size={12} /></button>
                        <button onClick={() => handleDeleteComment(comment.id)} className="p-1 text-th-text5 hover:text-red-400 rounded"><Trash2 size={12} /></button>
                      </div>
                    </div>
                    <p className="text-sm text-th-text2 whitespace-pre-wrap leading-relaxed">{comment.content}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
          <form onSubmit={handleAddComment} className="flex gap-2">
            <input
              className="flex-1 bg-th-raised border border-th-border rounded-lg px-3 py-2.5 text-sm text-th-text1 placeholder-th-text5 focus:outline-none focus:border-brand-500 transition-colors"
              placeholder="Add a comment..." value={newComment} onChange={e => setNewComment(e.target.value)} />
            <button type="submit" disabled={!newComment.trim()} className="p-2.5 bg-brand-500 text-white rounded-lg hover:bg-brand-600 disabled:opacity-40 transition-colors">
              <Send size={14} />
            </button>
          </form>
        </div>
      </div>

      {/* Delete footer */}
      <div className="shrink-0 border-t border-th-border px-5 py-3">
        {!showDeleteConfirm ? (
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="flex items-center gap-2 text-xs text-th-text5 hover:text-red-400 transition-colors"
          >
            <Trash2 size={13} />
            Delete task
          </button>
        ) : (
          <div className="space-y-2.5">
            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-red-500/10 border border-red-500/20">
              <AlertCircle size={14} className="text-red-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-medium text-red-400">Delete "{task.title}"?</p>
                {timeEntries.length > 0 ? (
                  <p className="text-xs text-th-text4 mt-0.5">
                    This task has <span className="text-red-400 font-medium">{timeEntries.length} time {timeEntries.length === 1 ? 'entry' : 'entries'}</span> ({formatDuration(task.total_time || 0)} logged). All history will be permanently lost.
                  </p>
                ) : (
                  <p className="text-xs text-th-text4 mt-0.5">This is permanent and cannot be undone.</p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleDeleteTask}
                disabled={deleting}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500 hover:bg-red-600 text-white text-xs font-medium transition-colors disabled:opacity-60"
              >
                <Trash2 size={12} />
                {deleting ? 'Deleting…' : 'Yes, delete'}
              </button>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-3 py-1.5 rounded-lg bg-th-raised text-th-text3 hover:text-th-text1 text-xs transition-colors border border-th-border"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
