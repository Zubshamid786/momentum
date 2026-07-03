import { useState, useEffect } from 'react'
import { Brain, Layers, FileText } from 'lucide-react'

const TYPES = [
  { key: 'deep',    label: 'Deep Work',    icon: Brain,   color: 'text-indigo-400', bar: 'bg-indigo-500',  desc: 'Focused, cognitively demanding work' },
  { key: 'shallow', label: 'Shallow Work', icon: Layers,  color: 'text-sky-400',    bar: 'bg-sky-500',     desc: 'Low-effort, logistical tasks' },
  { key: 'admin',   label: 'Admin',        icon: FileText, color: 'text-slate-400', bar: 'bg-slate-500',   desc: 'Email, meetings, busywork' },
]

function fmt(secs) {
  if (!secs) return '0m'
  const h = Math.floor(secs / 3600)
  const m = Math.floor((secs % 3600) / 60)
  if (h === 0) return `${m}m`
  return m > 0 ? `${h}h ${m}m` : `${h}h`
}

export default function WorkTypeWidget() {
  const [data, setData]     = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const tz = -new Date().getTimezoneOffset()
    window.api.getWorkTypeBreakdown(tz).then(d => {
      setData(d || [])
      setLoading(false)
    })
  }, [])

  const map = {}
  for (const r of data) map[r.work_type] = r.total
  const total = Object.values(map).reduce((s, v) => s + v, 0)
  const deepPct = total > 0 ? Math.round(((map.deep || 0) / total) * 100) : 0

  return (
    <div className="glass-card card-shadow rounded-2xl p-5">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-7 h-7 rounded-lg bg-indigo-500/20 flex items-center justify-center">
          <Brain size={14} className="text-indigo-400" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-white">Work Type — This Week</h3>
          <p className="text-xs text-slate-500">Deep vs Shallow vs Admin split</p>
        </div>
        {total > 0 && (
          <div className="ml-auto text-right">
            <span className={`text-lg font-bold ${deepPct >= 60 ? 'text-emerald-400' : deepPct >= 40 ? 'text-amber-400' : 'text-red-400'}`}>
              {deepPct}%
            </span>
            <p className="text-[10px] text-slate-500">deep</p>
          </div>
        )}
      </div>

      {loading ? (
        <div className="h-20 flex items-center justify-center text-slate-500 text-sm">Loading…</div>
      ) : total === 0 ? (
        <p className="text-slate-500 text-sm text-center py-4">No sessions this week. Use the work-type toggle on the timer.</p>
      ) : (
        <>
          {/* Stacked bar */}
          <div className="flex h-2 rounded-full overflow-hidden gap-px mb-5 bg-white/5">
            {TYPES.map(t => {
              const pct = total > 0 ? ((map[t.key] || 0) / total) * 100 : 0
              return pct > 0 ? (
                <div key={t.key} className={`${t.bar} transition-all`} style={{ width: `${pct}%` }} />
              ) : null
            })}
          </div>

          {/* Row breakdown */}
          <div className="space-y-3">
            {TYPES.map(t => {
              const secs = map[t.key] || 0
              const pct  = total > 0 ? Math.round((secs / total) * 100) : 0
              const Icon = t.icon
              return (
                <div key={t.key} className="flex items-center gap-3">
                  <Icon size={14} className={t.color} />
                  <span className="text-sm text-slate-300 w-28">{t.label}</span>
                  <div className="flex-1 h-1.5 rounded-full bg-white/5 overflow-hidden">
                    <div className={`h-full ${t.bar} rounded-full`} style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-xs text-slate-400 w-12 text-right">{fmt(secs)}</span>
                  <span className="text-xs text-slate-600 w-8 text-right">{pct}%</span>
                </div>
              )
            })}
          </div>

          {deepPct < 40 && total > 0 && (
            <div className="mt-4 px-3 py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20">
              <p className="text-xs text-amber-300">
                <span className="font-medium">Cal Newport says:</span> Aim for 60%+ deep work. You're at {deepPct}% — reduce meetings and shallow tasks.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  )
}
