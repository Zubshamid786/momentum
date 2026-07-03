import { useState, useEffect } from 'react'
import { Moon, CheckCircle2, AlertCircle, Lightbulb, X } from 'lucide-react'

const today = () => new Date().toISOString().split('T')[0]

function fmtSecs(s) {
  const h = Math.floor(s / 3600); const m = Math.floor((s % 3600) / 60)
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

export default function EndOfDayReviewModal({ open, onClose }) {
  const [stats, setStats]     = useState(null)
  const [mits, setMits]       = useState([])
  const [notes, setNotes]     = useState('')
  const [carriesOver, setCarriesOver] = useState('')
  const [saving, setSaving]   = useState(false)
  const [saved, setSaved]     = useState(false)
  const [existing, setExisting] = useState(null)

  useEffect(() => {
    if (!open) return
    setSaved(false)
    ;(async () => {
      const [summary, intentions, review] = await Promise.all([
        window.api.getDailySummary(),
        window.api.getDailyIntentions(today()),
        window.api.getDailyReview(today()),
      ])
      setStats(summary)
      setMits(intentions || [])
      if (review) {
        setNotes(review.notes || '')
        setCarriesOver(review.carries_over || '')
        setExisting(review)
      } else {
        setNotes('')
        setCarriesOver('')
        setExisting(null)
      }
    })()
  }, [open])

  async function save() {
    setSaving(true)
    await window.api.saveDailyReview(today(), { notes, carries_over: carriesOver })
    setSaving(false)
    setSaved(true)
    setTimeout(() => { onClose() }, 1000)
  }

  if (!open) return null

  const mitsDone  = mits.filter(m => m.is_done).length
  const mitsTotal = mits.length

  return (
    <div className="fixed inset-0 z-[9997] flex items-center justify-center" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="absolute inset-0 bg-slate-950/75 backdrop-blur-sm" />
      <div className="relative w-full max-w-lg mx-4 glass-card card-shadow rounded-2xl border border-white/10 overflow-hidden max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center gap-3 px-6 py-4 border-b border-white/5 flex-shrink-0">
          <div className="w-8 h-8 rounded-xl bg-violet-500/20 flex items-center justify-center">
            <Moon size={15} className="text-violet-400" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-white">End-of-Day Review</h2>
            <p className="text-xs text-slate-500">{new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
          </div>
          <button onClick={onClose} className="ml-auto p-1.5 rounded-lg hover:bg-white/5 text-slate-600 hover:text-slate-400 transition-colors">
            <X size={14} />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5">
          {/* Day stats */}
          {stats && (
            <div className="grid grid-cols-3 gap-3">
              <div className="glass-card rounded-xl p-3 text-center">
                <p className="text-lg font-bold text-indigo-400">{fmtSecs(stats.todayTime || 0)}</p>
                <p className="text-xs text-slate-500 mt-0.5">Time tracked</p>
              </div>
              <div className="glass-card rounded-xl p-3 text-center">
                <p className="text-lg font-bold text-emerald-400">{stats.completedToday || 0}</p>
                <p className="text-xs text-slate-500 mt-0.5">Tasks done</p>
              </div>
              <div className="glass-card rounded-xl p-3 text-center">
                <p className={`text-lg font-bold ${mitsTotal > 0 ? (mitsDone === mitsTotal ? 'text-amber-400' : 'text-orange-400') : 'text-slate-500'}`}>
                  {mitsTotal > 0 ? `${mitsDone}/${mitsTotal}` : '–'}
                </p>
                <p className="text-xs text-slate-500 mt-0.5">MITs done</p>
              </div>
            </div>
          )}

          {/* MITs status */}
          {mits.length > 0 && (
            <div>
              <p className="text-xs text-slate-500 font-medium uppercase tracking-wide mb-2">Today's Intentions</p>
              <div className="space-y-2">
                {mits.map((m, i) => (
                  <div key={m.id} className={`flex items-center gap-2.5 px-3 py-2 rounded-lg ${m.is_done ? 'bg-emerald-500/10 border border-emerald-500/20' : 'bg-white/3 border border-white/5'}`}>
                    {m.is_done
                      ? <CheckCircle2 size={14} className="text-emerald-400 flex-shrink-0" />
                      : <AlertCircle size={14} className="text-slate-600 flex-shrink-0" />}
                    <div className="flex-1 min-w-0">
                      <span className="text-sm text-slate-300 truncate block">{m.title}</span>
                      {m.subtask_id && m.task_title && (
                        <span className="text-xs text-slate-600 truncate block">in {m.task_title}</span>
                      )}
                    </div>
                    {!m.is_done && <span className="text-xs text-slate-600">not done</span>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* What carries over */}
          <div>
            <label className="flex items-center gap-2 text-xs text-slate-400 font-medium mb-2">
              <AlertCircle size={12} className="text-orange-400" />
              What carries over to tomorrow?
            </label>
            <textarea
              value={carriesOver}
              onChange={e => setCarriesOver(e.target.value)}
              placeholder="Tasks or thoughts that need attention tomorrow…"
              rows={3}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500/60 resize-none"
            />
          </div>

          {/* Reflection notes */}
          <div>
            <label className="flex items-center gap-2 text-xs text-slate-400 font-medium mb-2">
              <Lightbulb size={12} className="text-yellow-400" />
              Reflection — what went well? What to improve?
            </label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Wins, blockers, learnings from today…"
              rows={4}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500/60 resize-none"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-white/5 flex-shrink-0">
          <span className="text-xs text-slate-600">Saved daily · builds self-awareness</span>
          <div className="flex gap-2">
            <button onClick={onClose} className="px-4 py-2 text-sm rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 transition-colors">
              Skip
            </button>
            <button
              onClick={save}
              disabled={saving}
              className={`px-5 py-2 text-sm rounded-xl font-medium transition-all ${
                saved ? 'bg-emerald-500 text-white' : 'bg-violet-600 hover:bg-violet-500 text-white'
              }`}
            >
              {saved ? '✓ Saved!' : saving ? 'Saving…' : 'Save Review'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
