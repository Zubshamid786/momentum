import React, { useEffect, useState, useCallback } from 'react'
import { Plus, Target, Pencil, Trash2, Trophy, X, Check } from 'lucide-react'
import { useApp } from '../../context/AppContext'

const LEAD_TYPES = [
  { value: 'hours', label: 'Hours logged per week' },
  { value: 'tasks', label: 'Tasks completed per week' },
]

const EMPTY_FORM = {
  title: '', project_id: '', target_date: '',
  lag_label: 'Tasks completed', lead_label: 'Hours logged',
  lead_target: 2, lead_type: 'hours',
}

function WigForm({ initial = EMPTY_FORM, projects, onSave, onCancel }) {
  const [form, setForm] = useState({ ...EMPTY_FORM, ...initial })
  const f = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const inputCls = "w-full bg-th-raised/50 border border-th-border rounded-lg px-3 py-2 text-sm text-th-text1 placeholder-th-text4 focus:outline-none focus:border-brand-500 transition-colors"
  const labelCls = "block text-xs font-medium text-th-text3 mb-1"

  return (
    <div className="glass-card card-shadow rounded-2xl p-5 space-y-4">
      <h3 className="text-sm font-bold text-th-text1 flex items-center gap-2">
        <Target size={14} className="text-brand-400" />
        {initial.id ? 'Edit Goal' : 'New Wildly Important Goal'}
      </h3>

      <div>
        <label className={labelCls}>Goal Statement *</label>
        <input className={inputCls} placeholder='e.g. "Complete Claude Crash Course by May 31"'
          value={form.title} onChange={e => f('title', e.target.value)} />
        <p className="text-xs text-th-text5 mt-1">Be specific. Write it as an outcome, not an activity.</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelCls}>Linked Project</label>
          <select className={inputCls} value={form.project_id} onChange={e => f('project_id', e.target.value)}>
            <option value="">No project</option>
            {projects.filter(p => p.status === 'active').map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          <p className="text-xs text-th-text5 mt-1">Links lead/lag measures automatically.</p>
        </div>
        <div>
          <label className={labelCls}>Target Date</label>
          <input type="date" className={inputCls} value={form.target_date} onChange={e => f('target_date', e.target.value)} />
        </div>
      </div>

      <div className="border-t border-th-border/40 pt-4">
        <p className="text-xs font-semibold text-th-text3 uppercase tracking-wider mb-3">Measures</p>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Lag Measure Label</label>
            <input className={inputCls} placeholder="e.g. Tasks completed"
              value={form.lag_label} onChange={e => f('lag_label', e.target.value)} />
            <p className="text-xs text-th-text5 mt-1">The result you're after (auto-tracked if project linked).</p>
          </div>
          <div>
            <label className={labelCls}>Lead Measure Type</label>
            <select className={inputCls} value={form.lead_type} onChange={e => f('lead_type', e.target.value)}>
              {LEAD_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4 mt-3">
          <div>
            <label className={labelCls}>Lead Measure Label</label>
            <input className={inputCls} placeholder="e.g. Hours logged"
              value={form.lead_label} onChange={e => f('lead_label', e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>Weekly Lead Target ({form.lead_type === 'hours' ? 'hours' : 'tasks'})</label>
            <input type="number" min="0.5" step={form.lead_type === 'hours' ? 0.5 : 1} className={inputCls}
              value={form.lead_target} onChange={e => f('lead_target', parseFloat(e.target.value) || 1)} />
          </div>
        </div>
      </div>

      <div className="flex gap-3 pt-1">
        <button onClick={onCancel}
          className="flex-1 px-4 py-2 rounded-lg text-sm text-th-text3 bg-th-raised hover:bg-th-raised/70 transition-colors">
          Cancel
        </button>
        <button disabled={!form.title.trim()} onClick={() => onSave(form)}
          className="flex-1 px-4 py-2 rounded-lg text-sm font-semibold text-white bg-brand-500 hover:bg-brand-600 disabled:opacity-50 transition-colors">
          {initial.id ? 'Update Goal' : 'Create Goal'}
        </button>
      </div>
    </div>
  )
}

export default function GoalsView() {
  const { state } = useApp()
  const { projects } = state
  const [wigs, setWigs]         = useState([])
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing]   = useState(null)

  const load = useCallback(() => {
    window.api.getWigs().then(w => setWigs(w || []))
  }, [])

  useEffect(() => { load() }, [load])

  async function handleCreate(form) {
    await window.api.createWig({
      title: form.title.trim(),
      project_id: form.project_id ? parseInt(form.project_id) : null,
      target_date: form.target_date || null,
      lag_label: form.lag_label,
      lead_label: form.lead_label,
      lead_target: parseFloat(form.lead_target),
      lead_type: form.lead_type,
    })
    load(); setShowForm(false)
  }

  async function handleUpdate(form) {
    await window.api.updateWig(editing.id, {
      title: form.title.trim(),
      project_id: form.project_id ? parseInt(form.project_id) : null,
      target_date: form.target_date || null,
      lag_label: form.lag_label,
      lead_label: form.lead_label,
      lead_target: parseFloat(form.lead_target),
      lead_type: form.lead_type,
    })
    load(); setEditing(null)
  }

  async function handleToggleStatus(wig) {
    await window.api.updateWig(wig.id, { status: wig.status === 'active' ? 'achieved' : 'active' })
    load()
  }

  async function handleDelete(id) {
    if (!confirm('Delete this goal?')) return
    await window.api.deleteWig(id)
    load()
  }

  const active   = wigs.filter(w => w.status === 'active')
  const achieved = wigs.filter(w => w.status === 'achieved')

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-4 md:space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-th-text1 flex items-center gap-2">
            <Target size={20} className="text-brand-400" /> Wildly Important Goals
          </h1>
          <p className="text-sm text-th-text4 mt-1">
            Define your WIGs, track lead & lag measures, and set weekly commitments — the 4DX method.
          </p>
        </div>
        {!showForm && !editing && (
          <button onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white rounded-lg text-sm font-medium transition-colors">
            <Plus size={15} /> New WIG
          </button>
        )}
      </div>

      {showForm && (
        <WigForm projects={projects || []} onSave={handleCreate} onCancel={() => setShowForm(false)} />
      )}

      {active.length === 0 && !showForm ? (
        <div className="flex flex-col items-center justify-center py-20 text-th-text5">
          <Target size={48} className="mb-4 opacity-30" />
          <p className="text-lg font-medium text-th-text3 mb-1">No active goals yet</p>
          <p className="text-sm mb-6">Define a WIG to start tracking what matters most.</p>
          <button onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-brand-500 hover:bg-brand-600 text-white rounded-lg text-sm font-medium transition-colors">
            <Plus size={15} /> Create your first WIG
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {active.map(wig => editing?.id === wig.id ? (
            <WigForm key={wig.id} initial={editing} projects={projects || []}
              onSave={handleUpdate} onCancel={() => setEditing(null)} />
          ) : (
            <div key={wig.id} className="glass-card card-shadow rounded-xl p-4 flex items-center gap-4 group">
              <div className="w-1 h-12 rounded-full shrink-0" style={{ backgroundColor: wig.project_color || '#6366f1' }} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-th-text1 truncate">{wig.title}</p>
                <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                  {wig.project_name && <span className="text-xs text-th-text5">{wig.project_name}</span>}
                  {wig.target_date && <span className="text-xs text-th-text4">Due {wig.target_date}</span>}
                  <span className="text-xs text-th-text5">{wig.lead_label}: {wig.lead_target}{wig.lead_type === 'hours' ? 'h' : ' tasks'}/week</span>
                </div>
              </div>
              <div className="flex items-center gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                <button onClick={() => handleToggleStatus(wig)} title="Mark achieved"
                  className="p-1.5 rounded-lg text-th-text5 hover:text-green-400 hover:bg-green-500/10 transition-colors">
                  <Trophy size={14} />
                </button>
                <button onClick={() => setEditing(wig)}
                  className="p-1.5 rounded-lg text-th-text5 hover:text-th-text2 hover:bg-th-raised transition-colors">
                  <Pencil size={14} />
                </button>
                <button onClick={() => handleDelete(wig.id)}
                  className="p-1.5 rounded-lg text-th-text5 hover:text-red-400 hover:bg-red-400/10 transition-colors">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {achieved.length > 0 && (
        <div className="pt-4 border-t border-th-border/40">
          <p className="text-xs font-semibold text-th-text5 uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <Trophy size={11} className="text-yellow-400" /> Achieved
          </p>
          <div className="space-y-2">
            {achieved.map(wig => (
              <div key={wig.id} className="flex items-center gap-3 px-4 py-3 rounded-xl bg-th-raised/30 border border-th-border/30 opacity-60">
                <Trophy size={13} className="text-yellow-400 shrink-0" />
                <p className="text-sm text-th-text3 line-through truncate flex-1">{wig.title}</p>
                <button onClick={() => handleToggleStatus(wig)}
                  className="text-xs text-th-text5 hover:text-th-text2 transition-colors shrink-0">Reopen</button>
                <button onClick={() => handleDelete(wig.id)}
                  className="p-1 text-th-text5 hover:text-red-400 transition-colors"><Trash2 size={13} /></button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
