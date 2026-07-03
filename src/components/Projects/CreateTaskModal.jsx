import React, { useState } from 'react'
import Modal from '../UI/Modal'
import { ICON_CATEGORIES } from '../../constants/taskIcons'

const STATUSES  = ['todo', 'in_progress', 'done', 'blocked']
const PRIORITIES = ['low', 'medium', 'high', 'urgent']
const RECURRENCES = ['none', 'daily', 'weekly', 'monthly']
const STATUS_LABEL    = { todo: 'To Do', in_progress: 'In Progress', done: 'Done', blocked: 'Blocked' }
const PRIORITY_LABEL  = { low: 'Low', medium: 'Medium', high: 'High', urgent: 'Urgent' }
const RECURRENCE_LABEL = { none: 'None', daily: 'Daily', weekly: 'Weekly', monthly: 'Monthly' }

const EMPTY = { title: '', description: '', status: 'todo', priority: 'medium', icon: '', start_date: '', start_time: '', due_date: '', due_time: '', recurrence: 'none', notify_before: 10, estimateH: '', estimateM: '' }

function IconPicker({ value, onChange }) {
  const [open, setOpen] = useState(false)
  const [tab, setTab]   = useState(0)
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="w-10 h-10 flex items-center justify-center rounded-lg border border-th-border bg-th-raised/50 text-xl hover:border-brand-500 transition-colors"
        title="Pick icon"
      >
        {value || <span className="text-th-text5 text-sm">+</span>}
      </button>
      {open && (
        <div className="absolute top-12 left-0 z-50 bg-th-surface border border-th-border rounded-xl shadow-xl w-72" style={{ maxHeight: 320 }}>
          {/* Category tabs */}
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
          {/* Icon grid */}
          <div className="p-2 grid grid-cols-8 gap-1 overflow-y-auto" style={{ maxHeight: 220 }}>
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

export default function CreateTaskModal({ isOpen, onClose, projectId, initialStatus = 'todo', onCreated }) {
  const [form, setForm]   = useState({ ...EMPTY, status: initialStatus })
  const [saving, setSaving] = useState(false)

  function reset() { setForm({ ...EMPTY, status: initialStatus }) }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.title.trim()) return
    setSaving(true)
    await window.api.createTask({
      project_id: projectId,
      title: form.title.trim(),
      description: form.description,
      status: form.status,
      priority: form.priority,
      icon: form.icon || '',
      start_date: form.start_date || null,
      start_time: form.start_time || null,
      due_date: form.due_date || null,
      due_time: form.due_time || null,
      recurrence: form.recurrence,
      notify_before: parseInt(form.notify_before) || 10,
      estimate: ((parseInt(form.estimateH) || 0) * 3600) + ((parseInt(form.estimateM) || 0) * 60),
    })
    setSaving(false)
    reset()
    onCreated()
  }

  function handleClose() { reset(); onClose() }

  const inputCls = "w-full bg-th-raised/50 border border-th-border rounded-lg px-3 py-2.5 text-sm text-th-text1 placeholder-th-text4 focus:outline-none focus:border-brand-500 transition-colors"

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="New Task">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-th-text2 mb-1.5">Title *</label>
          <div className="flex items-center gap-2">
            <IconPicker value={form.icon} onChange={icon => setForm(f => ({ ...f, icon }))} />
            <input autoFocus className={`${inputCls} flex-1`} placeholder="e.g. Design homepage mockup"
              value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-th-text2 mb-1.5">Description</label>
          <textarea rows={3} className={`${inputCls} resize-none`} placeholder="Optional details..."
            value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-th-text2 mb-1.5">Status</label>
            <select className={inputCls} value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
              {STATUSES.map(s => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-th-text2 mb-1.5">Priority</label>
            <select className={inputCls} value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}>
              {PRIORITIES.map(p => <option key={p} value={p}>{PRIORITY_LABEL[p]}</option>)}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-th-text2 mb-1.5">Start Date</label>
            <input type="date" className={inputCls} value={form.start_date}
              onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} />
          </div>
          <div>
            <label className="block text-sm font-medium text-th-text2 mb-1.5">Start Time</label>
            <input type="time" className={inputCls} value={form.start_time}
              onChange={e => setForm(f => ({ ...f, start_time: e.target.value }))} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-th-text2 mb-1.5">Due Date</label>
            <input type="date" className={inputCls} value={form.due_date}
              onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))} />
          </div>
          <div>
            <label className="block text-sm font-medium text-th-text2 mb-1.5">Due Time</label>
            <input type="time" className={inputCls} value={form.due_time}
              onChange={e => setForm(f => ({ ...f, due_time: e.target.value }))} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-th-text2 mb-1.5">Estimate</label>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 flex-1">
                <input
                  type="number" min="0" max="999" step="1" placeholder="0"
                  className={`${inputCls} text-center`}
                  value={form.estimateH}
                  onChange={e => setForm(f => ({ ...f, estimateH: e.target.value }))}
                />
                <span className="text-xs text-th-text4 shrink-0">h</span>
              </div>
              <div className="flex items-center gap-1.5 flex-1">
                <input
                  type="number" min="0" max="59" step="5" placeholder="0"
                  className={`${inputCls} text-center`}
                  value={form.estimateM}
                  onChange={e => setForm(f => ({ ...f, estimateM: Math.min(59, parseInt(e.target.value) || 0) || '' }))}
                />
                <span className="text-xs text-th-text4 shrink-0">m</span>
              </div>
            </div>
          </div>
          <div /></div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-th-text2 mb-1.5">Recurrence</label>
            <select className={inputCls} value={form.recurrence}
              onChange={e => setForm(f => ({ ...f, recurrence: e.target.value }))}>
              {RECURRENCES.map(r => <option key={r} value={r}>{RECURRENCE_LABEL[r]}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-th-text2 mb-1.5">Notify Before (min)</label>
            <input type="number" min="1" max="120" className={inputCls} value={form.notify_before}
              onChange={e => setForm(f => ({ ...f, notify_before: e.target.value }))} />
          </div>
        </div>
        <div className="flex gap-3 pt-2">
          <button type="button" onClick={handleClose}
            className="flex-1 px-4 py-2.5 rounded-lg text-sm font-medium text-th-text3 bg-th-raised hover:bg-th-raised/70 transition-colors">
            Cancel
          </button>
          <button type="submit" disabled={!form.title.trim() || saving}
            className="flex-1 px-4 py-2.5 rounded-lg text-sm font-medium text-white bg-brand-500 hover:bg-brand-600 disabled:opacity-50 transition-colors">
            {saving ? 'Creating...' : 'Create Task'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
