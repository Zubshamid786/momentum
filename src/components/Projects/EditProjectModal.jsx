import React, { useState, useEffect } from 'react'
import Modal from '../UI/Modal'

const COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#ef4444',
  '#f97316', '#eab308', '#22c55e', '#14b8a6',
  '#06b6d4', '#3b82f6', '#64748b', '#a855f7',
]

export default function EditProjectModal({ isOpen, project, onClose, onUpdated }) {
  const [form, setForm] = useState({ name: '', description: '', color: '#6366f1' })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (project) setForm({ name: project.name, description: project.description || '', color: project.color })
  }, [project])

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.name.trim()) return
    setSaving(true)
    await window.api.updateProject(project.id, form)
    setSaving(false)
    onUpdated()
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Edit Project">
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-th-text2 mb-1.5">Name *</label>
          <input
            autoFocus
            className="w-full bg-th-raised/50 border border-th-border rounded-lg px-3 py-2.5 text-sm text-th-text1 placeholder-th-text4 focus:outline-none focus:border-brand-500 transition-colors"
            value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-th-text2 mb-1.5">Description</label>
          <textarea
            rows={3}
            className="w-full bg-th-raised/50 border border-th-border rounded-lg px-3 py-2.5 text-sm text-th-text1 placeholder-th-text4 focus:outline-none focus:border-brand-500 transition-colors resize-none"
            value={form.description}
            onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-th-text2 mb-2">Color</label>
          <div className="flex flex-wrap gap-2">
            {COLORS.map(color => (
              <button key={color} type="button" onClick={() => setForm(f => ({ ...f, color }))}
                className={`w-7 h-7 rounded-full transition-transform hover:scale-110 ${form.color === color ? 'ring-2 ring-brand-500 ring-offset-2 ring-offset-th-surface' : ''}`}
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
        </div>
        <div className="flex gap-3 pt-2">
          <button type="button" onClick={onClose} className="flex-1 px-4 py-2.5 rounded-lg text-sm font-medium text-th-text3 bg-th-raised hover:bg-th-raised/70 transition-colors">Cancel</button>
          <button type="submit" disabled={!form.name.trim() || saving} className="flex-1 px-4 py-2.5 rounded-lg text-sm font-medium text-white bg-brand-500 hover:bg-brand-600 disabled:opacity-50 transition-colors">
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
