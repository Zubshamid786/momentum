import React, { useState, useEffect, useRef } from 'react'
import { Tag, Plus, X, Check } from 'lucide-react'

const TAG_COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#ef4444',
  '#f97316', '#eab308', '#22c55e', '#14b8a6',
  '#06b6d4', '#3b82f6', '#64748b', '#a855f7',
]

export default function TagPicker({ taskId, inline = false }) {
  const [tags, setTags]         = useState([])   // all tags
  const [taskTags, setTaskTags] = useState([])   // tag ids on this task
  const [open, setOpen]         = useState(false)
  const [newName, setNewName]   = useState('')
  const [newColor, setNewColor] = useState(TAG_COLORS[0])
  const [creating, setCreating] = useState(false)
  const ref = useRef(null)

  async function load() {
    const [all, task] = await Promise.all([
      window.api.getTags(),
      taskId ? window.api.getTaskTags(taskId) : Promise.resolve([]),
    ])
    setTags(all || [])
    setTaskTags((task || []).map(t => t.id))
  }

  useEffect(() => { load() }, [taskId])

  useEffect(() => {
    if (!open) return
    function onOutside(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', onOutside)
    return () => document.removeEventListener('mousedown', onOutside)
  }, [open])

  async function toggleTag(tagId) {
    if (!taskId) return
    const next = taskTags.includes(tagId)
      ? taskTags.filter(id => id !== tagId)
      : [...taskTags, tagId]
    setTaskTags(next)
    await window.api.setTaskTags(taskId, next)
  }

  async function createTag() {
    if (!newName.trim()) return
    await window.api.createTag({ name: newName.trim(), color: newColor })
    setNewName('')
    setCreating(false)
    load()
  }

  async function deleteTag(id, e) {
    e.stopPropagation()
    await window.api.deleteTag(id)
    load()
  }

  const activeTags = tags.filter(t => taskTags.includes(t.id))

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-1.5 text-xs text-th-text4 hover:text-th-text2 transition-colors"
        title="Manage tags"
      >
        <Tag size={13} />
        {activeTags.length === 0 ? (
          <span>Add tags</span>
        ) : (
          <div className="flex items-center gap-1 flex-wrap">
            {activeTags.map(t => (
              <span key={t.id} className="px-1.5 py-0.5 rounded-full text-xs font-medium"
                style={{ backgroundColor: t.color + '22', color: t.color }}>
                {t.name}
              </span>
            ))}
          </div>
        )}
      </button>

      {open && (
        <div className="absolute left-0 top-7 z-30 w-56 bg-th-surface border border-th-border rounded-xl shadow-xl py-1.5">
          <p className="px-3 pt-1 pb-2 text-xs font-semibold text-th-text5 uppercase tracking-wider">Tags</p>

          {tags.map(tag => {
            const active = taskTags.includes(tag.id)
            return (
              <div key={tag.id} className="flex items-center gap-2 px-3 py-1.5 hover:bg-th-raised group">
                <button
                  type="button"
                  onClick={() => toggleTag(tag.id)}
                  className="flex items-center gap-2 flex-1 text-left"
                >
                  <span className={`w-4 h-4 rounded flex items-center justify-center border transition-colors ${
                    active ? 'border-transparent' : 'border-th-border'
                  }`} style={active ? { backgroundColor: tag.color } : {}}>
                    {active && <Check size={10} className="text-white" strokeWidth={3} />}
                  </span>
                  <span className="text-sm text-th-text2">{tag.name}</span>
                  <span className="w-2 h-2 rounded-full ml-auto" style={{ backgroundColor: tag.color }} />
                </button>
                <button
                  type="button"
                  onClick={e => deleteTag(tag.id, e)}
                  className="opacity-0 group-hover:opacity-100 text-th-text5 hover:text-red-400 transition-all"
                >
                  <X size={12} />
                </button>
              </div>
            )
          })}

          {tags.length === 0 && !creating && (
            <p className="px-3 py-2 text-xs text-th-text5">No tags yet</p>
          )}

          <div className="border-t border-th-border/60 mt-1 pt-1">
            {creating ? (
              <div className="px-3 py-2 space-y-2">
                <input
                  autoFocus
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') createTag(); if (e.key === 'Escape') setCreating(false) }}
                  placeholder="Tag name..."
                  className="w-full bg-th-raised border border-th-border rounded-lg px-2 py-1.5 text-xs text-th-text1 placeholder-th-text5 focus:outline-none focus:border-brand-500"
                />
                <div className="flex flex-wrap gap-1">
                  {TAG_COLORS.map(c => (
                    <button key={c} type="button" onClick={() => setNewColor(c)}
                      className={`w-5 h-5 rounded-full transition-transform hover:scale-110 ${newColor === c ? 'ring-2 ring-white ring-offset-1 ring-offset-th-surface' : ''}`}
                      style={{ backgroundColor: c }} />
                  ))}
                </div>
                <div className="flex gap-1.5">
                  <button type="button" onClick={() => setCreating(false)}
                    className="flex-1 px-2 py-1 rounded text-xs text-th-text4 bg-th-raised hover:bg-th-card transition-colors">
                    Cancel
                  </button>
                  <button type="button" onClick={createTag} disabled={!newName.trim()}
                    className="flex-1 px-2 py-1 rounded text-xs text-white bg-brand-500 hover:bg-brand-600 disabled:opacity-50 transition-colors">
                    Create
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setCreating(true)}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs text-th-text4 hover:text-th-text2 hover:bg-th-raised transition-colors"
              >
                <Plus size={12} /> New tag
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
