import { useState, useEffect, useRef } from 'react'
import { Zap, X } from 'lucide-react'

export default function QuickCaptureModal({ open, onClose }) {
  const [title, setTitle] = useState('')
  const [saving, setSaving] = useState(false)
  const [flash, setFlash] = useState(false)
  const inputRef = useRef(null)

  useEffect(() => {
    if (open) {
      setTitle('')
      setSaving(false)
      setFlash(false)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [open])

  async function capture() {
    const t = title.trim()
    if (!t) return
    setSaving(true)
    try {
      // Find inbox project
      const projects = await window.api.getProjects()
      const inbox = projects?.find(p => p.is_inbox)
      if (!inbox) { setSaving(false); return }
      await window.api.createTask({ project_id: inbox.id, title: t, status: 'todo', priority: 'medium' })
      setFlash(true)
      setTimeout(() => {
        setFlash(false)
        setTitle('')
        setSaving(false)
        onClose()
      }, 600)
    } catch {
      setSaving(false)
    }
  }

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-end sm:items-start justify-center sm:pt-[22vh]"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      {/* Dim overlay */}
      <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm" />

      <div className={`relative w-full sm:max-w-xl sm:mx-4 glass-card card-shadow rounded-t-2xl sm:rounded-2xl overflow-hidden border transition-all duration-200 ${flash ? 'border-emerald-500/60 shadow-emerald-500/20' : 'border-white/10'}`}>
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-3.5 border-b border-white/5">
          <div className="w-7 h-7 rounded-lg bg-indigo-500/20 flex items-center justify-center">
            <Zap size={14} className="text-indigo-400" />
          </div>
          <span className="text-sm font-medium text-slate-300">Quick Capture</span>
          <span className="ml-auto text-xs text-slate-600">→ Inbox</span>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-white/5 text-slate-600 hover:text-slate-400 transition-colors">
            <X size={14} />
          </button>
        </div>

        {/* Input */}
        <div className="px-5 py-4">
          <input
            ref={inputRef}
            value={title}
            onChange={e => setTitle(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') capture()
              if (e.key === 'Escape') onClose()
            }}
            placeholder="What's on your mind? Capture it instantly…"
            className="w-full bg-transparent text-white text-base placeholder:text-slate-600 focus:outline-none"
          />
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-white/5">
          <span className="text-xs text-slate-600">Sent to Inbox · process later</span>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-3 py-1.5 text-xs rounded-lg text-slate-500 hover:text-slate-300 hover:bg-white/5 transition-colors"
            >
              Esc
            </button>
            <button
              onClick={capture}
              disabled={saving || !title.trim()}
              className={`px-4 py-1.5 text-xs rounded-lg font-medium transition-all ${
                flash
                  ? 'bg-emerald-500 text-white'
                  : title.trim()
                  ? 'bg-indigo-600 hover:bg-indigo-500 text-white'
                  : 'bg-white/5 text-slate-600 cursor-not-allowed'
              }`}
            >
              {flash ? '✓ Captured!' : saving ? 'Saving…' : 'Capture ↵'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
