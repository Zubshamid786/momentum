import React, { useState, useEffect } from 'react'
import Modal from '../UI/Modal'
import { BookTemplate, Trash2, ChevronDown, ChevronUp } from 'lucide-react'

const COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#ef4444',
  '#f97316', '#eab308', '#22c55e', '#14b8a6',
  '#06b6d4', '#3b82f6', '#64748b', '#a855f7',
]

export default function CreateProjectModal({ isOpen, onClose, onCreated }) {
  const [form, setForm]         = useState({ name: '', description: '', color: '#6366f1', status: 'active' })
  const [saving, setSaving]     = useState(false)
  const [templates, setTemplates] = useState([])
  const [showTemplates, setShowTemplates] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState(null)

  useEffect(() => {
    if (isOpen) window.api.getTemplates().then(t => setTemplates(t || []))
  }, [isOpen])

  function reset() {
    setForm({ name: '', description: '', color: '#6366f1', status: 'active' })
    setSelectedTemplate(null)
    setShowTemplates(false)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.name.trim()) return
    setSaving(true)
    if (selectedTemplate) {
      await window.api.createFromTemplate(selectedTemplate.id, {
        name: form.name.trim(),
        description: form.description,
        color: form.color,
      })
    } else {
      await window.api.createProject(form)
    }
    setSaving(false)
    reset()
    onCreated()
  }

  async function deleteTemplate(id, e) {
    e.stopPropagation()
    await window.api.deleteTemplate(id)
    setTemplates(prev => prev.filter(t => t.id !== id))
    if (selectedTemplate?.id === id) setSelectedTemplate(null)
  }

  function handleClose() { reset(); onClose() }

  const inputCls = "w-full bg-th-raised/50 border border-th-border rounded-lg px-3 py-2.5 text-sm text-th-text1 placeholder-th-text4 focus:outline-none focus:border-brand-500 transition-colors"

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="New Project">
      <form onSubmit={handleSubmit} className="space-y-5">

        {/* Template picker */}
        {templates.length > 0 && (
          <div>
            <button
              type="button"
              onClick={() => setShowTemplates(v => !v)}
              className="flex items-center gap-2 text-sm text-th-text3 hover:text-th-text1 transition-colors"
            >
              <BookTemplate size={15} className="text-brand-400" />
              <span>{selectedTemplate ? `Template: ${selectedTemplate.name}` : 'Start from a template'}</span>
              {showTemplates ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>

            {showTemplates && (
              <div className="mt-2 space-y-1.5 border border-th-border rounded-xl p-2 bg-th-raised/30">
                <button
                  type="button"
                  onClick={() => { setSelectedTemplate(null); setShowTemplates(false) }}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                    !selectedTemplate ? 'bg-brand-500/15 text-brand-400' : 'text-th-text3 hover:bg-th-raised'
                  }`}
                >
                  Blank project
                </button>
                {templates.map(t => {
                  const struct = JSON.parse(t.structure)
                  return (
                    <div key={t.id} className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-colors group ${
                      selectedTemplate?.id === t.id ? 'bg-brand-500/15' : 'hover:bg-th-raised'
                    }`} onClick={() => { setSelectedTemplate(t); setShowTemplates(false) }}>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium truncate ${selectedTemplate?.id === t.id ? 'text-brand-400' : 'text-th-text2'}`}>{t.name}</p>
                        <p className="text-xs text-th-text5">{struct.tasks?.length || 0} tasks</p>
                      </div>
                      <button
                        type="button"
                        onClick={e => deleteTemplate(t.id, e)}
                        className="opacity-0 group-hover:opacity-100 p-1 rounded text-th-text5 hover:text-red-400 transition-all"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-th-text2 mb-1.5">Name *</label>
          <input
            autoFocus
            className={inputCls}
            placeholder="e.g. Website Redesign"
            value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-th-text2 mb-1.5">Description</label>
          <textarea
            rows={3}
            className={`${inputCls} resize-none`}
            placeholder="What is this project about?"
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
          <button type="button" onClick={handleClose} className="flex-1 px-4 py-2.5 rounded-lg text-sm font-medium text-th-text3 bg-th-raised hover:bg-th-raised/70 transition-colors">Cancel</button>
          <button type="submit" disabled={!form.name.trim() || saving} className="flex-1 px-4 py-2.5 rounded-lg text-sm font-medium text-white bg-brand-500 hover:bg-brand-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
            {saving ? 'Creating...' : selectedTemplate ? 'Create from Template' : 'Create Project'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
